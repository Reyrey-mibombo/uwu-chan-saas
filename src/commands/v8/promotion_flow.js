const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promotion_flow')
    .setDescription('View promotion flow'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('⬆️ Promotion Flow')
      .setDescription('Staff → Senior → Lead → Manager\n[████████░░] 80% to Lead')
      .setColor('#f39c12');
    
    await interaction.reply({ embeds: [embed] });
  }
};
