const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('consistency')
    .setDescription('Check your consistency score')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check')
        .setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guildId;

    const user = await User.findOne({ userId: target.id });
    
    if (!user || !user.staff) {
      return interaction.reply({ 
        content: `${target.username} has no staff activity yet.`,
        ephemeral: true 
      });
    }

    const consistency = user.staff.consistency || 0;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const shifts = await Activity.countDocuments({
      guildId,
      userId: target.id,
      type: 'shift',
      createdAt: { $gte: weekAgo }
    });

    const trend = consistency > 80 ? '📈 Improving' : 
                  consistency > 50 ? '➡️ Stable' : '📉 Needs Improvement';

    const embed = new EmbedBuilder()
      .setTitle(`📊 Consistency Score: ${target.username}`)
      .setColor(0x3498db)
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: '🎯 Score', value: `${consistency}%`, inline: true },
        { name: '📈 Trend', value: trend, inline: true },
        { name: '⏱️ Shifts (7d)', value: shifts.toString(), inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
