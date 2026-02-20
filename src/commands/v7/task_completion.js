const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('task_completion')
    .setDescription('View task completion stats')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(false)),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('✅ Task Completion')
      .addFields(
        { name: 'Completed', value: '145', inline: true },
        { name: 'Pending', value: '12', inline: true },
        { name: 'Rate', value: '92%', inline: true }
      )
      .setColor('#2ecc71');
    
    await interaction.reply({ embeds: [embed] });
  }
};
