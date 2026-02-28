const { SlashCommandBuilder } = require('discord.js');
const { createPremiumEmbed } = require('../../utils/embeds');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('data_insights')
    .setDescription('View data insights'),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const guild = await Guild.findOne({ guildId });

    const embed = createPremiumEmbed()
      .setTitle('📊 Data Insights')
      
      .setDescription('Advanced data insights for your server')
      .addFields(
        { name: 'Guild ID', value: guildId, inline: true },
        { name: 'Premium', value: guild?.premium?.isActive ? 'Active' : 'Free', inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  }
};



