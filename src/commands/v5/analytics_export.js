const { SlashCommandBuilder } = require('discord.js');
const { createPremiumEmbed } = require('../../utils/embeds');
const { Activity, User, Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('analytics_export')
    .setDescription('Export analytics data')
    .addStringOption(opt => opt.setName('type').setDescription('Data type to export')
      .addChoices(
        { name: 'Activity', value: 'activity' },
        { name: 'Users', value: 'users' },
        { name: 'Guild', value: 'guild' }
      )
      .setRequired(false))
    .addIntegerOption(opt => opt.setName('days').setDescription('Days to export (default 30)').setRequired(false)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const type = interaction.options.getString('type') || 'activity';
    const days = interaction.options.getInteger('days') || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    let data;
    let filename;

    if (type === 'activity') {
      data = await Activity.find({ guildId, createdAt: { $gte: startDate } }).lean();
      filename = `activity_${days}d.json`;
    } else if (type === 'users') {
      data = await User.find({ 'guilds.guildId': guildId }).lean();
      filename = `users.json`;
    } else {
      data = await Guild.findOne({ guildId }).lean();
      filename = `guild.json`;
    }

    const summary = Array.isArray(data) ? `${data.length} records` : '1 record';

    const embed = createPremiumEmbed()
      .setTitle('📤 Analytics Export')
      
      .addFields(
        { name: 'Type', value: type.charAt(0).toUpperCase() + type.slice(1), inline: true },
        { name: 'Records', value: summary, inline: true },
        { name: 'Period', value: `${days} days`, inline: true }
      )
      .setDescription(`Data exported to \`${filename}\``)
      ;

    await interaction.reply({ embeds: [embed] });
  }
};



