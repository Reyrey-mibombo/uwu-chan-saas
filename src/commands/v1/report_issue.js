const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('report_issue')
    .setDescription('Report an issue with the bot')
    .addStringOption(opt => opt.setName('issue').setDescription('Describe the issue').setRequired(true)),
  
  async execute(interaction) {
    const issue = interaction.options.getString('issue');
    
    await interaction.reply(`✅ Issue reported: "${issue}". Thank you for your feedback!`);
  }
};
