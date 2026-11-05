export interface TierBracket {
  key: string;
  label: string;
  shortLabel: string;
  score: number;
  isMasterPlus?: boolean;
  baseLP?: number;
  nextLP?: number;
}

/**
 * 전체 티어 구간 정의 (오름차순)
 * - 모든 인접 구간 점수 차이는 5의 배수(50, 100, 150, 200, 300)
 * - 어느 구간에서든 정확히 5승 시 다음 구간 승급, 5패 시 이전 구간 강등
 */
export const TIER_BRACKETS: TierBracket[] = [
  // 아이언 (700 ~ 850, 간격 50)
  { key: '아이언4', label: '아이언4', shortLabel: 'I4', score: 700 },
  { key: '아이언3', label: '아이언3', shortLabel: 'I3', score: 750 },
  { key: '아이언2', label: '아이언2', shortLabel: 'I2', score: 800 },
  { key: '아이언1', label: '아이언1', shortLabel: 'I1', score: 850 },

  // 브론즈 (900 ~ 1050, 간격 50)
  { key: '브론즈4', label: '브론즈4', shortLabel: 'B4', score: 900 },
  { key: '브론즈3', label: '브론즈3', shortLabel: 'B3', score: 950 },
  { key: '브론즈2', label: '브론즈2', shortLabel: 'B2', score: 1000 },
  { key: '브론즈1', label: '브론즈1', shortLabel: 'B1', score: 1050 },

  // 실버 (1100 ~ 1500)
  { key: '실버4', label: '실버4', shortLabel: 'S4', score: 1100 },
  { key: '실버3', label: '실버3', shortLabel: 'S3', score: 1150 },
  { key: '실버2', label: '실버2', shortLabel: 'S2', score: 1300 },
  { key: '실버1', label: '실버1', shortLabel: 'S1', score: 1500 },

  // 골드 (1700 ~ 2100)
  { key: '골드4', label: '골드4', shortLabel: 'G4', score: 1700 },
  { key: '골드3', label: '골드3', shortLabel: 'G3', score: 1800 },
  { key: '골드2', label: '골드2', shortLabel: 'G2', score: 1900 },
  { key: '골드1', label: '골드1', shortLabel: 'G1', score: 2100 },

  // 플레티넘 (2200 ~ 2700)
  { key: '플레티넘4', label: '플레티넘4', shortLabel: 'P4', score: 2200 },
  { key: '플레티넘3', label: '플레티넘3', shortLabel: 'P3', score: 2300 },
  { key: '플레티넘2', label: '플레티넘2', shortLabel: 'P2', score: 2500 },
  { key: '플레티넘1', label: '플레티넘1', shortLabel: 'P1', score: 2700 },

  // 에메랄드 (2900 ~ 3500, 간격 200)
  { key: '에메랄드4', label: '에메랄드4', shortLabel: 'E4', score: 2900 },
  { key: '에메랄드3', label: '에메랄드3', shortLabel: 'E3', score: 3100 },
  { key: '에메랄드2', label: '에메랄드2', shortLabel: 'E2', score: 3300 },
  { key: '에메랄드1', label: '에메랄드1', shortLabel: 'E1', score: 3500 },

  // 다이아 (3800 ~ 4700, 간격 300)
  { key: '다이아4', label: '다이아4', shortLabel: 'D4', score: 3800 },
  { key: '다이아3', label: '다이아3', shortLabel: 'D3', score: 4100 },
  { key: '다이아2', label: '다이아2', shortLabel: 'D2', score: 4400 },
  { key: '다이아1', label: '다이아1', shortLabel: 'D1', score: 4700 },

  // 마스터 / 그랜드마스터 / 챌린저 (150LP 단위, 최고 구간 2500LP 이상)
  { key: '마/그/챌0',  label: '마스터',       shortLabel: 'M',  score: 4800, isMasterPlus: true, baseLP: 0,    nextLP: 150 },
  { key: '마/그/챌1',  label: '마스터',       shortLabel: 'M',  score: 5000, isMasterPlus: true, baseLP: 150,  nextLP: 300 },
  { key: '마/그/챌2',  label: '마스터',       shortLabel: 'M',  score: 5300, isMasterPlus: true, baseLP: 300,  nextLP: 450 },
  { key: '마/그/챌3',  label: '그랜드마스터', shortLabel: 'GM', score: 5500, isMasterPlus: true, baseLP: 450,  nextLP: 600 },
  { key: '마/그/챌4',  label: '그랜드마스터', shortLabel: 'GM', score: 5700, isMasterPlus: true, baseLP: 600,  nextLP: 750 },
  { key: '마/그/챌5',  label: '그랜드마스터', shortLabel: 'GM', score: 5900, isMasterPlus: true, baseLP: 750,  nextLP: 900 },
  { key: '마/그/챌6',  label: '챌린저',       shortLabel: 'C',  score: 6100, isMasterPlus: true, baseLP: 900,  nextLP: 1050 },
  { key: '마/그/챌7',  label: '챌린저',       shortLabel: 'C',  score: 6300, isMasterPlus: true, baseLP: 1050, nextLP: 1200 },
  { key: '마/그/챌8',  label: '챌린저',       shortLabel: 'C',  score: 6500, isMasterPlus: true, baseLP: 1200, nextLP: 1350 },
  { key: '마/그/챌9',  label: '챌린저',       shortLabel: 'C',  score: 6700, isMasterPlus: true, baseLP: 1350, nextLP: 1500 },
  { key: '마/그/챌10', label: '챌린저',       shortLabel: 'C',  score: 6900, isMasterPlus: true, baseLP: 1500, nextLP: 1650 },
  { key: '마/그/챌11', label: '챌린저',       shortLabel: 'C',  score: 7100, isMasterPlus: true, baseLP: 1650, nextLP: 1800 },
  { key: '마/그/챌12', label: '챌린저',       shortLabel: 'C',  score: 7300, isMasterPlus: true, baseLP: 1800, nextLP: 1950 },
  { key: '마/그/챌13', label: '챌린저',       shortLabel: 'C',  score: 7500, isMasterPlus: true, baseLP: 1950, nextLP: 2100 },
  { key: '마/그/챌14', label: '챌린저',       shortLabel: 'C',  score: 7700, isMasterPlus: true, baseLP: 2100, nextLP: 2250 },
  { key: '마/그/챌15', label: '챌린저',       shortLabel: 'C',  score: 7900, isMasterPlus: true, baseLP: 2250, nextLP: 2400 },
  { key: '마/그/챌16', label: '챌린저',       shortLabel: 'C',  score: 8100, isMasterPlus: true, baseLP: 2400, nextLP: 2500 },
  { key: '마/그/챌17', label: '챌린저',       shortLabel: 'C',  score: 8300, isMasterPlus: true, baseLP: 2500, nextLP: 2650 },
];

