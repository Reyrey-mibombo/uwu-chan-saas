const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('visual_feedback')
    .setDescription('View visual feedback on activity')
    .addUserOption(opt => opt.setName('user').setDescription('User to check feedback for')),
  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const userId = target.id;
    const guildId = interaction.guildId;

    const recentActivity = await Activity.countDocuments({
      userId,
      guildId,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    const totalActivity = await Activity.countDocuments({ userId, guildId });

    let feedback = '🟢 Excellent';
    if (recentActivity < 5) feedback = '🔴 Needs Improvement';
    else if (recentActivity < 15) feedback = '🟡 Average';
    else if (recentActivity < 30) feedback = '🟢 Good';

    const embed = new EmbedBuilder()
      .setColor(recentActivity < 5 ? 0xFF0000 : recentActivity < 15 ? 0xFFD700 : 0x00FF00)
      .setTitle(`Activity Feedback - ${target.tag}`)
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: 'Status', value: feedback },
        { name: 'This Week', value: `${recentActivity} activities`, inline: true },
        { name: 'All Time', value: `${totalActivity} activities`, inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  }
};
