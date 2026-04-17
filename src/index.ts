import { Client, GatewayIntentBits, Collection } from 'discord.js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import prisma from './lib/db';

dotenv.config();

export interface Command {
  data: { name: string; toJSON: () => object };
  execute: (interaction: any) => Promise<void>;
}

// ── 클라이언트 생성 ───────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

(client as any).commands = new Collection<string, Command>();

// ── 커맨드 로드 ──────────────────────────────
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.ts') || f.endsWith('.js'))) {
  const mod = require(path.join(commandsPath, file));

  // 단일 export 또는 named export 모두 처리
  const cmds = Object.values(mod).filter((v: any) => v?.data?.name && v?.execute);
  if ((mod as any).data && (mod as any).execute) cmds.unshift(mod);

  for (const cmd of cmds as Command[]) {
    (client as any).commands.set(cmd.data.name, cmd);
    console.log(`✅ 커맨드: /${cmd.data.name}`);
  }
}

// ── 이벤트 로드 ──────────────────────────────
const eventsPath = path.join(__dirname, 'events');
for (const file of fs.readdirSync(eventsPath).filter(f => f.endsWith('.ts') || f.endsWith('.js'))) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args: any[]) => event.execute(...args));
  } else {
    client.on(event.name, (...args: any[]) => event.execute(...args, client));
  }
  console.log(`✅ 이벤트: ${event.name}`);
}

// ── 종료 시 DB 연결 해제 ─────────────────────
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// ── 로그인 ───────────────────────────────────
const token = process.env.DISCORD_TOKEN;
if (!token) { console.error('❌ DISCORD_TOKEN 없음'); process.exit(1); }

client.login(token);
