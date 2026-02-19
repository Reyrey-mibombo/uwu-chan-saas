const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bonus_tracker')
    .setDescription('Track your bonus points')
    .addUserOption(opt => opt.setName('user').setDescription('User to view (optional)')),
  async execute(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const user = await User.findOne({ userId: targetUser.id });

    const bonusPoints = user?.staff?.bonusPoints || 0;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const bonusActivities = await Activity.find({
      userId: targetUser.id,
      type: 'bonus',
      createdAt: { $gte: startDate }
    }).sort({ createdAt: -1 }).limit(5);

    const embed = new EmbedBuilder()
      .setTitle('💰 Bonus Tracker')
      .setColor(0xe67e22)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: 'User', value: targetUser.username, inline: true },
        { name: 'Total Bonus Points', value: `${bonusPoints}`, inline: true }
      );

    if (bonusActivities.length > 0) {
      const recentList = bonusActivities.map(a => 
        `+${a.data?.points || 0}: ${a.data?.reason || 'Bonus'}`
      ).join('\n');
      embed.addFields({ name: 'Recent Bonuses', value: recentList, inline: false });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
