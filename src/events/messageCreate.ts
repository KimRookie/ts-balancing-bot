import { Events, Message } from 'discord.js';

module.exports = {
  name: Events.MessageCreate,
  async execute(message: Message) {
    // 이제 일반 채팅을 감지하여 선수를 등록하는 기능은 사용하지 않습니다.
    // 추후 다른 채팅 감지 기능이 필요할 때 이곳을 활용하세요.
    return;
  },
};



// import { Events, Message } from 'discord.js';
// import prisma from '../lib/db';
// import { tierToScore, scoreToTierLabel } from '../lib/tierScore';

// module.exports = {
//   name: Events.MessageCreate,

//   async execute(message: Message) {
//     if (message.author.bot) return;

//     // $닉네임 티어 형식 감지
//     if (!message.content.startsWith('$')) return;

//     const parts = message.content.trim().split(/\s+/);
//     if (parts.length !== 2) {
//       return message.reply('올바른 형식으로 입력해 주세요. *(예: `$김솬 골2`)*');
//     }

//     const nickname = parts[0].slice(1); // $ 제거
//     const tier     = parts[1];
//     const score    = tierToScore(tier);

//     if (score === 5 && !['아', '브'].includes(tier[0])) {
//       return message.reply(
//         `⚠️ 티어를 인식하지 못했습니다. 다시 입력해 주세요.\n` +
//         `*(예: 실2, 골1, 플4, 에3, 다2, 마200, 그마500)*`
//       );
//     }

//     try {
//       const existing = await prisma.player.findUnique({ where: { nickname } });

//       if (existing) {
//         // 이미 있는 닉네임이면 수정
//         const updated = await prisma.player.update({
//           where: { nickname },
//           data: { score, discordId: message.author.id },
//         });
//         await message.reply(
//           `✅ **${nickname}** 선수 정보가 수정되었습니다.\n` +
//           `점수: **${updated.score}점** (${scoreToTierLabel(updated.score)})`
//         );
//       } else {
//         // 신규 등록
//         const created = await prisma.player.create({
//           data: { discordId: message.author.id, nickname, score },
//         });
//         await message.reply(
//           `✅ **${nickname}** 선수가 등록되었습니다!\n` +
//           `초기 점수: **${created.score}점** (${scoreToTierLabel(created.score)})`
//         );
//       }
//     } catch (err: any) {
//       // discordId 중복: 다른 닉네임으로 이미 등록된 경우
//       if (err.code === 'P2002') {
//         const mine = await prisma.player.findUnique({ where: { discordId: message.author.id } });
//         await message.reply(
//           `이미 **${mine?.nickname}** 으로 등록되어 있습니다.\n` +
//           `닉네임을 바꾸려면 기존 닉네임으로 다시 입력해 주세요. *(예: \`$${mine?.nickname} 새티어\`)*`
//         );
//       } else {
//         console.error(err);
//         await message.reply('오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
//       }
//     }
//   },
// };
