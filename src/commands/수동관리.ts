import { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction } from 'discord.js';
import { sessions, refreshAndRebalance } from '../lib/utils';
import { balanceTeams, laneBalance } from '../lib/balancing';
import { buildComboEmbed, buildJoinEmbed } from '../lib/embeds';
import prisma from '../lib/db';

export const addPlayerManualCommand = {
  data: new SlashCommandBuilder()
    .setName('수동추가')
    .setDescription('내전에 참가자를 수동으로 추가합니다 (관리자 전용)')
    .addStringOption(opt =>
      opt.setName('닉네임')
        .setDescription('추가할 선수의 닉네임 (입력 시 자동완성)')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction: AutocompleteInteraction) {
    const focusedValue = interaction.options.getFocused();
    const players = await prisma.player.findMany({
      where: { nickname: { contains: focusedValue } },
      take: 25,
    });
    await interaction.respond(
      players.map(p => ({ name: p.nickname, value: p.nickname }))
    );
  },

  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as any;
    if (!member?.permissions.has('Administrator')) {
      return interaction.reply({ content: '관리자만 사용할 수 있습니다.', ephemeral: true });
    }

    const guildId = interaction.guildId!;
    const session = sessions.get(guildId);

    if (!session || session.phase !== 'joining') {
      return interaction.reply({ content: '현재 참가 신청 단계가 아닙니다.', ephemeral: true });
    }

    const inputName = interaction.options.getString('닉네임', true);

    if (session.players.some((p: any) => p.nickname === inputName)) {
      return interaction.reply({ content: `❌ **${inputName}** 선수는 이미 참가 중입니다.`, ephemeral: true });
    }

    const player = await prisma.player.findUnique({ where: { nickname: inputName } });
    if (!player) {
      return interaction.reply({ content: `❌ **${inputName}** 선수가 DB에 없습니다.`, ephemeral: true });
    }

    session.players.push({ nickname: player.nickname, score: player.score });

    if (session.players.length === 10) {
      session.phase = 'selecting';
      const names = session.players.map((p: any) => p.nickname);
      const scores = session.players.map((p: any) => p.score);
      session.combos = session.mode === '라인고정' ? laneBalance(names, scores) : balanceTeams(names, scores);

      await interaction.reply({ content: `✅ **${inputName}** 선수를 추가하여 10명이 완료되었습니다.`, ephemeral: true });
      
      if (session.messageId && session.channelId) {
        const targetChannel = await interaction.client.channels.fetch(session.channelId).catch(() => null);
        if (targetChannel && targetChannel.isTextBased()) {
          const originalMessage = await targetChannel.messages.fetch(session.messageId).catch(() => null);
          if (originalMessage) {
            await originalMessage.edit(buildJoinEmbed(session));

            const comboMsg = await (targetChannel as any).send({ 
              content: '✅ 인원 모집이 완료되어 팀 조합 단계로 넘어갑니다.', 
              ...buildComboEmbed(session.combos) 
            });
            session.messageId = comboMsg.id;
          }
        }
      }
    } else {
      await interaction.reply({ content: `✅ **${inputName}** 선수를 추가했습니다.`, ephemeral: true });
      if (session.messageId && session.channelId) {
        const targetChannel = await interaction.client.channels.fetch(session.channelId).catch(() => null);
        if (targetChannel && targetChannel.isTextBased()) {
          const originalMessage = await targetChannel.messages.fetch(session.messageId).catch(() => null);
          if (originalMessage) await originalMessage.edit(buildJoinEmbed(session));
        }
      }
    }
  }
};

export const removePlayerManualCommand = {
  data: new SlashCommandBuilder()
    .setName('수동제외')
    .setDescription('내전에서 참가자를 수동으로 제외합니다 (관리자 전용)')
    .addStringOption(opt =>
      opt.setName('닉네임')
        .setDescription('제외할 선수의 닉네임 (입력 시 참가자 중 자동완성)')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction: AutocompleteInteraction) {
    const guildId = interaction.guildId!;
    const session = sessions.get(guildId);
    const focusedValue = interaction.options.getFocused();

    if (!session || session.phase !== 'joining') {
      return interaction.respond([]);
    }

    const filtered = session.players
      .filter((p: any) => p.nickname.includes(focusedValue))
      .slice(0, 25);

    await interaction.respond(
      filtered.map((p: any) => ({ name: p.nickname, value: p.nickname }))
    );
  },

  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as any;
    if (!member?.permissions.has('Administrator')) {
      return interaction.reply({ content: '관리자만 사용할 수 있습니다.', ephemeral: true });
    }

    const guildId = interaction.guildId!;
    const session = sessions.get(guildId);

    if (!session || session.phase !== 'joining') {
      return interaction.reply({ content: '현재 참가 신청 단계가 아닙니다.', ephemeral: true });
    }

    const removeName = interaction.options.getString('닉네임', true);
    const idx = session.players.findIndex((p: any) => p.nickname === removeName);

    if (idx === -1) {
      return interaction.reply({ content: `❌ 현재 참가 목록에 **${removeName}** 선수가 없습니다.`, ephemeral: true });
    }

    session.players.splice(idx, 1);
    await interaction.reply({ content: `✅ **${removeName}** 선수를 제외했습니다.`, ephemeral: true });

    if (session.messageId && session.channelId) {
      const targetChannel = await interaction.client.channels.fetch(session.channelId).catch(() => null);
      if (targetChannel && targetChannel.isTextBased()) {
        const originalMessage = await targetChannel.messages.fetch(session.messageId).catch(() => null);
        if (originalMessage) await originalMessage.edit(buildJoinEmbed(session));
      }
    }
  }
};

