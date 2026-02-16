const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Activity, Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recommendation_summary')
    .setDescription('Get personalized recommendations'),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    
    const guild = await Guild.findOne({ guildId });
    const user = await User.findOne({ userId });
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentActivity = await Activity.countDocuments({ guildId, createdAt: { $gte: startDate } });

    const recommendations = [];
    
    if (!guild) {
      recommendations.push('• Run `/setup` to initialize server settings');
    }
    
    if (user && user.staff) {
      if (user.staff.consistency < 80) {
        recommendations.push('• Improve shift consistency to earn more points');
      }
      if (!user.staff.achievements || user.staff.achievements.length < 3) {
        recommendations.push('• Complete achievements to boost reputation');
      }
    }
    
    if (recentActivity < 50) {
      recommendations.push('• Increase server engagement with events');
    }
    
    if (guild && guild.settings?.modules) {
      if (!guild.settings.modules.automation) {
        recommendations.push('• Enable automation modules for better moderation');
      }
      if (!guild.settings.modules.tickets) {
        recommendations.push('• Enable ticket system for better user support');
      }
    }
    
    if (recommendations.length === 0) {
      recommendations.push('• Everything looks great! Keep up the good work');
      recommendations.push('• Consider hosting events to boost engagement');
    }

    const embed = new EmbedBuilder()
      .setTitle('💡 Recommendations')
      .setColor(0xf1c40f)
      .addFields(
        { name: 'Suggestions', value: recommendations.join('\n'), inline: false }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
