const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('progress_notify')
    .setDescription('Send progress notification to user')
    .addUserOption(opt => opt.setName('user').setDescription('User to notify'))
    .addStringOption(opt => opt.setName('message').setDescription('Custom message (optional)')),
  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const customMessage = interaction.options.getString('message');
    const guildId = interaction.guild.id;

    if (!targetUser) {
      return interaction.reply('Please specify a user to notify.');
    }

    const query = { guildId, userId: targetUser.id };
    const activities = await Activity.find(query).sort({ createdAt: -1 });

    const recentActivity = activities.slice(0, 7);
    const weeklyCount = recentActivity.length;

    const pointsGained = recentActivity.reduce((sum, a) => sum + (a.data?.points || 0), 0);

    const user = await interaction.client.users.fetch(targetUser.id).catch(() => null);

    const embed = new EmbedBuilder()
      .setTitle('📢 Progress Update')
      .setColor(0x3498db)
      .setDescription(customMessage || `Here's your recent progress update!`)
      .addFields(
        { name: 'Weekly Activity', value: `${weeklyCount} actions`, inline: true },
        { name: 'Points Earned', value: `${pointsGained}`, inline: true }
      )
      .setFooter({ text: `Server: ${interaction.guild.name}` })
      .setTimestamp();

    if (user) {
      try {
        await user.send({ embeds: [embed] });
        await interaction.reply({ content: `✅ Progress notification sent to ${targetUser.username}!`, ephemeral: true });
      } catch {
        await interaction.reply({ content: `⚠️ Could not DM user. Showing publicly instead:`, embeds: [embed] });
      }
    } else {
      await interaction.reply({ embeds: [embed] });
    }

    await Activity.create({
      guildId,
      userId: interaction.user.id,
      type: 'notification',
      data: { targetUserId: targetUser.id, action: 'progress_notify', customMessage }
    });
  }
};