/** LP 숫자를 마/그/챌 구간 인덱스(0~17)로 변환 */
function lpToMasterBracketIndex(lp: number): number {
  if (lp >= 2500) return 17;
  if (lp >= 2400) return 16;
  return Math.max(0, Math.min(15, Math.floor(lp / 150)));
}

/**
 * 한글/영문 티어 약어 → 점수 변환 (대소문자 무관)
 * 예: I4~D1, M, M200, GM, C, C2500 / 아, 브, 실2, 골1, 플4, 에3, 다4, 마200, 그마, 챌
 */
export function tierToScore(tier: string): number | null {
  const raw = tier.trim();
  if (!raw) return null;

  const upper = raw.toUpperCase();
  const cut = raw[0];
  const lastChar = raw[raw.length - 1];
  let normalized = raw;

  const engHighMatch = upper.match(/^(GM|M|C)(\d+)?(?:LP|점)?$/);

  // ── 1. 영문 티어 약어 처리 (대소문자 무관) ──
  if (/^I([1-4])?$/.test(upper)) {
    const div = upper.slice(1) || '4';
    normalized = '아이언' + div;
  } else if (/^B([1-4])?$/.test(upper)) {
    const div = upper.slice(1) || '4';
    normalized = '브론즈' + div;
  } else if (/^S([1-4])?$/.test(upper)) {
    const div = upper.slice(1) || '4';
    normalized = '실버' + div;
  } else if (/^G([1-4])?$/.test(upper)) {
    const div = upper.slice(1) || '4';
    normalized = '골드' + div;
  } else if (/^P([1-4])?$/.test(upper)) {
    const div = upper.slice(1) || '4';
    normalized = '플레티넘' + div;
  } else if (/^E([1-4])?$/.test(upper)) {
    const div = upper.slice(1) || '4';
    normalized = '에메랄드' + div;
  } else if (/^D([1-4])?$/.test(upper)) {
    const div = upper.slice(1) || '4';
    normalized = '다이아' + div;
  } else if (engHighMatch) {
    const prefix = engHighMatch[1];
    const digits = engHighMatch[2];
    let idx = 0;

    if (!digits) {
      if (prefix === 'M') idx = 0;       // 0~149 LP (4800)
      else if (prefix === 'GM') idx = 3; // 450~599 LP (5500)
      else if (prefix === 'C') idx = 6;  // 900~1049 LP (6100)
    } else {
      const n = parseInt(digits, 10);
      const lp = digits.length === 1 ? n * 100 : n;
      idx = lpToMasterBracketIndex(lp);
    }
    normalized = '마/그/챌' + idx;
  }
  // ── 2. 한글 티어 약어 처리 ──
  else if (cut === '아') {
    normalized = ['1', '2', '3', '4'].includes(lastChar) ? '아이언' + lastChar : '아이언4';
  } else if (cut === '브') {
    normalized = ['1', '2', '3', '4'].includes(lastChar) ? '브론즈' + lastChar : '브론즈4';
  } else if (cut === '실') {
    normalized = ['1', '2', '3', '4'].includes(lastChar) ? '실버' + lastChar : '실버4';
  } else if (cut === '골') {
    normalized = ['1', '2', '3', '4'].includes(lastChar) ? '골드' + lastChar : '골드4';
  } else if (cut === '플') {
    normalized = ['1', '2', '3', '4'].includes(lastChar) ? '플레티넘' + lastChar : '플레티넘4';
  } else if (cut === '에' || cut === '애') {
    normalized = ['1', '2', '3', '4'].includes(lastChar) ? '에메랄드' + lastChar : '에메랄드4';
  } else if (cut === '다') {
    normalized = ['1', '2', '3', '4'].includes(lastChar) ? '다이아' + lastChar : '다이아4';
  } else if (['마', '그', '챌', '첼'].includes(cut)) {
    let idx = 0;

    if (raw === '그' || raw === '그마' || raw === '그랜드마스터') {
      idx = 3;
    } else if (raw === '마' || raw === '마스터') {
      idx = 0;
    } else if (raw === '챌' || raw === '첼' || raw === '챌린저' || raw === '첼린저') {
      idx = 6;
    } else {
      const digitMatch = raw.match(/(\d+)/);
      if (digitMatch) {
        const digits = digitMatch[1];
        const n = parseInt(digits, 10);
        const lp = digits.length === 1 ? n * 100 : n;
        idx = lpToMasterBracketIndex(lp);
      } else {
        idx = 0;
      }
    }
    normalized = '마/그/챌' + idx;
  }

  const found = TIER_BRACKETS.find(b => b.key === normalized);
  return found ? found.score : null;
}

