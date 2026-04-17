import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import prisma from '../lib/db';
import { tierToScore, scoreToTierAndLP } from '../lib/tierScore';

export const cancelCommand = {
  data: new SlashCommandBuilder()
    .setName('내전취소')
    .setDescription('진행 중인 내전을 취소합니다 (관리자 전용)'),

  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as any;
    if (!member?.permissions.has('Administrator')) {
      return interaction.reply({ content: '관리자만 사용할 수 있는 기능입니다.', ephemeral: true });
    }

    const { sessions } = await import('../lib/utils');
    const guildId = interaction.guildId!;

    if (!sessions.has(guildId)) {
      return interaction.reply({ content: '진행 중인 내전이 없습니다.', ephemeral: true });
    }
    const session = sessions.get(guildId);
    if (session?.timeoutId) clearTimeout(session.timeoutId);
    sessions.delete(guildId);
    await interaction.reply('🛑 내전이 취소되었습니다.');
  },
};

export const rankingCommand = {
  data: new SlashCommandBuilder()
    .setName('랭킹')
    .setDescription('내전 랭킹 TOP 10을 보여줍니다'),

  async execute(interaction: ChatInputCommandInteraction) {
    const { buildRankingEmbed } = await import('../lib/embeds');
    const players = await prisma.player.findMany({
      orderBy: { score: 'desc' },
      take: 10,
    });
    await interaction.reply({ embeds: [buildRankingEmbed(players)] });
  },
};

export const statsCommand = {
  data: new SlashCommandBuilder()
    .setName('전적')
    .setDescription('선수 전적을 조회합니다 (닉네임 생략 시 본인 전적 조회)')
    .addStringOption(opt => opt.setName('닉네임').setDescription('조회할 닉네임').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const { EmbedBuilder } = await import('discord.js');
    const inputNickname = interaction.options.getString('닉네임');
    
    const player = inputNickname 
      ? await prisma.player.findUnique({ where: { nickname: inputNickname } })
      : await prisma.player.findUnique({ where: { discordId: interaction.user.id } });

    if (!player) return interaction.reply({ content: '등록된 선수가 아닙니다.', ephemeral: true });

    const total = player.wins + player.losses;
    const winRate = total > 0 ? Math.round((player.wins / total) * 100) : 0;

    const embed = new EmbedBuilder()
      .setTitle(`📊 ${player.nickname} 전적`)
      .setColor(0x5865F2)
      .addFields(
        { name: '티어', value: `${scoreToTierAndLP(player.score)}`, inline: true },
        { name: '전적', value: `${player.wins}승 ${player.losses}패`, inline: true },
        { name: '승률', value: `${winRate}%`, inline: true },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export const registerCommand = {
  data: new SlashCommandBuilder()
    .setName('선수등록')
    .setDescription('본인의 디스코드 계정과 롤 닉네임을 연동하여 등록합니다.')
    .addStringOption(opt => opt.setName('닉네임').setDescription('인게임 소환사명').setRequired(true))
    .addStringOption(opt => opt.setName('티어').setDescription('현재 티어 (예: 실2, 골1, 다4)').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    const nickname = interaction.options.getString('닉네임', true);
    const tier = interaction.options.getString('티어', true);
    const score = tierToScore(tier);
    const discordId = interaction.user.id;

    if (score === null) return interaction.reply({ content: `⚠️ 티어를 인식하지 못했습니다.`, ephemeral: true });

    try {
      const created = await prisma.player.create({
        data: { discordId, nickname, score, wins: 0, losses: 0 },
      });
      await interaction.reply(`✅ **${nickname}** 선수가 계정과 연동되어 등록되었습니다!\n초기 티어: **${scoreToTierAndLP(created.score)}**`);
    } catch (err: any) {
      if (err.code === 'P2002') {
        await interaction.reply({ content: `이미 등록된 닉네임이거나, 회원님의 디스코드 계정으로 이미 등록된 선수가 있습니다.`, ephemeral: true });
      } else {
        await interaction.reply({ content: '등록 중 오류가 발생했습니다.', ephemeral: true });
      }
    }
  },
};

export const updateCommand = {
  data: new SlashCommandBuilder()
    .setName('선수수정')
    .setDescription('본인의 등록 정보를 수정합니다 (관리자는 모두 수정 가능)')
    .addStringOption(opt => opt.setName('대상').setDescription('수정할 닉네임').setRequired(true))
    .addStringOption(opt => opt.setName('새닉네임').setDescription('변경할 닉네임').setRequired(false))
    .addStringOption(opt => opt.setName('새티어').setDescription('변경할 티어').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const targetNickname = interaction.options.getString('대상', true);
    const newNickname = interaction.options.getString('새닉네임');
    const newTier = interaction.options.getString('새티어');

    if (!newNickname && !newTier) {
      return interaction.reply({ content: '변경할 닉네임이나 티어 중 하나는 반드시 입력해 주세요.', ephemeral: true });
    }

    const player = await prisma.player.findUnique({ where: { nickname: targetNickname } });
    if (!player) return interaction.reply({ content: `선수를 찾을 수 없습니다.`, ephemeral: true });

    const member = interaction.member as any;
    const isAdmin = member?.permissions.has('Administrator');
    const isOwner = player.discordId === interaction.user.id;

    if (!isOwner && !isAdmin) {
      return interaction.reply({ content: '❌ 본인의 정보만 수정할 수 있습니다.', ephemeral: true });
    }

    const updateData: any = {};
    if (newNickname) updateData.nickname = newNickname;
    if (newTier) {
      const score = tierToScore(newTier);
      if (score !== null) updateData.score = score;
    }

    try {
      const updated = await prisma.player.update({ where: { nickname: targetNickname }, data: updateData });
      await interaction.reply(`✅ 수정 완료!\n➔ 닉네임: **${updated.nickname}** | 티어: **${scoreToTierAndLP(updated.score)}**`);
    } catch (err: any) {
      if (err.code === 'P2002') {
        await interaction.reply({ content: `변경하려는 닉네임이 이미 다른 사람에게 사용 중입니다.`, ephemeral: true });
      } else {
        console.error(err);
        await interaction.reply({ content: '수정 중 오류가 발생했습니다.', ephemeral: true });
      }
    }
  },
};