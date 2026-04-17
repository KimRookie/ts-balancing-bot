import { ModalSubmitInteraction } from 'discord.js';
import { sessions, refreshAndRebalance } from '../lib/utils';
import { buildComboEmbed } from '../lib/embeds';
import prisma from '../lib/db';

export async function handleModal(interaction: ModalSubmitInteraction) {
  
  // 선수 변경 방식 슬래시 커맨드로 변경

  // if (interaction.customId === 'change_player_modal') {
  //   const guildId = interaction.guildId!;
  //   const session = sessions.get(guildId);

  //   if (!session || session.phase !== 'post_match') {
  //     return interaction.reply({ content: '유효한 내전 세션이 없습니다.', ephemeral: true });
  //   }

  //   const outName = interaction.fields.getTextInputValue('out_player');
  //   const inName = interaction.fields.getTextInputValue('in_player');

  //   const outIdx = session.players.findIndex(p => p.nickname === outName);
  //   if (outIdx === -1) {
  //     return interaction.reply({ content: `❌ 현재 내전에 **${outName}** 선수가 없습니다.`, ephemeral: true });
  //   }

  //   const newPlayer = await prisma.player.findUnique({ where: { nickname: inName } });
  //   if (!newPlayer) {
  //     return interaction.reply({ content: `❌ **${inName}** 선수가 등록되어 있지 않습니다.`, ephemeral: true });
  //   }

  //   // 🚨 수정된 부분: discordId를 완전히 제거하고 닉네임과 점수만 할당
  //   session.players[outIdx] = { nickname: newPlayer.nickname, score: newPlayer.score };

  //   session.phase = 'selecting';
  //   await refreshAndRebalance(session);

  //   await interaction.reply({ content: `✅ **${outName}** ➔ **${inName}** 선수 교체 완료!`, components: [] });
  //   await interaction.followUp(buildComboEmbed(session.combos));
  // }
}