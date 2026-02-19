const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('growth_tracking')
    .setDescription('Track server growth metrics'),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const guild = interaction.guild;

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const thisWeek = await Activity.find({ guildId, createdAt: { $gte: weekAgo } });
    const lastWeek = await Activity.find({ guildId, createdAt: { $gte: twoWeeksAgo, $lt: weekAgo } });

    const thisWeekMessages = thisWeek.filter(a => a.type === 'message').length;
    const lastWeekMessages = lastWeek.filter(a => a.type === 'message').length;

    const newMembers = guild.members.cache.filter(m => m.joinedAt && m.joinedAt >= weekAgo).size;
    const activeUsers = new Set(thisWeek.map(a => a.userId)).size;

    const growth = lastWeekMessages > 0 
      ? ((thisWeekMessages - lastWeekMessages) / lastWeekMessages * 100).toFixed(1)
      : 0;

    const embed = new EmbedBuilder()
      .setTitle('📊 Growth Tracking')
      .setColor(0x3498db)
      .addFields(
        { name: 'New Members (7d)', value: `+${newMembers}`, inline: true },
        { name: 'Messages (7d)', value: thisWeekMessages.toLocaleString(), inline: true },
        { name: 'Active Users', value: activeUsers.toString(), inline: true },
        { name: 'Growth', value: `${growth > 0 ? '+' : ''}${growth}%`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
