import { Client, Events, ActivityType } from 'discord.js';

module.exports = {
  name: Events.ClientReady,
  once: true,

  execute(client: Client) {
    console.log(`\n🤖 ${client.user?.tag} 준비 완료!`);
    console.log(`   서버 수: ${client.guilds.cache.size}개\n`);

    client.user?.setPresence({
      activities: [{ name: '/내전시작 | /선수등록', type: ActivityType.Playing }],
      status: 'online',
    });
  },
};
