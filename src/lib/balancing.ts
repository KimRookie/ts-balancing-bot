export interface TeamCombo {
  team1: string[];
  team2: string[];
  team1Score: number;
  team2Score: number;
  diff: number;
}

const POSITIONS = ['탑', '정글', '미드', '원딜', '서폿'];
const MAX_COMBOS = 12; // 내부적으로 최대 12개까지 보관 (UI에서는 5개만 노출)
const SCORE_PER_WIN = 20;
const SCORE_PER_LOSS = 20;

export { SCORE_PER_WIN, SCORE_PER_LOSS, POSITIONS };

// ────────────────────────────────────────────
// 유틸리티 함수
// ────────────────────────────────────────────
export function combinations<T>(arr: T[], r: number): T[][] {
  if (r === 0) return [[]];
  if (arr.length < r) return [];
  const [first, ...rest] = arr;
  const withFirst = combinations(rest, r - 1).map(c => [first, ...c]);
  const withoutFirst = combinations(rest, r);
  return [...withFirst, ...withoutFirst];
}

// ────────────────────────────────────────────
// 일반 밸런싱 (10C5 완전탐색 후 최상위 정렬)
// ────────────────────────────────────────────
export function balanceTeams(
  names: string[],
  scores: number[],
  fixedPlayer1?: number,
  fixedPlayer2?: number,
): TeamCombo[] {
  const indices = Array.from({ length: 10 }, (_, i) => i);
  const allCombos = combinations(indices, 5);
  const validCombos: TeamCombo[] = [];

  for (const team1Idx of allCombos) {
    const team2Idx = indices.filter(i => !team1Idx.includes(i));

    // 단일고정 모드: 두 고정 선수가 반드시 다른 팀에 있어야 함
    if (fixedPlayer1 !== undefined && fixedPlayer2 !== undefined) {
      const p1InTeam1 = team1Idx.includes(fixedPlayer1);
      const p2InTeam1 = team1Idx.includes(fixedPlayer2);
      if (p1InTeam1 === p2InTeam1) continue;
    }

    const team1Score = team1Idx.reduce((s, i) => s + scores[i], 0);
    const team2Score = team2Idx.reduce((s, i) => s + scores[i], 0);
    const diff = Math.abs(team1Score - team2Score);

    validCombos.push({
      team1: team1Idx.map(i => names[i]),
      team2: team2Idx.map(i => names[i]),
      team1Score,
      team2Score,
      diff,
    });
  }

  // 🚨 점수 차이(diff) 기준 오름차순 정렬 후 상위 항목만 반환
  return validCombos.sort((a, b) => a.diff - b.diff).slice(0, MAX_COMBOS);
}

// ────────────────────────────────────────────
// 라인고정 밸런싱 (포지션별 2^5 완전탐색 후 최상위 정렬)
// ────────────────────────────────────────────
export function laneBalance(names: string[], scores: number[]): TeamCombo[] {
  const positions: [string, string][] = [];
  for (let i = 0; i < names.length; i += 2) {
    positions.push([names[i], names[i + 1]]);
  }

  const scoreMap: Record<string, number> = {};
  names.forEach((name, i) => { scoreMap[name] = scores[i]; });

  const allCombos: TeamCombo[] = [];
  const total32 = Math.pow(2, 5);

  for (let mask = 0; mask < total32; mask++) {
    const team1: string[] = [];
    const team2: string[] = [];

    positions.forEach(([p1, p2], posIdx) => {
      // 비트마스킹으로 2명의 위치를 스위칭
      if ((mask >> posIdx) & 1) {
        team1.push(p1); team2.push(p2);
      } else {
        team1.push(p2); team2.push(p1);
      }
    });

    const team1Score = team1.reduce((s, n) => s + scoreMap[n], 0);
    const team2Score = team2.reduce((s, n) => s + scoreMap[n], 0);
    const diff = Math.abs(team1Score - team2Score);

    allCombos.push({ team1, team2, team1Score, team2Score, diff });
  }

  // 🚨 점수 차이 기준 오름차순 정렬 후 상위 항목만 반환
  return allCombos.sort((a, b) => a.diff - b.diff).slice(0, MAX_COMBOS);
}