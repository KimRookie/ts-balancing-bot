import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { TeamCombo } from './balancing'; 
import { GameSession, SessionPlayer } from './utils';
// 🚨 추가된 함수를 import에 포함합니다.
import { scoreToTierLabel, scoreToTierAndLP, scoreToShortTierLabel } from './tierScore';

const COLOR_BLUE   = 0x5865F2;
const COLOR_GREEN  = 0x57F287;
const COLOR_RED    = 0xED4245;
const COLOR_YELLOW = 0xFEE75C;

/** 참가신청 Embed + 버튼 */
export function buildJoinEmbed(session: GameSession) {
  let playerList = '';
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];

  // ── 라인고정 모드 UI ──
  if (session.mode === '라인고정') {
    const POS = ['탑', '정글', '미드', '원딜', '서폿'];
    
    playerList = POS.map(pos => {
      const playersInLane = session.players.filter(p => p.lane === pos);
      const p1 = playersInLane[0] ? `**${playersInLane[0].nickname}** (${scoreToTierAndLP(playersInLane[0].score)})` : '*(대기중)*';
      const p2 = playersInLane[1] ? `**${playersInLane[1].nickname}** (${scoreToTierAndLP(playersInLane[1].score)})` : '*(대기중)*';
      return `**[${pos}]**\n 1. ${p1}\n 2. ${p2}`;
    }).join('\n\n');

    // 라인별 버튼 생성 (꽉 차면 비활성화)
    const laneButtons = POS.map(pos => {
      const count = session.players.filter(p => p.lane === pos).length;
      return new ButtonBuilder()
        .setCustomId(`join_lane_${pos}`)
        .setLabel(`${pos} (${count}/2)`)
        .setStyle(count >= 2 ? ButtonStyle.Secondary : ButtonStyle.Primary)
        .setDisabled(count >= 2);
    });

    rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(laneButtons));
    rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('leave_game').setLabel('❌ 취소').setStyle(ButtonStyle.Danger)
    ));
  } 
  // ── 일반 모드 UI ──
  else {
    playerList = session.players.length === 0
      ? '*(아직 없음)*'
      : session.players.map((p, i) => `${i + 1}. **${p.nickname}** (${scoreToTierAndLP(p.score)})`).join('\n');

    rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('join_game').setLabel('✋ 참가 신청').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('leave_game').setLabel('❌ 취소').setStyle(ButtonStyle.Secondary)
    ));
  }

  const embed = new EmbedBuilder()
    .setTitle(`🎮 내전 참가 신청 — ${session.mode} 모드`)
    .setColor(COLOR_BLUE)
    .addFields({ name: `참가자 (${session.players.length}/10)`, value: playerList })
    .setFooter({ text: '관리자는 /수동추가, /수동제외 명령어로 인원을 관리할 수 있습니다.' });

  return { embeds: [embed], components: rows };
}

/** 팀 조합 선택 Embed + 버튼 (최대 5개 + 주사위) */
export function buildComboEmbed(combos: TeamCombo[]) {
  const half = Math.min(combos.length, 5); 
  const display = combos.slice(0, half);

  const embed = new EmbedBuilder()
    .setTitle('⚖️ 팀 조합 목록')
    .setColor(COLOR_YELLOW)
    .setDescription('원하는 조합을 선택하거나 🎲 주사위를 굴려보세요!');

  display.forEach((combo, i) => {
    // 🚨 1. 평균 점수를 짧은 영문 티어로 변환 (예: P3, G1)
    const t1AvgShort = scoreToShortTierLabel(combo.team1Score / 5);
    const t2AvgShort = scoreToShortTierLabel(combo.team2Score / 5);

    const t1 = combo.team1.map((p: string) => `• ${p}`).join('\n');
    const t2 = combo.team2.map((p: string) => `• ${p}`).join('\n');

    if (i > 0) {
      embed.addFields({ name: '\u200b', value: '──────────────────────────────', inline: false });
    }

    // 🚨 2. 타이틀의 긴 설명은 지우고, 팀 이름 옆에 직관적으로 배치
    embed.addFields(
      { name: `📌 조합 ${i + 1}`, value: '\u200b', inline: false },
      { name: `🔵 팀 1 : ${t1AvgShort}`, value: t1, inline: true },
      { name: `🔴 팀 2 : ${t2AvgShort}`, value: t2, inline: true }
    );
  });

  const comboButtons = display.map((_, i) =>
    new ButtonBuilder()
      .setCustomId(`select_combo_${i}`)
      .setLabel(`조합 ${i + 1}`)
      .setStyle(ButtonStyle.Primary)
  );

  const diceButton = new ButtonBuilder()
    .setCustomId('dice_combo')
    .setLabel('🎲 주사위')
    .setStyle(ButtonStyle.Secondary);

  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(...comboButtons);
  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(diceButton);

  return { embeds: [embed], components: [row1, row2] };
}

