import { Events, Guild, Client } from 'discord.js';

module.exports = {
  name: Events.GuildCreate,

  async execute(guild: Guild, client: Client) {
    console.log(`🎉 새 서버에 초대됨: ${guild.name} (${guild.id})`);
    const commands = (client as any).commands;
    if (!commands) return;

    try {
      const body = Array.from(commands.values()).map((c: any) => c.data.toJSON());
      await guild.commands.set(body);
      console.log(`✅ [${guild.name}] 새 서버 슬래시 커맨드 즉시 등록 완료!`);
    } catch (err) {
      console.error(`❌ [${guild.name}] 새 서버 커맨드 등록 실패:`, err);
    }
  },
};
