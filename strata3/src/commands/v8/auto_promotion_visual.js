const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auto_promotion_visual')
    .setDescription('View auto promotion visual configuration'),
  async execute(interaction) {
    let guild = await Guild.findOne({ guildId: interaction.guild.id });
    if (!guild) {
      guild = new Guild({ guildId: interaction.guild.id, name: interaction.guild.name });
      await guild.save();
    }

    const settings = guild.settings || {};
    const enabled = settings.autoPromotionEnabled ?? false;
    const thresholds = settings.promotionThresholds || { points: 100, activity: 50 };

    const embed = new EmbedBuilder()
      .setTitle('🚀 Auto Promotion Configuration')
      .setColor(0xe74c3c)
      .addFields(
        { name: 'Status', value: enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
        { name: 'Points Threshold', value: `${thresholds.points}`, inline: true },
        { name: 'Activity Threshold', value: `${thresholds.activity}`, inline: true }
      );

    if (settings.promotionRoles) {
      embed.addFields({ name: 'Promotion Roles', value: settings.promotionRoles.join(', '), inline: false });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
