import { ButtonInteraction } from 'discord.js';
import { sessions, resetSessionTimer, refreshAndRebalance } from '../lib/utils';
import { balanceTeams, laneBalance, SCORE_PER_WIN, SCORE_PER_LOSS, POSITIONS } from '../lib/balancing';
import { buildJoinEmbed, buildComboEmbed, buildMatchEmbed, buildResultEmbed } from '../lib/embeds';
import prisma from '../lib/db';

export async function handleButton(interaction: ButtonInteraction) {
  const { customId, guildId, user } = interaction;
  if (!guildId) return;

  const session = sessions.get(guildId);
  if (!session) return interaction.reply({ content: '진행 중인 내전이 없습니다.', ephemeral: true });

  resetSessionTimer(guildId);

  if (session.isProcessing) {
    return interaction.reply({ content: '⏳ 서버에서 처리 중입니다. 잠시만 기다려주세요.', ephemeral: true });
  }

  const player = await prisma.player.findUnique({ where: { discordId: user.id } });

  if (customId === 'join_game') {
    if (session.phase !== 'joining') return interaction.reply({ content: '모집 단계가 아닙니다.', ephemeral: true });
    if (!player) return interaction.reply({ content: `❌ DB에 등록되어 있지 않습니다. \`/선수등록\`을 먼저 해주세요.`, ephemeral: true });
    if (session.players.some((p: any) => p.discordId === user.id)) return interaction.reply({ content: '이미 참가하셨습니다.', ephemeral: true });

    session.players.push({ discordId: player.discordId, nickname: player.nickname, score: player.score });
    await checkAndProceedSelecting(interaction, session);
    return;
  }

  const laneMatch = customId.match(/^join_lane_(.+)$/);
  if (laneMatch) {
    if (session.phase !== 'joining') return interaction.reply({ content: '모집 단계가 아닙니다.', ephemeral: true });
    if (!player) return interaction.reply({ content: `❌ DB에 등록되어 있지 않습니다. \`/선수등록\`을 먼저 해주세요.`, ephemeral: true });
    
    const targetLane = laneMatch[1];
    
    const existingIndex = session.players.findIndex((p: any) => p.discordId === user.id);
    if (existingIndex !== -1) {
      session.players.splice(existingIndex, 1);
    }

    session.players.push({ discordId: player.discordId, nickname: player.nickname, score: player.score, lane: targetLane });
    await checkAndProceedSelecting(interaction, session);
    return;
  }

  if (customId === 'leave_game') {
    if (session.phase !== 'joining') return interaction.reply({ content: '모집 단계가 아닙니다.', ephemeral: true });
    
    const idx = session.players.findIndex((p: any) => p.discordId === user.id);
    if (idx === -1) return interaction.reply({ content: '참가 내역이 없습니다.', ephemeral: true });

    session.players.splice(idx, 1);
    await interaction.update(buildJoinEmbed(session));
    return;
  }

  if (customId.startsWith('select_combo_')) {
    if (session.phase !== 'selecting') return interaction.reply({ content: '팀 조합 선택 단계가 아닙니다.', ephemeral: true });
    const idx = parseInt(customId.replace('select_combo_', ''), 10);
    session.selectedCombo = session.combos[idx];
    if (!session.selectedCombo) return interaction.reply({ content: '잘못된 조합 번호입니다.', ephemeral: true });
    
    session.phase = 'result';
    await interaction.update({ components: [] });
    const matchMsg = await interaction.followUp({ content: `✅ 조합 ${idx + 1} 확정!`, ...buildMatchEmbed(session.selectedCombo, idx, session.mode), fetchReply: true });
    session.messageId = (matchMsg as any).id;
    return;
  }

  if (customId === 'dice_combo') {
    if (session.phase !== 'selecting') return interaction.reply({ content: '팀 조합 선택 단계가 아닙니다.', ephemeral: true });
    const maxRange = Math.min(session.combos.length, 5);
    const idx = Math.floor(Math.random() * maxRange);
    session.selectedCombo = session.combos[idx];
    session.phase = 'result';
    await interaction.update({ components: [] });
    const diceMsg = await interaction.followUp({ content: `🎲 주사위 결과: **조합 ${idx + 1}**`, ...buildMatchEmbed(session.selectedCombo, idx, session.mode), fetchReply: true });
    session.messageId = (diceMsg as any).id;
    return;
  }

  if (customId === 'win_team1' || customId === 'win_team2') {
    if (session.phase !== 'result' || !session.selectedCombo) {
      return interaction.reply({ content: '진행 중인 경기가 없거나 이미 처리되었습니다.', ephemeral: true });
    }

    try {
      session.isProcessing = true;
      await interaction.update({ components: [] });

      session.phase = 'post_match';
      const winnerTeam = customId === 'win_team1' ? 1 : 2;
      const combo = session.selectedCombo;
      const winners = winnerTeam === 1 ? combo.team1 : combo.team2;
      const losers  = winnerTeam === 1 ? combo.team2 : combo.team1;

      await prisma.$transaction(async (tx) => {
        const validWinners = await tx.player.findMany({ where: { nickname: { in: winners } } });
        const validLosers  = await tx.player.findMany({ where: { nickname: { in: losers } } });
        const validWinnerNames = validWinners.map(p => p.nickname);
        const validLoserNames  = validLosers.map(p => p.nickname);

        for (const nickname of validWinnerNames) {
          await tx.player.update({
            where: { nickname },
            data: { score: { increment: SCORE_PER_WIN }, wins: { increment: 1 } },
          });
        }
        for (const nickname of validLoserNames) {
          const player = validLosers.find(p => p.nickname === nickname);
          if (player) {
            await tx.player.update({
              where: { nickname },
              data: { score: { set: Math.max(0, player.score - SCORE_PER_LOSS) }, losses: { increment: 1 } },
            });
          }
        }
        await tx.match.create({
          data: {
            guildId, mode: session.mode,
            winnerPlayers: { connect: validWinnerNames.map(n => ({ nickname: n })) },
            loserPlayers:  { connect: validLoserNames.map(n => ({ nickname: n })) },
          },
        });
      });

      const updatedWinners = await prisma.player.findMany({ where: { nickname: { in: winners } } });
      const updatedLosers  = await prisma.player.findMany({ where: { nickname: { in: losers } } });

      const resultMsg = await interaction.followUp({ content: '🎉 경기가 종료되었습니다!', ...buildResultEmbed(updatedWinners, updatedLosers), fetchReply: true });
      session.messageId = (resultMsg as any).id;
    } finally {
      session.isProcessing = false;
    }
    return;
  }

  if (customId === 'end_session') {
    await interaction.update({ components: [] });
    if (session.timeoutId) clearTimeout(session.timeoutId);
    sessions.delete(guildId);
    await interaction.followUp('🛑 내전이 완전히 종료되었습니다. 수고하셨습니다!');
    return;
  }

  if (customId === 'rematch') {
    if (session.phase !== 'post_match') return;
    await interaction.update({ components: [] });
    session.phase = 'result'; 
    const comboIdx = session.combos.indexOf(session.selectedCombo!);
    const rematchMsg = await interaction.followUp({ content: '🔄 **재경기가 시작되었습니다!** 기존 조합으로 진행합니다.', ...buildMatchEmbed(session.selectedCombo!, comboIdx !== -1 ? comboIdx : 0, session.mode), fetchReply: true });
    session.messageId = (rematchMsg as any).id;
    return;
  }

  if (customId === 'rebalance') {
    const canRebalance = session.phase === 'post_match' || (session.mode === '칼바람' && session.phase === 'result');
    if (!canRebalance) {
      return interaction.reply({ content: '현재 단계에서는 재조합을 할 수 없습니다.', ephemeral: true });
    }
    await interaction.update({ components: [] });
    session.phase = 'selecting';
    await refreshAndRebalance(session);
    const rebalanceMsg = await interaction.followUp({ content: '⚖️ **최신 점수를 반영하여 팀을 다시 섞었습니다!**', ...buildComboEmbed(session.combos), fetchReply: true });
    session.messageId = (rebalanceMsg as any).id;
    return;
  }

  if (customId === 'change_player_guide') {
    return interaction.reply({ 
      content: '💡 선수를 교체하려면 채팅창에 **/선수변경** 명령어를 입력해 주세요!', 
      ephemeral: true 
    });
  }
}

async function checkAndProceedSelecting(interaction: ButtonInteraction, session: any) {
  if (session.players.length === 10) {
    session.phase = 'selecting';
    
    if (session.mode === '라인고정') {
      const orderedNames: string[] = [];
      const orderedScores: number[] = [];
      POSITIONS.forEach(pos => {
        const p = session.players.filter((x: any) => x.lane === pos);
        orderedNames.push(p[0].nickname, p[1].nickname);
        orderedScores.push(p[0].score, p[1].score);
      });
      session.combos = laneBalance(orderedNames, orderedScores);
    } else {
      const names = session.players.map((p: any) => p.nickname);
      const scores = session.players.map((p: any) => p.score);
      session.combos = balanceTeams(names, scores);
    }

    await interaction.update(buildJoinEmbed(session));
    const comboMsg = await interaction.followUp({ content: '✅ 10명이 모였습니다! 팀 조합을 선택해 주세요.', ...buildComboEmbed(session.combos), fetchReply: true });
    session.messageId = (comboMsg as any).id;
  } else {
    await interaction.update(buildJoinEmbed(session));
  }
}