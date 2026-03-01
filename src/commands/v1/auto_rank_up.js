const { SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User } = require('../../database/mongo');

const RANK_ORDER = ['trial', 'staff', 'senior', 'manager', 'admin', 'owner'];
const RANK_THRESHOLDS = { trial: 0, staff: 100, senior: 300, manager: 600, admin: 1000, owner: 2000 };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auto_rank_up')
    .setDescription('Show all staff who qualify for an automatic rank-up'),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const users = await User.find({ 'staff.points': { $gt: 0 } }).lean();

      if (!users || !users.length) {
        return interaction.editReply({ embeds: [createErrorEmbed('No staff data available yet.')] });
      }

      const eligible = users
        .map(u => {
          const currentRank = u.staff?.rank || 'trial';
          const points = u.staff?.points || 0;
          const currentIdx = RANK_ORDER.indexOf(currentRank);
          const nextRank = RANK_ORDER[currentIdx + 1];
          if (!nextRank) return null;
          const threshold = RANK_THRESHOLDS[nextRank];
          if (points >= threshold) return { userId: u.userId, username: u.username || 'Unknown', currentRank, nextRank, points, threshold };
          return null;
        })
        .filter(Boolean)
        .sort((a, b) => b.points - a.points);

      if (!eligible.length) {
        return interaction.editReply({ content: '📊 No staff currently qualify for an automatic rank-up. Keep earning points!', ephemeral: true });
      }

      const listText = eligible.map((e, i) =>
        `\`${String(i + 1).padStart(2)}\` **${e.username}** — \`${e.currentRank.toUpperCase()}\` → **\`${e.nextRank.toUpperCase()}\`** (${e.points}/${e.threshold} pts ✅)`
      ).join('\n');

      const embed = createCoolEmbed()
        .setTitle('⬆️ Automatic Rank-Up Eligible Staff')
        .setDescription(listText)
        .addFields(
          { name: '✅ Eligible Count', value: eligible.length.toString(), inline: true },
          { name: '📌 Next Step', value: 'Use `/promote` or `/rank_announce` to officially promote them', inline: true }
        )
        .setColor('success');

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const errEmbed = createErrorEmbed('An error occurred while checking eligible staff.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
