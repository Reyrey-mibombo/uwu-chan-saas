const { SlashCommandBuilder } = require('discord.js');
const { createPremiumEmbed } = require('../../utils/embeds');
const { User, Shift } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_productivity')
    .setDescription('View staff productivity')
    .addIntegerOption(opt => opt.setName('days').setDescription('Days to analyze').setRequired(false)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const days = interaction.options.getInteger('days') || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const users = await User.find({ 'guilds.guildId': guildId, 'staff.points': { $exists: true } }).lean();

    const shifts = await Shift.find({ guildId, startTime: { $gte: startDate } });

    const userProductivity = users.map(u => {
      const userShifts = shifts.filter(s => s.userId === u.userId);
      const totalHours = userShifts.reduce((sum, s) => sum + (s.duration || 0), 0) / 60;
      const staff = u.staff || {};

      return {
        userId: u.userId,
        username: u.username,
        points: staff.points || 0,
        shiftHours: totalHours,
        consistency: staff.consistency || 100,
        warnings: staff.warnings || 0
      };
    });

    const topProductive = userProductivity
      .sort((a, b) => b.points - a.points)
      .slice(0, 10);

    const embed = createPremiumEmbed()
      .setTitle('💼 Staff Productivity')
      
      .setDescription(
        topProductive.map((u, i) =>
          `${i + 1}. <@${u.userId}> - ${u.points} pts, ${u.shiftHours.toFixed(1)}h, ${u.consistency}% consistency`
        ).join('\n') || 'No productivity data found'
      )
      .addFields(
        { name: 'Staff Count', value: users.length.toString(), inline: true },
        { name: 'Period', value: `${days} days`, inline: true }
      )
      ;

    await interaction.reply({ embeds: [embed] });
  }
};



