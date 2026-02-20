const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('consistency')
    .setDescription('Check staff consistency score')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(false)),

  async execute(interaction, client) {
    const user = interaction.options.getUser('user') || interaction.user;
    const staffSystem = client.systems.staff;
    
    const consistency = await staffSystem.updateConsistency(user.id, interaction.guildId);
    
    let trend = '→ Stable';
    if (consistency >= 80) trend = '↑ Improving';
    else if (consistency < 50) trend = '↓ Declining';
    
    const embed = new EmbedBuilder()
      .setTitle(`📊 ${user.username}'s Consistency`)
      .addFields(
        { name: 'Score', value: `${consistency}%`, inline: true },
        { name: 'Trend', value: trend, inline: true }
      )
      .setColor(consistency >= 70 ? '#2ecc71' : '#e74c3c');

    await interaction.reply({ embeds: [embed] });
  }
};
