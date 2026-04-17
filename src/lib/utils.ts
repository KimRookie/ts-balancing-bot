import prisma from './db';
import { balanceTeams, laneBalance } from './balancing';

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

export async function refreshAndRebalance(session: GameSession) {
  const playerNames = session.players.map(p => p.nickname);
  const latestPlayers = await prisma.player.findMany({ 
    where: { nickname: { in: playerNames } } 
  });
  
  session.players = session.players.map(p => {
    const latest = latestPlayers.find(l => l.nickname === p.nickname);
    return latest ? { ...p, score: latest.score } : p;
  });

  const scores = session.players.map(p => p.score);
  
  session.combos = session.mode === '라인고정' 
    ? laneBalance(playerNames, scores) // (참고: 버튼 핸들러에서 이미 라인 순서대로 배열을 정렬해둠)
    : balanceTeams(playerNames, scores);
    
  return session;
}