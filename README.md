# LoL 내전 밸런싱 봇 v2

TypeScript + discord.js v14 + Prisma (SQLite) 기반 내전 밸런싱 봇

---

## 빠른 시작

### 1. 패키지 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env.example`을 복사해서 `.env` 파일을 만들고 값을 채워주세요.
```bash
cp .env.example .env
```

```env
DISCORD_TOKEN=여기에_봇_토큰
CLIENT_ID=여기에_애플리케이션_ID
GUILD_ID=여기에_서버_ID        # 개발용 (즉시 반영), 배포 시 삭제
DATABASE_URL="file:./dev.db"
```

### 3. DB 초기화 (최초 1회)
```bash
npm run db:generate   # Prisma 클라이언트 생성
npm run db:migrate    # DB 파일 생성 + 테이블 생성
```

### 4. 슬래시 커맨드 Discord 등록
```bash
npm run deploy
```

### 5. 봇 실행
```bash
npm run dev     # 개발용 (ts-node)
npm run build   # 빌드
npm start       # 빌드 후 실행
```

---

## 사용법

### 선수 등록 / 수정
채팅창에 메시지 입력 (기존 방식 그대로):
```
$닉네임 티어
```
예시: `$김솬 골2`, `$홍길동 에1`, `$프로게이머 마200`

### 내전 진행 순서
1. `/내전시작` → 모드 선택 (밸런스 / 라인고정 / 칼바람)
2. 참가자들이 **참가 신청** 버튼 클릭 (10명 모일 때까지)
3. 팀 조합 목록에서 원하는 조합 선택 (또는 🎲 주사위)
4. 경기 후 이긴 팀 **승리** 버튼 클릭 → 자동 점수 반영

### 기타 커맨드
| 커맨드 | 설명 |
|--------|------|
| `/랭킹` | 점수 TOP 10 조회 |
| `/전적 [닉네임]` | 개인 전적 조회 |
| `/내전취소` | 진행 중인 내전 취소 |
| `/점수초기화 [닉네임]` | 점수 초기화 (관리자 전용) |

---

## 파일 구조
```
src/
├── commands/
│   ├── 내전.ts          # /내전시작, /내전취소
│   └── register.ts      # /랭킹, /전적, /점수초기화
├── events/
│   ├── ready.ts
│   ├── interactionCreate.ts
│   └── messageCreate.ts  # $닉네임 티어 등록 처리
├── handlers/
│   └── buttonHandler.ts  # 버튼 인터랙션 전담
├── lib/
│   ├── balancing.ts      # 밸런싱 알고리즘
│   ├── db.ts             # Prisma 싱글톤
│   ├── embeds.ts         # Embed/버튼 생성 헬퍼
│   ├── tierScore.ts      # 티어 ↔ 점수 변환
│   └── utils.ts          # 세션 상태 관리
└── index.ts
prisma/
└── schema.prisma
deploy-commands.ts
```

---

## DB 관리
```bash
npm run db:studio   # 브라우저로 DB 직접 조회/수정
```