/** 현재 점수가 속한 구간 인덱스 조회 */
function findBracketIndex(score: number): number {
  for (let i = TIER_BRACKETS.length - 1; i >= 0; i--) {
    if (score >= TIER_BRACKETS[i].score) {
      return i;
    }
  }
  return 0;
}

/**
 * 1승 시 점수 증가 계산 (소속 구간에서 정확히 5승 시 다음 구간 진입)
 */
export function getScoreAfterWin(currentScore: number): number {
  const idx = findBracketIndex(currentScore);
  if (idx >= TIER_BRACKETS.length - 1) {
    // 최고 구간(2500LP+, 8300점) 이상에서는 1승당 +40점 (+30LP)
    return currentScore + 40;
  }
  const curr = TIER_BRACKETS[idx];
  const next = TIER_BRACKETS[idx + 1];
  const step = (next.score - curr.score) / 5;
  const nextScore = currentScore + step;
  // 구간 경계를 넘어갈 때 부동소수점/잔여치 오차 없이 다음 구간 시작점에 스냅
  if (currentScore < next.score && nextScore > next.score) {
    return next.score;
  }
  return Math.round(nextScore);
}

/**
 * 1패 시 점수 감소 계산 (소속 구간에서 정확히 5패 시 이전 구간 강등)
 */
