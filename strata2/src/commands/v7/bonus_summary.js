const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bonus_summary')
    .setDescription('View your bonus summary')
    .addUserOption(opt => opt.setName('user').setDescription('User to view (optional)')),
  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    
    const user = await User.findOne({ userId: targetUser.id });
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const bonusActivities = await Activity.find({
      userId: targetUser.id,
      type: 'reward',
      'data.bonus': true,
      createdAt: { $gte: since }
    });

    const totalBonus = bonusActivities.reduce((sum, a) => sum + (a.data?.points || 0), 0);
    const dailyClaims = bonusActivities.filter(a => a.data?.bonusType === 'daily').length;
    const weeklyClaims = bonusActivities.filter(a => a.data?.bonusType === 'weekly').length;

    const embed = new EmbedBuilder()
      .setTitle('💰 Bonus Summary')
      .setColor(0xf39c12)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: 'Total Bonus Points', value: `${totalBonus}`, inline: true },
        { name: 'Daily Bonuses Claimed', value: `${dailyClaims}`, inline: true },
        { name: 'Weekly Bonuses Claimed', value: `${weeklyClaims}`, inline: true },
        { name: 'Total Staff Points', value: `${user?.staff?.points || 0}`, inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  }
};
