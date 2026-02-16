const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('staff_efficiency').setDescription('View staff efficiency'),
  async execute(interaction) { await interaction.reply({ content: 'Staff efficiency: 92%' }); }
};
