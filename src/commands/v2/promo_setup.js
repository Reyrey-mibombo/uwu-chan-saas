const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');
const { Guild } = require('../../database/mongo');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('promo_setup')
        .setDescription('⚙️ Configure rank requirements and role mappings for auto-promotions')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const guild = await Guild.findOne({ guildId: interaction.guildId }).lean();
            if (!guild || !guild.promotionRequirements) {
                return interaction.editReply({ embeds: [createErrorEmbed('Configuration not found for this server.')] });
            }

            const embed = await createCustomEmbed(interaction, {
                title: '⚙️ Promotion System Setup',
                description: 'Welcome to the premium server promotion setup engine! Use the dropdown menu below to configure each rank\'s minimum requirements and link them to Discord roles.',
                fields: [
                    { name: '📋 Instructions', value: '1. Select a rank to configure.\n2. Set the point thresholds, shift counts, and consistency requirements.\n3. Link the rank to a Discord role for automatic assignment.', inline: false },
                    { name: '✨ Pro Tip', value: 'Enable the `Automation` module utilizing `/promo_toggle` to activate the automatic background promotion engine.', inline: false }
                ],
                footer: 'Interactive Configuration Pipeline'
            });

            // Dynamically load available ranks from the database keys
            const ranks = Object.keys(guild.promotionRequirements);
            const emojis = ['🌱', '🛡️', '🌟', '💎', '👑', '🔥'];

            const options = ranks.map((rank, i) => {
                const labelName = rank.charAt(0).toUpperCase() + rank.slice(1);
                return {
                    label: labelName,
                    value: rank,
                    emoji: emojis[i % emojis.length],
                    description: `Configure ${labelName} requirements`
                };
            });

            if (options.length === 0) {
                return interaction.editReply({ embeds: [createErrorEmbed('No rank configurations exist in the database to setup.')] });
            }

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('promo_setup_select')
                .setPlaceholder('Select a server rank to configure...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.editReply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Promo Setup UI Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('An error occurred while generating the setup UI.')] });
        }
    }
};
