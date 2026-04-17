import { Events, Interaction, Collection } from 'discord.js';
import { handleButton } from '../handlers/buttonHandler';
import { handleModal } from '../handlers/modalHandler';

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction: Interaction, client: any) {
    // ── 자동완성(Autocomplete) 인터랙션 ───────
    if (interaction.isAutocomplete()) {
      const commands: Collection<string, any> = client.commands;
      const command = commands.get(interaction.commandName);
      if (!command) return;

      try {
        if (command.autocomplete) {
          await command.autocomplete(interaction);
        }
      } catch (err) {
        console.error(`자동완성 오류 (/${interaction.commandName}):`, err);
      }
      return;
    }

    // ── 모달(팝업) 인터랙션 ────────
    if (interaction.isModalSubmit()) {
      try {
        await handleModal(interaction);
      } catch (err) {
        console.error('모달 처리 오류:', err);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '처리 중 오류가 발생했습니다.', ephemeral: true });
        }
      }
      return;
    }

    // ── 버튼 인터랙션 ─────────────────────────
    if (interaction.isButton()) {
      try {
        await handleButton(interaction);
      } catch (err) {
        console.error('버튼 처리 오류:', err);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '처리 중 오류가 발생했습니다.', ephemeral: true });
        }
      }
      return;
    }

    // ── 슬래시 커맨드 ─────────────────────────
    if (!interaction.isChatInputCommand()) return;

    const commands: Collection<string, any> = client.commands;
    const command = commands.get(interaction.commandName);

    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(`커맨드 오류 (/${interaction.commandName}):`, err);
      const msg = { content: '커맨드 실행 중 오류가 발생했습니다.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(msg);
      } else {
        await interaction.reply(msg);
      }
    }
  },
};