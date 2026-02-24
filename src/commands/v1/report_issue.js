const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('report_issue')
    .setDescription('Report an issue with the bot')
    .addStringOption(opt => opt.setName('issue').setDescription('Describe the issue').setRequired(true)),

  async execute(interaction) {
    const issue = interaction.options.getString('issue');
    
    const guildData = await Guild.findOne({ guildId: interaction.guildId }) || new Guild({ guildId: interaction.guildId });
    if (!guildData.reportedIssues) guildData.reportedIssues = [];
    guildData.reportedIssues.push({
      userId: interaction.user.id,
      issue,
      timestamp: new Date(),
      status: 'open'
    });
    await guildData.save();
    
    await interaction.reply({ content: `✅ Issue reported: "${issue}". Thank you for your feedback!`, ephemeral: true });
  }
};
