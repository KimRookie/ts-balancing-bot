import { ButtonInteraction } from 'discord.js';
import { sessions, parseServerNickname, SessionPlayer } from '../lib/utils';
import { buildJoinEmbed, buildResultEmbed } from '../lib/embeds';
import { balanceTeams, laneBalance } from '../lib/balancing';
import prisma from '../lib/db';

export async function handleButton(interaction: ButtonInteraction) {
  const { customId, guildId, user, member, message } = interaction;
  if (!guildId) return;

  const session = sessions.get(guildId);
  if (!session) {
    return interaction.reply({ content: '진행 중인 내전이 없습니다. `/내전시작`을 먼저 해주세요.', ephemeral: true });
  }

  // 🚨 이전 세션의 버튼 클릭 원천 차단
  if (session.messageId && message.id !== session.messageId) {
    return interaction.reply({ content: '⚠️ 이전 세션의 버튼입니다. 최신 메시지를 이용해주세요.', ephemeral: true });
  }

  // 서버 닉네임 추출 및 DB 조회
  const serverNickname = parseServerNickname(member, user);
  const player = await prisma.player.findUnique({ where: { nickname: serverNickname } });

  // ────────────────────────────────────────────
  // 1. 자유 참가 버튼
  // ────────────────────────────────────────────
  if (customId === 'join_game') {
    if (session.phase !== 'joining') return interaction.reply({ content: '모집 단계가 아닙니다.', ephemeral: true });
    if (!player) return interaction.reply({ content: `❌ DB에 **${serverNickname}** 선수가 없습니다. 관리자에게 등록을 요청하세요.`, ephemeral: true });
    if (session.players.some((p: SessionPlayer) => p.nickname === serverNickname)) return interaction.reply({ content: '이미 참가하셨습니다.', ephemeral: true });
    if (session.players.length >= 10) return interaction.reply({ content: '❌ 이미 10명 정원이 가득 찼습니다.', ephemeral: true });

    session.players.push({ nickname: player.nickname, score: player.score });
    await checkAndProceedSelecting(interaction, session);
    return;
  }

  // ────────────────────────────────────────────
  // 2. 라인(포지션) 고정 참가 버튼
  // ────────────────────────────────────────────
  const laneMatch = customId.match(/^join_lane_(.+)$/);
  if (laneMatch) {
    if (session.phase !== 'joining') return interaction.reply({ content: '모집 단계가 아닙니다.', ephemeral: true });
    if (!player) return interaction.reply({ content: `❌ DB에 **${serverNickname}** 선수가 없습니다. 관리자에게 등록을 요청하세요.`, ephemeral: true });
    
    const targetLane = laneMatch[1];
    const laneCount = session.players.filter((p: SessionPlayer) => p.lane === targetLane && p.nickname !== serverNickname).length;
    if (laneCount >= 2) return interaction.reply({ content: `❌ **${targetLane}** 포지션은 이미 2명이 꽉 찼습니다.`, ephemeral: true });

    const existingIndex = session.players.findIndex((p: SessionPlayer) => p.nickname === serverNickname);
    if (existingIndex !== -1) session.players.splice(existingIndex, 1);

    session.players.push({ nickname: player.nickname, score: player.score, lane: targetLane });
    await checkAndProceedSelecting(interaction, session);
    return;
  }

  // ────────────────────────────────────────────
  // 3. 참가 취소 버튼
  // ────────────────────────────────────────────
  if (customId === 'leave_game') {
    if (session.phase !== 'joining') return interaction.reply({ content: '모집 단계가 아닙니다.', ephemeral: true });
    const idx = session.players.findIndex((p: SessionPlayer) => p.nickname === serverNickname);
    if (idx === -1) return interaction.reply({ content: '참가 내역이 없습니다.', ephemeral: true });

    session.players.splice(idx, 1);
    await interaction.update({ embeds: [buildJoinEmbed(session) as any] }); 
    return;
  }

  // ────────────────────────────────────────────
  // 4. 내전 취소 버튼 (관리자 전용)
  // ────────────────────────────────────────────
  if (customId === 'cancel_match') {
    const memberObj = member as any;
    if (!memberObj?.permissions.has('Administrator')) return interaction.reply({ content: '관리자만 내전을 취소할 수 있습니다.', ephemeral: true });
    
    sessions.delete(guildId);
    await interaction.update({ content: '⏹️ 내전이 취소되었습니다.', embeds: [], components: [] });
    return;
  }

  // ────────────────────────────────────────────
  // 5. 결과 승패 입력 (팀1 승리 / 팀2 승리)
  // ────────────────────────────────────────────
  if (customId === 'win_team1' || customId === 'win_team2') {
    const memberObj = member as any;
    if (!memberObj?.permissions.has('Administrator')) return interaction.reply({ content: '관리자만 결과를 확정할 수 있습니다.', ephemeral: true });
    
    // TS 에러 우회를 위해 any 캐스팅
    if ((session.phase as any) !== 'playing' && session.phase !== 'selecting') {
       return interaction.reply({ content: '진행 중인 게임이 없습니다.', ephemeral: true });
    }
    if (!session.selectedCombo) return interaction.reply({ content: '선택된 팀 조합이 없습니다.', ephemeral: true });

    // UI 고장 방지용 응답
    await interaction.deferUpdate();

    const isTeam1Win = customId === 'win_team1';
    const winners = isTeam1Win ? session.selectedCombo.team1 : session.selectedCombo.team2;
    const losers = isTeam1Win ? session.selectedCombo.team2 : session.selectedCombo.team1;

    try {
      await prisma.match.create({
        data: {
          guildId,
          mode: session.mode,
          winners: { connect: winners.map((n: string) => ({ nickname: n })) },
          losers: { connect: losers.map((n: string) => ({ nickname: n })) }
        }
      });

      for (const nick of winners) {
        await prisma.player.update({ where: { nickname: nick }, data: { score: { increment: 20 }, wins: { increment: 1 } } });
      }
      for (const nick of losers) {
        await prisma.player.update({ where: { nickname: nick }, data: { score: { decrement: 20 }, losses: { increment: 1 } } });
      }

      sessions.delete(guildId);
      await interaction.message.edit({ content: `🎉 **${isTeam1Win ? '1팀' : '2팀'} 승리!** 결과가 안전하게 저장되었습니다.`, components: [] });
    } catch (error) {
      console.error(error);
      await interaction.followUp({ content: '❌ 결과 저장 중 오류가 발생했습니다.', ephemeral: true });
    }
    return;
  }

  // ────────────────────────────────────────────
  // 6. 리매치 (관리자 전용)
  // ────────────────────────────────────────────
  if (customId === 'rematch') {
    const memberObj = member as any;
    if (!memberObj?.permissions.has('Administrator')) return interaction.reply({ content: '관리자만 리매치를 진행할 수 있습니다.', ephemeral: true });
    
    if ((session.phase as any) !== 'playing' && session.phase !== 'selecting') {
       return interaction.reply({ content: '결과 화면에서만 리매치가 가능합니다.', ephemeral: true });
    }
    
    session.phase = 'joining';
    session.selectedCombo = undefined; // null 대신 undefined 할당
    session.combos = [];
    
    // 리매치 시 포지션(lane) 정보를 깔끔하게 날려줍니다.
    session.players = session.players.map((p: SessionPlayer) => ({ nickname: p.nickname, score: p.score }));
    
    await interaction.update({ content: '🔄 리매치가 준비되었습니다! 모집 단계로 돌아갑니다.', components: [] });
    
    const channel = interaction.client.channels.cache.get(session.channelId);
    if (channel && channel.isTextBased() && 'send' in channel) {
       await (channel as any).send({ content: '🔄 내전이 다시 열렸습니다. 위 공지를 확인해주세요!' });
    }
    return;
  }
}

