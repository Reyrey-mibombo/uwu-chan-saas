const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { createCoolEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Get help and command list')
    .addStringOption(opt => opt.setName('command').setDescription('Get help for a specific command').setRequired(false)),

  async execute(interaction) {
    try {
      const commandName = interaction.options.getString('command');

      if (commandName) {
        // Detailed help for specific command
        const embed = createCoolEmbed()
          .setTitle(`Help: /${commandName}`)
          .setDescription(`Showing details for the \`${commandName}\` command. Please note some features require higher tiers.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // Categorized broad help menu
      const embed = createCoolEmbed()
        .setTitle('📚 Uwu-chan Bot Commands')
        .setDescription('Welcome to Uwu-chan SaaS! Here is an overview of the commands available in your current tier. Use `/buy` or `/premium` to upgrade and unlock more powerful features!')
        .addFields(
          { name: '📋 General Utilities', value: '> `/ping` • `/server_info`\n> `/roles_list` • `/help`\n> `/invite_link` • `/report_issue`', inline: false },
          { name: '👥 Staff & Shifts', value: '> `/staff_profile` • `/leaderboard`\n> `/shift_start` • `/shift_end`', inline: false },
          { name: '📊 Analytics', value: '> `/staff_stats` • `/daily_summary`\n> `/activity_chart`', inline: false },
          { name: '🛡️ Moderation', value: '> `/warn` • `/mod_notes`\n> `/promote` • `/demote`', inline: false },
          { name: '💎 Premium Tiers', value: 'Use `/premium` to unlock v3 (Advanced Auto-Moderation), v4 (Economy), v5 (AI Features), and beyond!', inline: false }
        )
        .setThumbnail(interaction.client.user?.displayAvatarURL());

      const row = new ActionRowBuilder()
        .addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('help_category_select')
            .setPlaceholder('Select a category for more details')
            .addOptions([
              { label: 'General', description: 'Basic utility commands', value: 'general', emoji: '📋' },
              { label: 'Staff Management', description: 'Shift and profile commands', value: 'staff', emoji: '👥' },
              { label: 'Analytics', description: 'Server and staff statistics', value: 'analytics', emoji: '📊' },
              { label: 'Moderation', description: 'Server management commands', value: 'moderation', emoji: '🛡️' }
            ])
        );

      await interaction.reply({ embeds: [embed], components: [row] });
    } catch (error) {
      console.error(error);
      const errEmbed = createErrorEmbed('An error occurred while fetching the help menu.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
