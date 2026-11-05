import { ButtonInteraction, ActionRowBuilder, ButtonBuilder } from 'discord.js';
import { sessions, parseServerNickname, SessionPlayer, refreshAndRebalance } from '../lib/utils';
import { buildJoinEmbed, buildResultEmbed, buildComboEmbed, buildMatchEmbed } from '../lib/embeds';
import { balanceTeams, laneBalance, POSITIONS } from '../lib/balancing';
import { getScoreAfterWin, getScoreAfterLoss } from '../lib/tierScore';
import prisma from '../lib/db';

export async function handleButton(interaction: ButtonInteraction) {
  const { customId, guildId, user, member, message } = interaction;
  if (!guildId) return;

  const session = sessions.get(guildId);
  if (!session) {
    return interaction.reply({ content: '진행 중인 내전이 없습니다. `/내전시작`을 먼저 해주세요.', ephemeral: true });
  }

  if (session.messageId && message.id !== session.messageId) {
    return interaction.reply({ content: '⚠️ 이전 세션의 버튼입니다. 최신 메시지를 이용해주세요.', ephemeral: true });
  }

  const serverNickname = parseServerNickname(member, user);
  const player = await prisma.player.findUnique({
    where: { guildId_nickname: { guildId, nickname: serverNickname } },
  });

  // ────────────────────────────────────────────
  // 1. 참가 & 취소 버튼 (Joining Phase)
  // ────────────────────────────────────────────
  if (customId === 'join_game') {
    if (session.phase !== 'joining') return interaction.reply({ content: '모집 단계가 아닙니다.', ephemeral: true });
    if (!player) return interaction.reply({ content: `❌ DB에 **${serverNickname}** 선수가 없습니다.`, ephemeral: true });
    if (session.players.some((p: SessionPlayer) => p.nickname === serverNickname)) return interaction.reply({ content: '이미 참가하셨습니다.', ephemeral: true });
    if (session.players.length >= 10) return interaction.reply({ content: '❌ 10명 정원이 가득 찼습니다.', ephemeral: true });

    session.players.push({ nickname: player.nickname, score: player.score });
    await checkAndProceedSelecting(interaction, session);
    return;
  }

  const laneMatch = customId.match(/^join_lane_(.+)$/);
  if (laneMatch) {
    if (session.phase !== 'joining') return interaction.reply({ content: '모집 단계가 아닙니다.', ephemeral: true });
    if (!player) return interaction.reply({ content: `❌ DB에 **${serverNickname}** 선수가 없습니다.`, ephemeral: true });
    
    const targetLane = laneMatch[1];
    const laneCount = session.players.filter((p: SessionPlayer) => p.lane === targetLane && p.nickname !== serverNickname).length;
    if (laneCount >= 2) return interaction.reply({ content: `❌ **${targetLane}** 포지션은 이미 가득 찼습니다.`, ephemeral: true });

    const existingIndex = session.players.findIndex((p: SessionPlayer) => p.nickname === serverNickname);
    if (existingIndex !== -1) session.players.splice(existingIndex, 1);

    session.players.push({ nickname: player.nickname, score: player.score, lane: targetLane });
    await checkAndProceedSelecting(interaction, session);
    return;
  }

  if (customId === 'leave_game') {
    if (session.phase !== 'joining') return interaction.reply({ content: '모집 단계가 아닙니다.', ephemeral: true });
    const idx = session.players.findIndex((p: SessionPlayer) => p.nickname === serverNickname);
    if (idx === -1) return interaction.reply({ content: '참가 내역이 없습니다.', ephemeral: true });

    session.players.splice(idx, 1);
    const joinData = buildJoinEmbed(session);
    await interaction.update({ embeds: joinData.embeds, components: joinData.components });
    return;
  }

  // ────────────────────────────────────────────
  // 2. 조합 선택 및 관리 (Selecting Phase)
  // ────────────────────────────────────────────
  if (customId.startsWith('select_combo_')) {
    if (session.phase !== 'selecting') return interaction.reply({ content: '팀 조합 선택 단계가 아닙니다.', ephemeral: true });
    const memberObj = member as any;
    if (!memberObj?.permissions.has('Administrator')) return interaction.reply({ content: '관리자만 팀을 확정할 수 있습니다.', ephemeral: true });

    const idx = parseInt(customId.replace('select_combo_', ''), 10);
    session.selectedCombo = session.combos[idx];
    session.phase = 'playing';

    // 🚨 타입 에러 해결 (row를 any로 캐스팅)
    const disabledComponents = interaction.message.components.map((row: any) => {
      const newRow = new ActionRowBuilder<ButtonBuilder>();
      row.components.forEach((btn: any) => newRow.addComponents(ButtonBuilder.from(btn).setDisabled(true)));
      return newRow;
    });
    await interaction.update({ components: disabledComponents });

    // 🚨 타입 에러 해결 (channel을 any로 캐스팅)
    const matchData = buildMatchEmbed(session.selectedCombo, idx, session.mode);
    if (interaction.channel) {
      const matchMsg = await (interaction.channel as any).send({ content: '⚔️ 팀 조합이 확정되었습니다! 게임을 시작하세요.', embeds: matchData.embeds, components: matchData.components });
      session.messageId = matchMsg.id;
    }
    return;
  }

  if (customId === 'dice_combo') {
    if (session.phase !== 'selecting') return interaction.reply({ content: '모집이 완료되지 않았습니다.', ephemeral: true });
    session.combos = session.combos.sort(() => Math.random() - 0.5);
    const comboData = buildComboEmbed(session.combos);
    await interaction.update({ content: '🎲 주사위를 굴려 조합의 순서를 섞었습니다!', embeds: comboData.embeds, components: comboData.components });
    return;
  }

  if (customId === 'rebalance') {
    const memberObj = member as any;
    if (!memberObj?.permissions.has('Administrator')) return interaction.reply({ content: '관리자만 사용할 수 있습니다.', ephemeral: true });
    
    session.phase = 'selecting';
    await refreshAndRebalance(session);
    const comboData = buildComboEmbed(session.combos);
    
    const disabledComponents = interaction.message.components.map((row: any) => {
      const newRow = new ActionRowBuilder<ButtonBuilder>();
      row.components.forEach((btn: any) => newRow.addComponents(ButtonBuilder.from(btn).setDisabled(true)));
      return newRow;
    });
    await interaction.update({ components: disabledComponents });

    if (interaction.channel) {
      const comboMsg = await (interaction.channel as any).send({ content: '⚖️ 최신 상태를 반영하여 팀을 재조합했습니다.', embeds: comboData.embeds, components: comboData.components });
      session.messageId = comboMsg.id;
    }
    return;
  }

  if (customId === 'change_player_guide') {
    return interaction.reply({ content: '💡 선수 교체는 관리자가 `/선수변경 [빠질사람] [들어올사람]` 명령어를 사용해 주세요.', ephemeral: true });
  }

  // ────────────────────────────────────────────
  // 3. 경기 결과 처리 (Playing -> Post-Match)
  // ────────────────────────────────────────────
  if (customId === 'win_team1' || customId === 'win_team2') {
    const memberObj = member as any;
    if (!memberObj?.permissions.has('Administrator')) return interaction.reply({ content: '관리자만 결과를 확정할 수 있습니다.', ephemeral: true });
    if ((session.phase as any) !== 'playing') return interaction.reply({ content: '진행 중인 게임이 없습니다.', ephemeral: true });
    if (!session.selectedCombo) return interaction.reply({ content: '선택된 팀 조합이 없습니다.', ephemeral: true });

    if (session.isProcessing) return interaction.reply({ content: '⏳ 결과 저장 중입니다...', ephemeral: true });
    session.isProcessing = true;

    const disabledComponents = interaction.message.components.map((row: any) => {
      const newRow = new ActionRowBuilder<ButtonBuilder>();
      row.components.forEach((btn: any) => newRow.addComponents(ButtonBuilder.from(btn).setDisabled(true)));
      return newRow;
    });
    await interaction.update({ components: disabledComponents });

    const isTeam1Win = customId === 'win_team1';
    const winners = isTeam1Win ? session.selectedCombo.team1 : session.selectedCombo.team2;
    const losers = isTeam1Win ? session.selectedCombo.team2 : session.selectedCombo.team1;

    try {
      await prisma.match.create({
        data: {
          guildId, mode: session.mode,
          winners: { connect: winners.map((n: string) => ({ guildId_nickname: { guildId, nickname: n } })) },
          losers: { connect: losers.map((n: string) => ({ guildId_nickname: { guildId, nickname: n } })) }
        }
      });

      const currentPlayers = await prisma.player.findMany({
        where: { guildId, nickname: { in: [...winners, ...losers] } },
      });

      for (const nick of winners) {
        const cur = currentPlayers.find((p: any) => p.nickname === nick);
        const newScore = getScoreAfterWin(cur ? cur.score : 700);
        await prisma.player.update({
          where: { guildId_nickname: { guildId, nickname: nick } },
          data: { score: newScore, wins: { increment: 1 } }
        });
      }
      for (const nick of losers) {
        const cur = currentPlayers.find((p: any) => p.nickname === nick);
        const newScore = getScoreAfterLoss(cur ? cur.score : 700);
        await prisma.player.update({
          where: { guildId_nickname: { guildId, nickname: nick } },
          data: { score: newScore, losses: { increment: 1 } }
        });
      }

      const updatedPlayers = await prisma.player.findMany({
        where: { guildId, nickname: { in: [...winners, ...losers] } }
      });
      const winData = winners.map((n: string) => updatedPlayers.find((p: any) => p.nickname === n) || { nickname: n, score: 0 });
      const loseData = losers.map((n: string) => updatedPlayers.find((p: any) => p.nickname === n) || { nickname: n, score: 0 });

      session.phase = 'post_match';
      const resultData = buildResultEmbed(winData, loseData);
      
      if (interaction.channel) {
        const resultMsg = await (interaction.channel as any).send({ 
          content: `🎉 **${isTeam1Win ? '1팀' : '2팀'} 승리!** 결과가 안전하게 저장되었습니다.`, 
          embeds: resultData.embeds, components: resultData.components 
        });
        session.messageId = resultMsg.id;
      }
    } catch (error) {
      console.error(error);
      if (interaction.channel) await (interaction.channel as any).send('❌ 결과 저장 중 오류가 발생했습니다.');
    } finally {
      session.isProcessing = false;
    }
    return;
  }

  // ────────────────────────────────────────────
  // 4. 경기 종료 및 재시작 제어 (Post-Match)
  // ────────────────────────────────────────────
  if (customId === 'rematch') {
    const memberObj = member as any;
    if (!memberObj?.permissions.has('Administrator')) return interaction.reply({ content: '관리자만 조작할 수 있습니다.', ephemeral: true });
    
    session.phase = 'joining';
    session.selectedCombo = undefined;
    session.combos = [];
    
    const disabledComponents = interaction.message.components.map((row: any) => {
      const newRow = new ActionRowBuilder<ButtonBuilder>();
      row.components.forEach((btn: any) => newRow.addComponents(ButtonBuilder.from(btn).setDisabled(true)));
      return newRow;
    });
    await interaction.update({ components: disabledComponents });

    const joinData = buildJoinEmbed(session);
    if (interaction.channel) {
      const joinMsg = await (interaction.channel as any).send({ content: '🔄 로비로 돌아왔습니다. 멤버를 재구성하거나 재경기를 시작하세요!', embeds: joinData.embeds, components: joinData.components });
      session.messageId = joinMsg.id;
    }
    return;
  }

  if (customId === 'end_session') {
    const memberObj = member as any;
    if (!memberObj?.permissions.has('Administrator')) return interaction.reply({ content: '관리자만 내전을 종료할 수 있습니다.', ephemeral: true });
    
    sessions.delete(guildId);
    
    const disabledComponents = interaction.message.components.map((row: any) => {
      const newRow = new ActionRowBuilder<ButtonBuilder>();
      row.components.forEach((btn: any) => newRow.addComponents(ButtonBuilder.from(btn).setDisabled(true)));
      return newRow;
    });
    await interaction.update({ content: '🛑 내전 세션이 완전히 종료되었습니다. 수고하셨습니다!', components: disabledComponents });
    return;
  }
}