/** 선택된 팀 확정 Embed + 승패 버튼 (모드별 분기) */
export function buildMatchEmbed(combo: TeamCombo, comboIndex: number, mode?: string) {
  const embed = new EmbedBuilder()
    .setTitle(`✅ 조합 ${comboIndex + 1} 확정!`)
    .setColor(COLOR_GREEN)
    .addFields(
      { name: `🔵 팀 1`, value: combo.team1.map((p: string) => `• ${p}`).join('\n'), inline: true },
      { name: `🔴 팀 2`, value: combo.team2.map((p: string) => `• ${p}`).join('\n'), inline: true },
    );

  // 🚨 여기 문자열이 '칼바람'으로 정확히 일치해야 합니다.
  if (mode === '칼바람') {
    // 칼바람 전용: 승패 버튼 대신 관리 버튼 배치
    embed.setFooter({ text: '칼바람 모드는 승패 기록을 남기지 않습니다.' });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('rebalance').setLabel('⚖️ 재조합').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('change_player_guide').setLabel('🔁 선수교체').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('end_session').setLabel('🛑 내전종료').setStyle(ButtonStyle.Danger)
    );
    return { embeds: [embed], components: [row] };
  } else {
    // 일반 모드: 기존 승패 버튼
    embed.setFooter({ text: '경기 후 이긴 팀 버튼을 눌러주세요.' });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('win_team1').setLabel('🏆 팀 1 승리').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('win_team2').setLabel('🏆 팀 2 승리').setStyle(ButtonStyle.Danger),
    );
    return { embeds: [embed], components: [row] };
  }
}

/** 경기 결과 Embed (LP 변동 표시) */
export function buildResultEmbed(winners: { nickname: string; score: number }[], losers: { nickname: string; score: number }[]) {
  const embed = new EmbedBuilder()
    .setTitle('🎉 경기 결과 및 LP 변동')
    .setColor(COLOR_GREEN)
    .addFields(
      {
        name: '🏆 승리팀',
        value: winners.map((p) => `• ${p.nickname} : **${scoreToTierAndLP(p.score)}**`).join('\n') || '없음',
        inline: true,
      },
      {
        name: '💀 패배팀',
        value: losers.map((p) => `• ${p.nickname} : **${scoreToTierAndLP(p.score)}**`).join('\n') || '없음',
        inline: true,
      },
    )
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('rematch').setLabel('🔄 재경기').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('rebalance').setLabel('⚖️ 재조합').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('end_session').setLabel('🛑 내전종료').setStyle(ButtonStyle.Danger)
  );

  return { embeds: [embed], components: [row] };
}

/** 랭킹 Embed */
export function buildRankingEmbed(players: { nickname: string; score: number; wins: number; losses: number }[]) {
  const medals = ['🥇', '🥈', '🥉'];
  const list = players
    .map((p, i) => {
      const medal = medals[i] ?? `${i + 1}.`;
      const tier = scoreToTierLabel(p.score);
      return `${medal} **${p.nickname}** |  ${p.score}점 (${tier})  |  ${p.wins}승 ${p.losses}패`;
    })
    .join('\n');

  return new EmbedBuilder()
    .setTitle('🏅 내전 랭킹 TOP 10')
    .setColor(COLOR_YELLOW)
    .setDescription(list || '등록된 선수가 없습니다.')
    .setTimestamp();
}