export const changePlayerCommand = {
  data: new SlashCommandBuilder()
    .setName('선수변경')
    .setDescription('내전 참가 선수를 교체합니다 (관리자 전용)')
    .addStringOption(opt =>
      opt.setName('빠지는닉네임')
        .setDescription('교체되어 나갈 선수의 닉네임')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption(opt =>
      opt.setName('들어오는닉네임')
        .setDescription('새로 참가할 선수의 닉네임')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction: AutocompleteInteraction) {
    const focusedOption = interaction.options.getFocused(true);
    const guildId = interaction.guildId!;
    const session = sessions.get(guildId);

    const isAramResult = session?.mode === '칼바람' && session?.phase === 'result';
    if (!session || (session.phase !== 'post_match' && !isAramResult)) {
      return interaction.respond([]);
    }

    if (focusedOption.name === '빠지는닉네임') {
      const filtered = session.players
        .filter((p: any) => p.nickname.includes(focusedOption.value))
        .slice(0, 25);
      await interaction.respond(filtered.map((p: any) => ({ name: p.nickname, value: p.nickname })));
    } 
    else if (focusedOption.name === '들어오는닉네임') {
      const players = await prisma.player.findMany({
        where: { nickname: { contains: focusedOption.value } },
        take: 25,
      });
      await interaction.respond(players.map((p: any) => ({ name: p.nickname, value: p.nickname })));
    }
  },

  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as any;
    if (!member?.permissions.has('Administrator')) {
      return interaction.reply({ content: '관리자만 사용할 수 있습니다.', ephemeral: true });
    }

    const guildId = interaction.guildId!;
    const session = sessions.get(guildId);

    if (!session) {
      return interaction.reply({ content: '진행 중인 내전 세션이 없습니다.', ephemeral: true });
    }

    const isAramResult = session.mode === '칼바람' && session.phase === 'result';
    if (session.phase !== 'post_match' && !isAramResult) {
      return interaction.reply({ 
        content: '❌ 선수 변경은 경기가 끝난 후(결과 화면)에만 사용할 수 있습니다.', 
        ephemeral: true 
      });
    }

    const outName = interaction.options.getString('빠지는닉네임', true);
    const inName = interaction.options.getString('들어오는닉네임', true);

    const outIdx = session.players.findIndex((p: any) => p.nickname === outName);
    if (outIdx === -1) {
      return interaction.reply({ content: `❌ 현재 참가 목록에 **${outName}** 선수가 없습니다.`, ephemeral: true });
    }

    const newPlayer = await prisma.player.findUnique({ where: { nickname: inName } });
    if (!newPlayer) {
      return interaction.reply({ content: `❌ **${inName}** 선수가 DB에 등록되어 있지 않습니다.`, ephemeral: true });
    }

    if (session.players.some((p: any) => p.nickname === inName)) {
      return interaction.reply({ content: `❌ **${inName}** 선수는 이미 참가 중입니다.`, ephemeral: true });
    }

    session.players[outIdx] = { nickname: newPlayer.nickname, score: newPlayer.score };
    session.phase = 'selecting';
    await refreshAndRebalance(session);

    await interaction.reply({ content: `✅ **${outName}** ➔ **${inName}** 선수 교체 완료!`, ephemeral: true });

    if (session.messageId && session.channelId) {
      const targetChannel = await interaction.client.channels.fetch(session.channelId).catch(() => null);
      if (targetChannel && targetChannel.isTextBased()) {
        const originalMessage = await targetChannel.messages.fetch(session.messageId).catch(() => null);
        if (originalMessage) {
          // 🚨 기존 결과창에서 버튼 제거하여 박제
          await originalMessage.edit({ components: [] });

          // 🚨 새로운 메시지로 팀 조합 창 전송
          const comboMsg = await (targetChannel as any).send({
            content: `✅ **${outName}** ➔ **${inName}** 교체 완료! 팀 조합을 다시 선택해 주세요.`,
            ...buildComboEmbed(session.combos)
          });
          session.messageId = comboMsg.id;
        }
      }
    }
  }
};