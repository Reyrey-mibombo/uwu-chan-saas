const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automation_tips')
    .setDescription('Get automation tips and best practices'),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const recentActivity = await Activity.countDocuments({ guildId, createdAt: { $gte: startDate } });
    const totalActivity = await Activity.countDocuments({ guildId });

    const tips = [
      '• Use `/automation_suggestions` to get personalized automation ideas',
      '• Set up auto-roles for new members to improve engagement',
      '• Configure welcome messages to make members feel valued',
      '• Enable mod channel alerts for important events',
      '• Use shift tracking to monitor staff activity'
    ];

    const embed = new EmbedBuilder()
      .setTitle('💡 Automation Tips')
      .setColor(0xf39c12)
      .addFields(
        { name: 'Tips', value: tips.join('\n'), inline: false },
        { name: 'This Week Activity', value: recentActivity.toString(), inline: true },
        { name: 'Total Activity', value: totalActivity.toString(), inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
