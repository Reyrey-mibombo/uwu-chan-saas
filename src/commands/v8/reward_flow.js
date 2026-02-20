const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reward_flow')
    .setDescription('View reward flow'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('💫 Reward Flow')
      .setDescription('Points → Badges → Ranks → Elite\n[████████░░] 80% to Elite')
      .setColor('#9b59b6');
    
    await interaction.reply({ embeds: [embed] });
  }
};
