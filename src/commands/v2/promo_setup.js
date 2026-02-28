const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');
const { Guild } = require('../../database/mongo');
const { createCoolEmbed, createSuccessEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('promo_setup')
        .setDescription('⚙️ Configure rank requirements and role mappings for auto-promotions')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const guild = await Guild.findOne({ guildId: interaction.guildId });
        if (!guild) return interaction.editReply('❌ Configuration not found.');

        const embed = createCoolEmbed({
            title: '⚙️ Promotion System Setup',
            description: 'Welcome to the premium promotion setup! Use the menu below to configure each rank\'s requirements and link them to Discord roles.',
            color: 'primary'
        }).addFields(
            { name: '📋 Instructions', value: '1. Select a rank to configure.\n2. Set the point thresholds, shift counts, and consistency.\n3. Link the rank to a Discord role for automatic assignment.', inline: false },
            { name: '✨ Pro Tip', value: 'Enable the `Automation` module in `/settings` to start the auto-promotion engine.', inline: false }
        );

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('promo_setup_select')
            .setPlaceholder('Select a rank to configure...')
            .addOptions([
                { label: 'Trial', value: 'trial', emoji: '🌱', description: 'Configure Trial Staff requirements' },
                { label: 'Staff', value: 'staff', emoji: '🛡️', description: 'Configure Staff requirements' },
                { label: 'Senior', value: 'senior', emoji: '🌟', description: 'Configure Senior Staff requirements' },
                { label: 'Manager', value: 'manager', emoji: '💎', description: 'Configure Manager requirements' },
                { label: 'Admin', value: 'admin', emoji: '👑', description: 'Configure Admin requirements' }
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.editReply({ embeds: [embed], components: [row] });
    }
};
