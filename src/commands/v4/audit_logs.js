const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('audit_logs').setDescription('View audit logs'),
  async execute(interaction) { await interaction.reply({ content: 'Audit logs displayed' }); }
};
