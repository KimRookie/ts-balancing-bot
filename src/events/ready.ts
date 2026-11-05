import { Client, Events, ActivityType } from 'discord.js';

module.exports = {
  name: Events.ClientReady,
  once: true,

  async execute(client: Client) {
    console.log(`\n🤖 ${client.user?.tag} 준비 완료!`);
    console.log(`   서버 수: ${client.guilds.cache.size}개\n`);

    client.user?.setPresence({
      activities: [{ name: '/내전시작 | /선수등록', type: ActivityType.Playing }],
      status: 'online',
    });

    // 시작 시 참여 중인 모든 서버에 슬래시 커맨드 자동 동기화
    const commands = (client as any).commands;
    if (commands) {
      const body = Array.from(commands.values()).map((c: any) => c.data.toJSON());
      for (const guild of client.guilds.cache.values()) {
        try {
          await guild.commands.set(body);
          console.log(`✅ [${guild.name}] 슬래시 커맨드 동기화 완료`);
        } catch (err) {
          console.error(`❌ [${guild.name}] 커맨드 동기화 실패:`, err);
        }
      }
    }
  },
};
