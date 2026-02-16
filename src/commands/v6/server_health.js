const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild, User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server_health')
    .setDescription('Check server health status'),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const guild = interaction.guild;
    
    const dbGuild = await Guild.findOne({ guildId });
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentActivity = await Activity.countDocuments({ guildId, createdAt: { $gte: startDate } });
    const users = await User.find({ 'guilds.guildId': guildId });
    const staff = users.filter(u => u.staff?.rank && u.staff.rank !== 'member');

    let healthScore = 50;
    const issues = [];
    const positives = [];

    if (dbGuild) {
      healthScore += 20;
      positives.push('Database configured');
    } else {
      issues.push('Server not registered in database');
    }

    if (recentActivity > 50) {
      healthScore += 15;
      positives.push('Active engagement');
    } else if (recentActivity < 10) {
      healthScore -= 10;
      issues.push('Low recent activity');
    }

    if (staff.length >= 3) {
      healthScore += 15;
      positives.push('Adequate staff coverage');
    } else if (staff.length < 1) {
      healthScore -= 20;
      issues.push('No staff members');
    }

    if (dbGuild?.premium?.isActive) {
      healthScore += 10;
      positives.push('Premium active');
    }

    healthScore = Math.max(0, Math.min(100, healthScore));
    const healthStatus = healthScore >= 70 ? '✅ Good' : healthScore >= 40 ? '⚠️ Fair' : '❌ Poor';

    const embed = new EmbedBuilder()
      .setTitle('💊 Server Health')
      .setColor(healthScore >= 70 ? 0x2ecc71 : healthScore >= 40 ? 0xf39c12 : 0xe74c3c)
      .addFields(
        { name: 'Health Status', value: healthStatus, inline: true },
        { name: 'Health Score', value: `${healthScore}/100`, inline: true },
        { name: 'Members', value: guild?.memberCount?.toString() || 'N/A', inline: true },
        { name: 'Staff Count', value: staff.length.toString(), inline: true },
        { name: '7-Day Activity', value: recentActivity.toString(), inline: true },
        { name: 'Positives', value: positives.length > 0 ? positives.join('\n') : 'None', inline: false },
        { name: 'Issues', value: issues.length > 0 ? issues.join('\n') : 'None', inline: false }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
