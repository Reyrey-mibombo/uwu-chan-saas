const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('milestone_effects').setDescription('View milestone effects'),
  async execute(interaction) {
    const embed = new EmbedBuilder().setTitle('🎆 Milestone Effects').setColor(0xffd700);
    await interaction.reply({ embeds: [embed] });
  }
};
