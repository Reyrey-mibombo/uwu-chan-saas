const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('points')
    .setDescription('Check your current points balance within this server')
    .addUserOption(opt => opt.setName('user').setDescription('User to check (Optional)').setRequired(false)),

  async execute(interaction, client) {
    try {
      await interaction.deferReply();
      const user = interaction.options.getUser('user') || interaction.user;
      const staffSystem = client.systems.staff;

      if (!staffSystem) {
        return interaction.editReply({ embeds: [createErrorEmbed('Staff system is offline.')] });
      }

      const userPoints = await staffSystem.getPoints(user.id, interaction.guildId);
      const rank = await staffSystem.getRank(user.id, interaction.guildId);

      // Calculate progress to next rank for a "Cool feature"
      const { RANK_THRESHOLDS, RANK_ORDER } = require('./progress_tracker');
      const currentIndex = RANK_ORDER.indexOf(rank.toLowerCase());
      const nextRank = RANK_ORDER[currentIndex + 1];
      const nextThreshold = nextRank ? RANK_THRESHOLDS[nextRank] : null;

      let progressText = '🏆 **MAX RANK ACHIEVED**';
      if (nextThreshold) {
        const remaining = nextThreshold - userPoints;
        const percent = Math.min(100, Math.floor((userPoints / nextThreshold) * 100));
        progressText = `📈 **${percent}%** to \`${nextRank.toUpperCase()}\` (Needs ${remaining} more)`;
      }

      const embed = await createCustomEmbed(interaction, {
        title: `👤 Personnel Economy: ${user.username}`,
        thumbnail: user.displayAvatarURL({ dynamic: true }),
        description: `Detailed economic telemetry for <@${user.id}> within the **${interaction.guild.name}** sector.`,
        fields: [
          { name: '⭐ Total Points', value: `\`${userPoints.toLocaleString()}\``, inline: true },
          { name: '🏆 Current Rank', value: `\`${rank.toUpperCase()}\``, inline: true },
          { name: '📊 Progression', value: progressText, inline: false }
        ],
        color: userPoints > 500 ? 'premium' : 'primary'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Points Command Error:', error);
      const errEmbed = createErrorEmbed('An error occurred while fetching points balance.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
