const { SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User } = require('../../database/mongo');

const RANK_THRESHOLDS = { trial: 0, staff: 100, senior: 300, manager: 600, admin: 1000, owner: 2000 };
const RANK_ORDER = ['trial', 'staff', 'senior', 'manager', 'admin', 'owner'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('progress_tracker')
    .setDescription('Track your progress toward the next rank')
    .addUserOption(opt => opt.setName('user').setDescription('User to track').setRequired(false)),

  async execute(interaction, client) {
    try {
      await interaction.deferReply();
      const target = interaction.options.getUser('user') || interaction.user;
      const user = await User.findOne({ userId: target.id, 'guilds.guildId': interaction.guildId }).lean();

      if (!user) {
        return interaction.editReply({ embeds: [createErrorEmbed(`No local data found for **${target.username}**. Database entry missing for this sector.`)] });
      }

      const points = user.staff?.points || 0;
      const consistency = user.staff?.consistency || 100;
      const rank = user.staff?.rank || 'trial';
      const rankIdx = RANK_ORDER.indexOf(rank);
      const nextRank = RANK_ORDER[rankIdx + 1];

      if (!nextRank) {
        const embed = await createCustomEmbed(interaction, {
          title: `👑 Progression Limit Reached — ${target.username}`,
          thumbnail: target.displayAvatarURL({ dynamic: true }),
          description: '🏆 **Apex Status Achieved.** You have reached the maximum rank within the current hierarchical structure.',
          fields: [
            { name: '🎖️ Current Tier', value: `\`${rank.toUpperCase()}\``, inline: true },
            { name: '⭐ Lifetime Points', value: `\`${points.toLocaleString()}\``, inline: true }
          ],
          color: 'enterprise'
        });
        return interaction.editReply({ embeds: [embed] });
      }

      const currentThreshold = RANK_THRESHOLDS[rank] || 0;
      const nextThreshold = RANK_THRESHOLDS[nextRank];
      const progress = Math.min(100, Math.round(((points - currentThreshold) / (nextThreshold - currentThreshold)) * 100));
      const needed = Math.max(0, nextThreshold - points);
      const barFilled = Math.min(10, Math.round(progress / 10));
      const bar = '█'.repeat(barFilled) + '░'.repeat(10 - barFilled);

      const embed = await createCustomEmbed(interaction, {
        title: `📈 Progression Telemetry — ${target.username}`,
        thumbnail: target.displayAvatarURL({ dynamic: true }),
        fields: [
          { name: '🎖️ Current Tier', value: `\`${rank.toUpperCase()}\``, inline: true },
          { name: '⬆️ Next Objective', value: `\`${nextRank.toUpperCase()}\``, inline: true },
          { name: '⭐ Points Delta', value: `\`${points.toLocaleString()}\` / \`${nextThreshold.toLocaleString()}\``, inline: true },
          { name: '📊 Efficiency Bar', value: `\`${bar}\` **${progress}%**\nNeed **${needed.toLocaleString()}** additional points to finalize rank-up.`, inline: false },
          { name: '📈 Reliability', value: `\`${consistency}%\``, inline: true },
          { name: '🏅 Merits', value: `\`${user.staff?.achievements?.length || 0}\``, inline: true }
        ]
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const errEmbed = createErrorEmbed('An error occurred while tracking progress.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