export function getScoreAfterLoss(currentScore: number): number {
  const minScore = TIER_BRACKETS[0].score;
  if (currentScore <= minScore) return minScore;

  const idx = findBracketIndex(currentScore);
  const curr = TIER_BRACKETS[idx];

  // 현재 구간의 0LP(경계선)에 정확히 걸쳐 있는 경우, 바로 아래 구간 폭의 1/5만큼 감소 (아래 구간 80LP로 강등)
  if (currentScore === curr.score && idx > 0) {
    const prev = TIER_BRACKETS[idx - 1];
    const stepDown = (curr.score - prev.score) / 5;
    return Math.max(minScore, Math.round(currentScore - stepDown));
  }

  // 최고 구간 이상인 경우
  if (idx >= TIER_BRACKETS.length - 1) {
    return Math.max(curr.score, currentScore - 40);
  }

  const next = TIER_BRACKETS[idx + 1];
  const step = (next.score - curr.score) / 5;
  const nextScore = currentScore - step;
  // 현재 구간 바닥 아래로 내려갈 경우 현재 구간 0LP에 스냅
  if (currentScore > curr.score && nextScore < curr.score) {
    return curr.score;
  }
  return Math.max(minScore, Math.round(nextScore));
}

/** 점수 → 티어 텍스트 변환 (랭킹 표시용) */
export function scoreToTierLabel(score: number): string {
  const idx = findBracketIndex(score);
  return TIER_BRACKETS[idx].label;
}

/** 점수 → 티어 및 비율 보정된 LP 텍스트 변환 (결과창/전적 표시용) */
export function scoreToTierAndLP(score: number): string {
  const idx = findBracketIndex(score);
  const curr = TIER_BRACKETS[idx];

  // 최고 구간 (2500LP+, 8300점 이상)
  if (idx === TIER_BRACKETS.length - 1) {
    const excess = Math.max(0, score - curr.score);
    const lp = 2500 + Math.round((excess / 200) * 150);
    return `챌린저 ${lp}LP`;
  }

  const next = TIER_BRACKETS[idx + 1];
  const gap = next.score - curr.score;
  const extra = Math.max(0, score - curr.score);

  if (curr.isMasterPlus) {
    const lpSpan = (curr.nextLP ?? (curr.baseLP! + 150)) - curr.baseLP!;
    const lp = curr.baseLP! + Math.round((extra / gap) * lpSpan);
    return `${curr.label} ${lp}LP`;
  }

  const lp = Math.round((extra / gap) * 100);
  return `${curr.label} ${lp}LP`;
}

/** 점수 → 짧은 영문 티어 변환 (조합 리스트 평균 표시용) */
export function scoreToShortTierLabel(score: number): string {
  const idx = findBracketIndex(score);
  return TIER_BRACKETS[idx].shortLabel;
}