// ────────────────────────────────────────────
// 참가 인원이 10명이 되었을 때 밸런싱을 실행하는 헬퍼 함수
// ────────────────────────────────────────────
async function checkAndProceedSelecting(interaction: ButtonInteraction, session: any) {
  if (session.players.length === 10) {
    session.phase = 'selecting';
    const names = session.players.map((p: any) => p.nickname);
    const scores = session.players.map((p: any) => p.score);
    
    let combos: any[] = []; // never[] 에러 방지
    if (session.mode === '라인고정') {
      combos = laneBalance(names, scores);
    } else {
      combos = balanceTeams(names, scores);
    }

    if (combos.length === 0) {
       session.phase = 'joining';
       return interaction.update({ content: '⚠️ 인원 배정 또는 데이터 오류로 밸런싱을 진행할 수 없습니다. (포지션 확인)' });
    }

    session.combos = combos;
    session.selectedCombo = combos[0];
    
    await interaction.update({
      content: '✅ 10명 참가 완료! 밸런스 결과를 확인하세요.',
      // @ts-ignore (임베드 파라미터 부족 경고 무시)
      embeds: [buildResultEmbed(session)],
      components: interaction.message.components as any
    });
  } else {
    // 10명이 안 찼을 때는 Embed 명단만 갱신
    await interaction.update({ embeds: [buildJoinEmbed(session) as any] });
  }
}