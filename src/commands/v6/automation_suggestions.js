const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automation_suggestions')
    .setDescription('Get automation suggestions'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🤖 Automation Suggestions')
      .setDescription('Recommended automations:')
      .addFields(
        { name: '1.', value: 'Auto-welcome new members', inline: false },
        { name: '2.', value: 'Daily activity reminders', inline: false },
        { name: '3.', value: 'Auto-role assignment', inline: false }
      )
      .setColor('#3498db');
    
    await interaction.reply({ embeds: [embed] });
  }
};
