import prisma from './db';
import { balanceTeams, laneBalance, POSITIONS } from './balancing';

export type GameMode = '밸런스' | '라인고정' | '칼바람';

export interface SessionPlayer {
  discordId: string;
  nickname: string;
  score: number;
  lane?: string; // 라인고정 모드용
}

export interface GameSession {
  guildId: string;
  channelId: string;
  mode: GameMode;
  players: SessionPlayer[];       
  combos: import('./balancing').TeamCombo[];  
  selectedCombo?: import('./balancing').TeamCombo; 
  messageId?: string;             
  phase: 'joining' | 'selecting' | 'result' | 'post_match';
  isProcessing?: boolean;      // 승패 광클 중복처리 방지 Lock
  timeoutId?: NodeJS.Timeout;  // 메모리 누수 방지용 타이머
}

export const sessions = new Map<string, GameSession>();

/** 1시간 방치 시 세션 자동 폭파 (메모리 누수 방지) */
export function resetSessionTimer(guildId: string) {
  const session = sessions.get(guildId);
  if (!session) return;
  
  if (session.timeoutId) clearTimeout(session.timeoutId);
  session.timeoutId = setTimeout(() => {
    sessions.delete(guildId);
    console.log(`[알림] ${guildId} 서버의 방치된 세션이 자동 삭제되었습니다.`);
  }, 1000 * 60 * 60); // 1시간
}

export async function refreshAndRebalance(session: any) {
  const playerNames = session.players.map((p: any) => p.nickname);
  const latestPlayers = await prisma.player.findMany({ 
    where: { nickname: { in: playerNames } } 
  });
  
  // 점수 최신화
  session.players = session.players.map((p: any) => {
    const latest = latestPlayers.find((l: any) => l.nickname === p.nickname);
    return latest ? { ...p, score: latest.score } : p;
  });

  // 라인고정 모드일 경우 반드시 라인 순서대로 정렬하여 밸런싱
  if (session.mode === '라인고정') {
    const orderedNames: string[] = [];
    const orderedScores: number[] = [];
    
    POSITIONS.forEach(pos => {
      const p = session.players.filter((x: any) => x.lane === pos);
      if (p[0]) {
        orderedNames.push(p[0].nickname);
        orderedScores.push(p[0].score);
      }
      if (p[1]) {
        orderedNames.push(p[1].nickname);
        orderedScores.push(p[1].score);
      }
    });
    session.combos = laneBalance(orderedNames, orderedScores);
  } else {
    // 자유 모드일 경우 기존 로직 유지
    const scores = session.players.map((p: any) => p.score);
    session.combos = balanceTeams(playerNames, scores);
  }
    
  return session;
}