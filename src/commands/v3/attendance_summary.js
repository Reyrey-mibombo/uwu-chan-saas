const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('attendance_summary').setDescription('View attendance summary'),
  async execute(interaction) { await interaction.reply({ content: 'Attendance: 95% this month' }); }
};
