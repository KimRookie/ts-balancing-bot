/**
 * 한글 티어 약어 → 점수 변환
 */
export function tierToScore(tier: string): number | null {
  const cut = tier[0];
  const lastChar = tier[tier.length - 1];
  let normalized = tier;

  if (cut === '아') {
    normalized = '아이언';
  } else if (cut === '브') {
    normalized = '브론즈';
  } else if (cut === '실') {
    normalized = '실버' + lastChar;
  } else if (cut === '골') {
    normalized = '골드' + lastChar;
  } else if (cut === '플') {
    normalized = '플레티넘' + lastChar;
  } else if (cut === '에' || cut === '애') {
    normalized = '에메랄드' + lastChar;
  } else if (cut === '다') {
    normalized = '다이아' + lastChar;
  } else if (['마', '그', '챌', '첼'].includes(cut)) {
    let number = '0';
    try {
      const masterCut = tier[tier.length - 3];
      if (['마', '스', '터'].includes(masterCut)) {
        number = '0';
      } else if (['챌', '첼'].includes(cut) && (tier.length === 5 || tier.length === 7)) {
        number = '9'; 
      } else {
        number = masterCut;
      }
    } catch {
      if (tier[tier.length - 1] === '마') {
        number = '0';
      } else if (cut === '그' && tier.length === 2) {
        number = '5';
      } else if (['챌', '첼'].includes(cut) && tier.length === 1) {
        number = '8';
      } else if (tier[tier.length - 2] === '마') {
        number = '0';
      }
    }
    normalized = '마/그/챌' + number;
  }

  const tierMap: Record<string, number> = {
    '아이언': 0,
    '브론즈': 400,
    '실버4': 800,  '실버실': 800,  '실버버': 800,
    '실버3': 900,
    '실버2': 1000,
    '실버1': 1100,
    '골드4': 1200, '골드드': 1200, '골드골': 1200,
    '골드3': 1300,
    '골드2': 1400,
    '골드1': 1500,
    '플레티넘4': 1600, '플레티넴플': 1600, '플레티넘레': 1600, '플레티넘넘': 1600,
    '플레티넘3': 1700,
    '플레티넘2': 1800,
    '플레티넘1': 1900,
    '에메랄드4': 2000, '에메랄드드': 2000, '에메랄드메': 2000, '에메랄드에': 2000,
    '에메랄드3': 2100,
    '에메랄드2': 2200,
    '에메랄드1': 2300,
    
    '다이아4': 2400, '다이아아': 2400, '다이아다': 2400,
    '다이아3': 2500,
    '다이아2': 2630,
    '다이아1': 2770,
    
    '마/그/챌0': 2920,
    '마/그/챌1': 3090,
    '마/그/챌2': 3270,
    '마/그/챌3': 3460,
    '마/그/챌4': 3670,
    '마/그/챌5': 3890,
    '마/그/챌6': 4120,
    '마/그/챌7': 4370,
    '마/그/챌8': 4630,
    '마/그/챌9': 4900,
  };

  return tierMap[normalized] ?? null;
}

/** 점수 → 티어 텍스트 변환 (랭킹 표시용) */
export function scoreToTierLabel(score: number): string {
  if (score >= 4630) return '챌린저';
  if (score >= 3670) return '그랜드마스터';
  if (score >= 2920) return '마스터';
  if (score >= 2770) return '다이아1';
  if (score >= 2630) return '다이아2';
  if (score >= 2500) return '다이아3';
  if (score >= 2400) return '다이아4';
  if (score >= 2300) return '에메랄드1';
  if (score >= 2200) return '에메랄드2';
  if (score >= 2100) return '에메랄드3';
  if (score >= 2000) return '에메랄드4';
  if (score >= 1900) return '플레티넘1';
  if (score >= 1800) return '플레티넘2';
  if (score >= 1700) return '플레티넘3';
  if (score >= 1600) return '플레티넘4';
  if (score >= 1500) return '골드1';
  if (score >= 1400) return '골드2';
  if (score >= 1300) return '골드3';
  if (score >= 1200) return '골드4';
  if (score >= 1100) return '실버1';
  if (score >= 1000) return '실버2';
  if (score >= 900)  return '실버3';
  if (score >= 800)  return '실버4';
  if (score >= 400)  return '브론즈';
  return '아이언';
}

/** 점수 → 티어 및 비율 보정된 LP 텍스트 변환 (결과창 표시용) */
export function scoreToTierAndLP(score: number): string {
  if (score >= 4900) {
    const excess = score - 4900;
    const lp = 900 + Math.floor(excess * (100 / 270));
    return `챌린저 ${lp}LP`;
  }

  const masterScores = [2920, 3090, 3270, 3460, 3670, 3890, 4120, 4370, 4630, 4900];
  if (score >= 2920) {
    for (let i = masterScores.length - 2; i >= 0; i--) {
      if (score >= masterScores[i]) {
        const gap = masterScores[i + 1] - masterScores[i];
        const extra = score - masterScores[i];
        const lp = (i * 100) + Math.floor((extra / gap) * 100);
        
        let label = '마스터';
        if (lp >= 800) label = '챌린저';
        else if (lp >= 400) label = '그랜드마스터';
        
        return `${label} ${lp}LP`;
      }
    }
  }

  if (score >= 2770) return `다이아1 ${Math.floor((score - 2770) / 150 * 100)}LP`;
  if (score >= 2630) return `다이아2 ${Math.floor((score - 2630) / 140 * 100)}LP`;
  if (score >= 2500) return `다이아3 ${Math.floor((score - 2500) / 130 * 100)}LP`;
  if (score >= 2400) return `다이아4 ${Math.floor((score - 2400) / 100 * 100)}LP`;

  const tier = scoreToTierLabel(score);
  const lp = Math.floor(score % 100);
  return `${tier} ${lp}LP`;
}

/** 점수 → 짧은 영문 티어 변환 (조합 리스트 평균 표시용) */
export function scoreToShortTierLabel(score: number): string {
  if (score >= 4630) return 'C';
  if (score >= 3670) return 'GM';
  if (score >= 2920) return 'M';
  if (score >= 2770) return 'D1';
  if (score >= 2630) return 'D2';
  if (score >= 2500) return 'D3';
  if (score >= 2400) return 'D4';
  if (score >= 2300) return 'E1';
  if (score >= 2200) return 'E2';
  if (score >= 2100) return 'E3';
  if (score >= 2000) return 'E4';
  if (score >= 1900) return 'P1';
  if (score >= 1800) return 'P2';
  if (score >= 1700) return 'P3';
  if (score >= 1600) return 'P4';
  if (score >= 1500) return 'G1';
  if (score >= 1400) return 'G2';
  if (score >= 1300) return 'G3';
  if (score >= 1200) return 'G4';
  if (score >= 1100) return 'S1';
  if (score >= 1000) return 'S2';
  if (score >= 900)  return 'S3';
  if (score >= 800)  return 'S4';
  if (score >= 400)  return 'B';
  return 'I';
}