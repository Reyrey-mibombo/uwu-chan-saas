const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank_summary')
    .setDescription('View rank summary')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(false)),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('⬆️ Rank Summary')
      .addFields(
        { name: 'Current Rank', value: 'Senior Staff', inline: true },
        { name: 'Next Rank', value: 'Lead Staff', inline: true },
        { name: 'Progress', value: '65%', inline: true }
      )
      .setColor('#f39c12');
    
    await interaction.reply({ embeds: [embed] });
  }
};
