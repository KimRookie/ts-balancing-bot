import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { sessions, GameMode } from '../lib/utils';
import { buildJoinEmbed } from '../lib/embeds';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('내전시작')
    .setDescription('내전을 시작합니다')
    .addStringOption(opt =>
      opt.setName('모드')
        .setDescription('내전 모드를 선택하세요')
        .setRequired(true)
        .addChoices(
          { name: '밸런스', value: '밸런스' },
          { name: '라인고정', value: '라인고정' },
          { name: '칼바람', value: '칼바람' },
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId!;
    const mode = interaction.options.getString('모드', true) as GameMode;

    if (sessions.has(guildId)) {
      return interaction.reply({
        content: '이미 진행 중인 내전이 있습니다. `/내전취소`로 먼저 종료해 주세요.',
        ephemeral: true,
      });
    }

    const session: any = {
      guildId,
      channelId: interaction.channelId,
      mode,
      players: [],
      combos: [],
      phase: 'joining',
    };

    sessions.set(guildId, session);

    // 🚨 수정된 부분: 메시지를 먼저 보내고, 확실하게 fetchReply로 ID를 가져옵니다.
    await interaction.reply(buildJoinEmbed(session));
    const message = await interaction.fetchReply();
    session.messageId = message.id;
  },
};