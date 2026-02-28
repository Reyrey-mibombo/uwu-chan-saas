const { SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('check_logs')
    .setDescription('Check staff activity logs')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(false))
    .addIntegerOption(opt => opt.setName('days').setDescription('Number of days').setRequired(false)),

  async execute(interaction, client) {
    const user = interaction.options.getUser('user');
    const days = interaction.options.getInteger('days') || 7;
    const Activity = require('../../database/mongo').Activity;
    const Warning = require('../../database/mongo').Warning;
    const Shift = require('../../database/mongo').Shift;
    
    const query = { guildId: interaction.guildId };
    if (user) query.userId = user.id;
    
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    query.createdAt = { $gte: cutoff };
    
    const [activities, warnings, shifts] = await Promise.all([
      Activity.find(query).sort({ createdAt: -1 }).limit(20),
      Warning.find({ ...query, createdAt: { $gte: cutoff } }),
      Shift.find({ ...query, createdAt: { $gte: cutoff } })
    ]);
    
    const embed = createCoolEmbed()
      .setTitle(`📜 Activity Logs - Last ${days} days`)
      .addFields(
        { name: 'Activities', value: `${activities.length}`, inline: true },
        { name: 'Warnings', value: `${warnings.length}`, inline: true },
        { name: 'Shifts', value: `${shifts.length}`, inline: true }
      )
      ;

    await interaction.reply({ embeds: [embed] });
  }
};



