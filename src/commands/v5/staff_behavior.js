const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_behavior')
    .setDescription('Analyze staff behavior')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member to analyze').setRequired(false))
    .addIntegerOption(opt => opt.setName('days').setDescription('Days to analyze').setRequired(false)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const targetUser = interaction.options.getUser('user');
    const userId = targetUser?.id;
    const days = interaction.options.getInteger('days') || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const query = { guildId, createdAt: { $gte: startDate } };
    if (userId) query.userId = userId;

    const activities = await Activity.find(query);

    const warnings = activities.filter(a => a.type === 'warning').length;
    const shifts = activities.filter(a => a.type === 'shift').length;
    const commands = activities.filter(a => a.type === 'command').length;
    const promotions = activities.filter(a => a.type === 'promotion').length;

    const behavior = warnings > 5 ? 'Needs Improvement' :
                     warnings > 2 ? 'Acceptable' : 'Excellent';

    const embed = new EmbedBuilder()
      .setTitle(`👀 Staff Behavior: ${targetUser?.username || 'All Staff'}`)
      .setColor(warnings > 5 ? 0xe74c3c : warnings > 2 ? 0xf39c12 : 0x2ecc71)
      .addFields(
        { name: 'Warnings', value: warnings.toString(), inline: true },
        { name: 'Shifts', value: shifts.toString(), inline: true },
        { name: 'Commands', value: commands.toString(), inline: true },
        { name: 'Promotions', value: promotions.toString(), inline: true },
        { name: 'Behavior Rating', value: behavior, inline: true },
        { name: 'Period', value: `${days} days`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
