import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { sessions } from '../lib/utils';
import { buildJoinEmbed } from '../lib/embeds';
import { POSITIONS } from '../lib/balancing'; // 🚨 라인 정보를 가져오기 위해 추가
import prisma from '../lib/db';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('더미추가')
    .setDescription('테스트용 더미 봇 9명을 DB에 등록하고 참가시킵니다 (개발자 전용)'),

  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as any;
    if (!member?.permissions.has('Administrator')) {
      return interaction.reply({ content: '관리자만 사용할 수 있습니다.', ephemeral: true });
    }

    const guildId = interaction.guildId!;
    const session = sessions.get(guildId);

    if (!session) {
      return interaction.reply({ content: '진행 중인 내전이 없습니다. `/내전시작`을 먼저 해주세요.', ephemeral: true });
    }

    if (session.phase !== 'joining') {
      return interaction.reply({ content: '이미 팀 선택이 완료된 세션입니다.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const dummyData = [
      { nickname: '봇아이언', score: 0 },
      { nickname: '봇브론즈', score: 400 },
      { nickname: '봇실버', score: 1000 },
      { nickname: '봇골드', score: 1400 },
      { nickname: '봇플레', score: 1800 },
      { nickname: '봇에메1', score: 2000 },
      { nickname: '봇에메2', score: 2200 },
      { nickname: '봇다이아', score: 2500 },
      { nickname: '봇마스터', score: 2920 },
    ];

    try {
      for (const d of dummyData) {
        await prisma.player.upsert({
          where: { nickname: d.nickname },
          update: {}, 
          create: { discordId: "bot_" + d.nickname, nickname: d.nickname, score: d.score, wins: 0, losses: 0 },
        });
      }
    } catch (err) {
      console.error('더미 봇 DB 등록 중 에러:', err);
    }

    const dbDummies = await prisma.player.findMany({
      where: { nickname: { in: dummyData.map(d => d.nickname) } }
    });

    const spaceLeft = 10 - session.players.length; // 9가 아닌 10에서 빼도록 수정
    if (spaceLeft <= 0) {
      return interaction.editReply({ content: '이미 10명의 유저가 있습니다.' });
    }

    // 🚨 더미 데이터 생성 시 라인고정 모드라면 빈 라인을 찾아 할당
    let addedCount = 0;
    
    for (const p of dbDummies) {
      if (addedCount >= spaceLeft || addedCount >= 9) break; // 최대 9명 또는 남은 자리만큼만

      const dummyPlayer: any = { discordId: p.discordId, nickname: p.nickname, score: p.score };

      if (session.mode === '라인고정') {
        // 현재 각 라인별로 몇 명 있는지 계산해서 빈 자리(2명 미만)를 찾음
        const emptyLane = POSITIONS.find(pos => {
          const count = session.players.filter((x: any) => x.lane === pos).length;
          return count < 2;
        });
        
        if (emptyLane) {
          dummyPlayer.lane = emptyLane;
        } else {
          continue; // 모든 라인이 꽉 찼다면 더미 추가 중단
        }
      }

      session.players.push(dummyPlayer);
      addedCount++;
    }

    if (session.messageId && session.channelId) {
      const targetChannel = await interaction.client.channels.fetch(session.channelId).catch(() => null);
      if (targetChannel && targetChannel.isTextBased()) {
        const originalMessage = await targetChannel.messages.fetch(session.messageId).catch(() => null);
        if (originalMessage) {
          await originalMessage.edit(buildJoinEmbed(session));
        }
      }
    }

    // 10명이 꽉 찼다면 UI에 10명이 되었다고 업데이트만 해두고, 실제 밸런싱 시작은 누군가 버튼을 누를 때까지 기다리거나 여기서 강제 트리거하지 않도록 두는 것이 안전합니다 (버튼 핸들러와의 충돌 방지)

    await interaction.editReply({
      content: `✅ 더미 봇 ${addedCount}명이 추가되었습니다. (현재 인원: ${session.players.length}명)`,
    });
  },
};