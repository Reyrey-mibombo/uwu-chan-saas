const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auto_promotion')
    .setDescription('Configure automatic promotion system')
    .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable auto promotion'))
    .addStringOption(opt => opt.setName('points_required').setDescription('Points required for promotion'))
    .addBooleanOption(opt => opt.setName('announce').setDescription('Announce promotions')),
  async execute(interaction, client) {
    const enabled = interaction.options.getBoolean('enabled');
    const pointsRequired = interaction.options.getString('points_required');
    const announce = interaction.options.getBoolean('announce');

    let guild = await Guild.findOne({ guildId: interaction.guild.id });
    if (!guild) {
      guild = new Guild({ guildId: interaction.guild.id, name: interaction.guild.name });
    }

    if (enabled !== null) {
      guild.settings = guild.settings || {};
      guild.settings.autoPromotionEnabled = enabled;
    }
    if (pointsRequired) {
      guild.settings = guild.settings || {};
      guild.settings.promotionPointsRequired = parseInt(pointsRequired);
    }
    if (announce !== null) {
      guild.settings = guild.settings || {};
      guild.settings.promotionAnnounce = announce;
    }

    await guild.save();

    const embed = new EmbedBuilder()
      .setTitle('⬆️ Auto Promotion Configuration')
      .setColor(0x27ae60)
      .addFields(
        { name: 'Enabled', value: guild.settings.autoPromotionEnabled ? 'Yes' : 'No', inline: true },
        { name: 'Points Required', value: `${guild.settings.promotionPointsRequired || 100}`, inline: true },
        { name: 'Announce', value: guild.settings.promotionAnnounce ? 'Yes' : 'No', inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  }
};