async function checkAndProceedSelecting(interaction: ButtonInteraction, session: any) {
  const joinData = buildJoinEmbed(session);

  if (session.players.length === 10) {
    session.phase = 'selecting';
    const names = session.players.map((p: any) => p.nickname);
    const scores = session.players.map((p: any) => p.score);
    
    let combos: any[] = [];
    if (session.mode === '라인고정') {
      const orderedNames: string[] = [];
      const orderedScores: number[] = [];
      POSITIONS.forEach(pos => {
        const p = session.players.filter((x: any) => x.lane === pos);
        if (p[0]) { orderedNames.push(p[0].nickname); orderedScores.push(p[0].score); }
        if (p[1]) { orderedNames.push(p[1].nickname); orderedScores.push(p[1].score); }
      });
      combos = laneBalance(orderedNames, orderedScores);
    } else {
      combos = balanceTeams(names, scores);
    }

    if (combos.length === 0) {
       session.phase = 'joining';
       return interaction.update({ content: '⚠️ 인원 배정 또는 데이터 오류로 밸런싱을 진행할 수 없습니다.' });
    }

    session.combos = combos;
    const comboData = buildComboEmbed(combos);
    
    const disabledComponents = joinData.components.map((row: any) => {
      const newRow = new ActionRowBuilder<ButtonBuilder>();
      row.components.forEach((btn: any) => newRow.addComponents(ButtonBuilder.from(btn).setDisabled(true)));
      return newRow;
    });

    await interaction.update({
      content: '✅ 10명 참가 완료!',
      embeds: joinData.embeds,
      components: disabledComponents
    });

    if (interaction.channel) {
      const comboMsg = await (interaction.channel as any).send({
        content: '아래에서 팀 조합을 선택해 주세요.',
        embeds: comboData.embeds,
        components: comboData.components
      });
      session.messageId = comboMsg.id;
    }
  } else {
    await interaction.update({ embeds: joinData.embeds, components: joinData.components });
  }
}