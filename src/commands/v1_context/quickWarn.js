const { ContextMenuCommandBuilder, ApplicationCommandType, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');
const { createErrorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('Quick Warn')
        .setType(ApplicationCommandType.User)
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction, client) {
        try {
            if (!interaction.member.permissions.has('ModerateMembers') && !interaction.member.permissions.has('ManageGuild')) {
                return interaction.reply({ embeds: [createErrorEmbed('You do not have permission to warn users.')], ephemeral: true });
            }

            const targetUser = interaction.targetUser;

            if (targetUser.id === interaction.user.id) {
                return interaction.reply({ embeds: [createErrorEmbed('You cannot warn yourself.')], ephemeral: true });
            }

            const modal = new ModalBuilder()
                .setCustomId(`modal_quick_warn_${targetUser.id}`)
                .setTitle(`Warn ${targetUser.username.substring(0, 30)}`);

            const reasonInput = new TextInputBuilder()
                .setCustomId('warn_reason')
                .setLabel('Reason for Warning')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Enter the reason for this warning...')
                .setRequired(true)
                .setMaxLength(500);

            const severityInput = new TextInputBuilder()
                .setCustomId('warn_severity')
                .setLabel('Severity (low, medium, high)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('medium')
                .setRequired(false);

            modal.addComponents(
                new ActionRowBuilder().addComponents(reasonInput),
                new ActionRowBuilder().addComponents(severityInput)
            );

            await interaction.showModal(modal);
        } catch (error) {
            console.error('QuickWarn Context Menu Error:', error);
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ content: '❌ Failed to open warn modal.', ephemeral: true });
            } else {
                await interaction.reply({ content: '❌ Failed to open warn modal.', ephemeral: true });
            }
        }
    }
};
