const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('data_insights')
    .setDescription('View data insights'),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const guild = await Guild.findOne({ guildId });

    const embed = new EmbedBuilder()
      .setTitle('📊 Data Insights')
      .setColor(0x3498db)
      .setDescription('Advanced data insights for your server')
      .addFields(
        { name: 'Guild ID', value: guildId, inline: true },
        { name: 'Premium', value: guild?.premium?.isActive ? 'Active' : 'Free', inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  }
};
