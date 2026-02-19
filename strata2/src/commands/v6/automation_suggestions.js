const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automation_suggestions')
    .setDescription('Get automation suggestions based on activity'),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const activities = await Activity.find({ guildId, createdAt: { $gte: startDate } });
    const users = await User.find({ 'guilds.guildId': guildId });
    
    const typeCounts = {};
    activities.forEach(act => {
      typeCounts[act.type] = (typeCounts[act.type] || 0) + 1;
    });

    const suggestions = [];
    
    if (typeCounts.warning > 10) {
      suggestions.push('• Set up automated warning system with custom thresholds');
    }
    if (typeCounts.message && typeCounts.message > 100) {
      suggestions.push('• Enable auto-response for common phrases');
    }
    if (users.length > 50 && (!typeCounts.promotion || typeCounts.promotion < 5)) {
      suggestions.push('• Create automatic role promotion system');
    }
    if (typeCounts.shift && typeCounts.shift > 20) {
      suggestions.push('• Enable shift tracking automation');
    }
    if (suggestions.length === 0) {
      suggestions.push('• Continue manual monitoring - patterns not yet detected');
      suggestions.push('• Enable more activity tracking modules');
    }

    const embed = new EmbedBuilder()
      .setTitle('🤖 Automation Suggestions')
      .setColor(0x1abc9c)
      .addFields(
        { name: 'Suggestions', value: suggestions.join('\n'), inline: false },
        { name: 'Analyzed', value: `${activities.length} activities, ${users.length} users`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
