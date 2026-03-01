const { SlashCommandBuilder } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed, createCustomEmbed } = require('../../utils/embeds');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('report_issue')
    .setDescription('Report an issue with the bot or server')
    .addStringOption(opt => opt.setName('issue').setDescription('Describe the issue').setRequired(true)),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });
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

      const embed = await createCustomEmbed(interaction, {
        title: '✅ Issue Reported',
        description: `Your feedback has been successfully logged. Our development team will review this shortly.\n\n**Log Entry:**\n*"${issue}"*`,
        color: 'success'
      });
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const errEmbed = createErrorEmbed('An error occurred while reporting the issue. Please try again later.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
