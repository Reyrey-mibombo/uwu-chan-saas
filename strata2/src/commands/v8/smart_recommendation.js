const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('smart_recommendation')
    .setDescription('Get smart activity recommendations')
    .addUserOption(opt => opt.setName('user').setDescription('User to get recommendations for')),
  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const user = await User.findOne({ userId: target.id });

    if (!user) {
      return interaction.reply({ content: 'User not found.', ephemeral: true });
    }

    const recentActivity = await Activity.countDocuments({
      userId: target.id,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    const recommendations = [];
    
    if (user.staff.consistency < 80) {
      recommendations.push('Increase your consistency by maintaining regular activity.');
    }
    if (recentActivity < 10) {
      recommendations.push('Engage more in commands to earn points faster.');
    }
    if (user.staff.shiftTime < 10) {
      recommendations.push('Take more shifts to unlock higher ranks.');
    }
    if (user.staff.reputation < 50) {
      recommendations.push('Help other members to build reputation.');
    }

    if (!recommendations.length) {
      recommendations.push('Keep up the great work! You are on track.');
    }

    const embed = new EmbedBuilder()
      .setColor(0x00FF7F)
      .setTitle(`Recommendations for ${target.tag}`)
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: 'Recent Activity (7d)', value: `${recentActivity}`, inline: true },
        { name: 'Current Points', value: `${user.staff.points}`, inline: true }
      )
      .addFields({ name: 'Recommendations', value: recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n') });

    await interaction.reply({ embeds: [embed] });
  }
};
