const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('engagement_score')
    .setDescription('View engagement score'),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const guild = interaction.guild;

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activities = await Activity.find({ guildId, createdAt: { $gte: weekAgo } });

    const uniqueUsers = new Set(activities.map(a => a.userId)).size;
    const messages = activities.filter(a => a.type === 'message').length;
    const memberCount = guild.memberCount;

    const activeRatio = (uniqueUsers / memberCount) * 100;
    const messageRatio = Math.min(100, (messages / (7 * 100)) * 100);
    const score = Math.round(activeRatio * 0.6 + messageRatio * 0.4);

    const level = score >= 80 ? 'Excellent' :
                  score >= 60 ? 'Good' :
                  score >= 40 ? 'Fair' : 'Low';

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('💫 Engagement Score')
      
      .addFields(
        { name: 'Score', value: `${score}/100`, inline: true },
        { name: 'Level', value: level, inline: true },
        { name: 'Active Users', value: `${uniqueUsers}/${memberCount}`, inline: true },
        { name: 'Messages (7d)', value: messages.toLocaleString(), inline: true }
      )
      ;

    await interaction.reply({ embeds: [embed] });
  }
};
