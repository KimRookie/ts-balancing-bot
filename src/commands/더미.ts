import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { sessions, SessionPlayer } from '../lib/utils';
import { buildJoinEmbed } from '../lib/embeds';
import { POSITIONS } from '../lib/balancing';
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

    if (!session) return interaction.reply({ content: '진행 중인 내전이 없습니다. `/내전시작`을 먼저 해주세요.', ephemeral: true });
    if (session.phase !== 'joining') return interaction.reply({ content: '이미 팀 선택이 완료된 세션입니다.', ephemeral: true });

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
          // 🚨 discordId 찌꺼기 완벽 제거
          create: { nickname: d.nickname, score: d.score, wins: 0, losses: 0 },
        });
      }
    } catch (err) {
      console.error('더미 봇 DB 등록 중 에러:', err);
    }

    const dbDummies = await prisma.player.findMany({
      where: { nickname: { in: dummyData.map(d => d.nickname) } }
    });

    const spaceLeft = 10 - session.players.length;
    if (spaceLeft <= 0) return interaction.editReply({ content: '이미 10명의 유저가 있습니다.' });

    let addedCount = 0;
    
    for (const p of dbDummies) {
      if (addedCount >= spaceLeft || addedCount >= 9) break;

      const dummyPlayer: SessionPlayer = { nickname: p.nickname, score: p.score };

      if (session.mode === '라인고정') {
        const emptyLane = POSITIONS.find(pos => {
          const count = session.players.filter((x: SessionPlayer) => x.lane === pos).length;
          return count < 2;
        });
        
        if (emptyLane) {
          dummyPlayer.lane = emptyLane;
        } else {
          continue;
        }
      }

      session.players.push(dummyPlayer);
      addedCount++;
    }

    if (session.messageId && session.channelId) {
      const targetChannel = await interaction.client.channels.fetch(session.channelId).catch(() => null);
      if (targetChannel && targetChannel.isTextBased()) {
        const originalMessage = await targetChannel.messages.fetch(session.messageId).catch(() => null);
        // @ts-ignore
        if (originalMessage) await originalMessage.edit({ embeds: [buildJoinEmbed(session)] });
      }
    }

    await interaction.editReply({
      content: `✅ 더미 봇 ${addedCount}명이 추가되었습니다. (현재 인원: ${session.players.length}명)`,
    });
  },
};