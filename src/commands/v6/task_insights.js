const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('task_insights')
    .setDescription('Get task insights'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('💡 Task Insights')
      .setDescription('Task analytics:')
      .addFields(
        { name: 'Completed', value: '145', inline: true },
        { name: 'In Progress', value: '23', inline: true },
        { name: 'Avg. Time', value: '15min', inline: true }
      )
      .setColor('#9b59b6');
    
    await interaction.reply({ embeds: [embed] });
  }
};
