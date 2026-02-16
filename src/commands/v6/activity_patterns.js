const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity_patterns')
    .setDescription('View activity patterns for this server')
    .addIntegerOption(opt =>
      opt.setName('days')
        .setDescription('Number of days to analyze (7-90)')
        .setMinValue(7)
        .setMaxValue(90)
        .setRequired(false) // optional, default handled in code
    ),

  async execute(interaction) {
    try {
      const guildId = interaction.guildId;
      const days = interaction.options.getInteger('days') ?? 30;

      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const activities = await Activity.find({
        guildId,
        createdAt: { $gte: startDate }
      });

      const hourlyActivity = Array(24).fill(0);

      activities.forEach(act => {
        const hour = act.createdAt.getHours();
        hourlyActivity[hour]++;
      });

      const embed = new EmbedBuilder()
        .setTitle('⏰ Activity Patterns')
        .setColor(0x2ecc71)
        .setDescription(
          hourlyActivity.map((count, hour) => `Hour ${hour}: ${count} activities`).join('\n')
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in activity_patterns command:', error);
      if (!interaction.replied) {
        await interaction.reply({
          content: 'Something went wrong while fetching activity patterns.',
          ephemeral: true
        });
      }
    }
  }
};