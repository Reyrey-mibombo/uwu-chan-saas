const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promotion_requirements')
    .setDescription('View promotion requirements'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📋 Promotion Requirements')
      .addFields(
        { name: 'Staff → Senior', value: '100 points + 50 shifts', inline: false },
        { name: 'Senior → Lead', value: '250 points + 100 shifts', inline: false },
        { name: 'Lead → Manager', value: '500 points + 200 shifts', inline: false }
      )
      .setColor('#9b59b6');
    
    await interaction.reply({ embeds: [embed] });
  }
};
