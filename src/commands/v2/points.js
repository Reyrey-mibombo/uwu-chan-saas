const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('points')
    .setDescription('Check your points balance')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check (optional)')
        .setRequired(false)),

  async execute(interaction, client) {
    const target = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guildId;

    const user = await User.findOne({ userId: target.id });

    if (!user || !user.staff) {
      return interaction.reply({ 
        content: `${target.username} has not started earning points yet. Use /shift_start to begin!`,
        ephemeral: true 
      });
    }

    const points = user.staff.points || 0;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weekActivities = await Activity.countDocuments({
      guildId,
      userId: target.id,
      type: 'command',
      'data.points',
      createdAt: { $gte: weekAgo }
    });

    const embed = new EmbedBuilder()
      .setTitle(`⭐ Points Balance: ${target.username}`)
      .setThumbnail(target.displayAvatarURL())
      .setColor(0xf1c40f)
      .addFields(
        { name: '💰 Current Points', value: points.toString(), inline: true },
        { name: '📅 This Week', value: `+${weekActivities * 10}`, inline: true },
        { name: '⚡ Consistency', value: `${user.staff.consistency || 100}%`, inline: true }
      )
      .setFooter({ text: 'Use /shift_start and /shift_end to earn more points!' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
