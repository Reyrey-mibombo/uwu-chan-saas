const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bonus_points')
    .setDescription('View bonus point opportunities')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check')
        .setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guildId;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const user = await User.findOne({ userId: target.id });

    if (!user || !user.staff) {
      return interaction.reply({ 
        content: `${target.username} has not started earning points yet.`,
        ephemeral: true 
      });
    }

    const bonusActivities = await Activity.find({
      guildId,
      userId: target.id,
      'data.bonus': true,
      createdAt: { $gte: weekAgo }
    });

    const totalBonus = bonusActivities.reduce((sum, a) => sum + (a.data.bonusPoints || 0), 0);
    const points = user.staff.points || 0;

    const bonusOpportunities = [
      { name: 'Complete a shift (2h+)', points: 50 },
      { name: 'Help other staff members', points: 25 },
      { name: 'Report bugs/issues', points: 30 },
      { name: 'Complete training', points: 100 },
      { name: 'Perfect attendance week', points: 75 }
    ];

    const embed = new EmbedBuilder()
      .setTitle(`⭐ Bonus Points: ${target.username}`)
      .setThumbnail(target.displayAvatarURL())
      .setColor(0xf1c40f)
      .addFields(
        { name: 'Total Points', value: points.toString(), inline: true },
        { name: 'Bonus Earned (7d)', value: totalBonus.toString(), inline: true },
        { name: 'Bonus Activities', value: bonusActivities.length.toString(), inline: true }
      )
      .addFields({ name: 'Available Opportunities', value: bonusOpportunities.map(b => `• ${b.name}: +${b.points}`).join('\n'), inline: false })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
