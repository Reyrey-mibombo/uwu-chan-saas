const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Alert } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('alerts_dashboard')
    .setDescription('View alerts dashboard for the server')
    .addIntegerOption(opt =>
      opt.setName('days')
        .setDescription('Number of days to display alerts (1-30)')
        .setMinValue(1)
        .setMaxValue(30)
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      const guildId = interaction.guildId;
      const days = interaction.options.getInteger('days') ?? 7;

      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const alerts = await Alert.find({ guildId, createdAt: { $gte: startDate } });

      const embed = new EmbedBuilder()
        .setTitle('🚨 Alerts Dashboard')
        .setColor(0xe74c3c)
        .setDescription(alerts.length > 0 ? alerts.map(a => `• ${a.message}`).join('\n') : 'No alerts in this period.')
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in alerts_dashboard command:', error);
      if (!interaction.replied) {
        await interaction.reply({ content: 'Something went wrong while fetching alerts.', ephemeral: true });
      }
    }
  }
};