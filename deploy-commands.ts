import { REST, Routes } from 'discord.js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const commands: object[] = [];
// commands 폴더 경로 (현재 파일 기준 src/commands)
const commandsPath = path.join(__dirname, 'src', 'commands');

for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.ts') || f.endsWith('.js'))) {
  const filePath = path.join(commandsPath, file);
  const mod = require(filePath);

  // 1. 파일 내에 여러 명령어가 export된 경우 (예: 수동관리.ts)
  const cmds = Object.values(mod).filter((v: any) => v?.data?.name && v?.execute);
  
  // 2. 단일 파일로 하나의 명령어만 export된 경우 (예: 내전.ts, 더미.ts)
  if (mod.data && mod.execute && !cmds.includes(mod)) {
    cmds.unshift(mod);
  }

  // 찾아낸 모든 커맨드를 배열에 담습니다.
  for (const cmd of cmds as any[]) {
    commands.push(cmd.data.toJSON());
    console.log(`📦 커맨드 인식 완료: /${cmd.data.name}`);
  }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN!);
const clientId = process.env.CLIENT_ID!;
const guildId  = process.env.GUILD_ID;

(async () => {
  try {
    console.log(`\n🔄 총 ${commands.length}개의 커맨드를 디스코드에 등록합니다...`);
    
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      console.log('✅ 서버 등록 완료 (즉시 반영)');
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      console.log('✅ 글로벌 등록 완료 (최대 1시간 소요)');
    }
  } catch (err) {
    console.error('❌ 등록 실패:', err);
  }
})();