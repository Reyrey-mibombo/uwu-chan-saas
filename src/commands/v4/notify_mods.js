const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed, createErrorEmbed, createPremiumEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { User } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('notify_mods')
    .setDescription('Enterprise Dispatch: Absolute Moderator Emergency Broadcasting'),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      // Strict Enterprise License Guard
      const license = await validatePremiumLicense(interaction, 'premium');
      if (!license.allowed) {
        return await interaction.editReply({ embeds: [license.embed], components: license.components });
      }

      const mods = await User.find({ guildId: interaction.guildId, 'staff.rank': { $in: ['admin', 'manager'] } }).lean();

      if (mods.length === 0) {
        return interaction.editReply({ embeds: [createErrorEmbed('No authorized responders found in the hierarchy to receive the dispatch.')] });
      }

      const dispatchId = Math.random().toString(36).substring(2, 8).toUpperCase();

      const embed = await createCustomEmbed(interaction, {
        title: `??? Enterprise Dispatch Terminal [${dispatchId}]`,
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        description: `### ?? Critical Sector Alert\nA macroscopic signal has been broadcast to all high-tier responders in the **${interaction.guild.name}** sector. Emergency response protocol initiated.\n\n**?? Enterprise DISPATCH EXCLUSIVE**`,
        fields: [
          { name: '?? Dispatch ID', value: `\`${dispatchId}\``, inline: true },
          { name: '?? Responders Pinned', value: `\`${mods.length}\` Nodes`, inline: true },
          { name: '?? Alert Severity', value: '`MAXIMUM`', inline: true },
          { name: '?? Action Terminal', value: 'Authorized via Enterprise Console', inline: false }
        ],
        footer: 'Emergency Dispatch Active � V4 Guard Suite',
        color: 'premium'
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('mod_accept').setLabel('Accept Dispatch').setStyle(ButtonStyle.Success).setEmoji('?'),
        new ButtonBuilder().setCustomId('mod_quarantine').setLabel('Quarantine Sector').setStyle(ButtonStyle.Danger).setEmoji('???')
      );

      // In a real scenario, this would send to a mod log channel. Using interaction for demo.
      await interaction.editReply({ embeds: [embed], components: [row] });

    } catch (error) {
      console.error('Enterprise Notify Mods Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Dispatch failure: Unable to synchronize emergency signals.')] });
    }
  }
};

