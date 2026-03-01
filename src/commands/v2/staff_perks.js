const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User } = require('../../database/mongo');

const AVAILABLE_PERKS = [
    { label: 'Night Owl', value: 'night_owl', description: 'Enhanced visibility for late-night patrols.', emoji: '🦉' },
    { label: 'Data Specialist', value: 'data_specialist', description: 'Increased yield from reporting modules.', emoji: '💾' },
    { label: 'Tactical Lead', value: 'tactical_lead', description: 'Boosts team morale in the alert channel.', emoji: '⚔️' },
    { label: 'Efficiency Analyst', value: 'efficiency_analyst', description: 'Optimizes shift continuity telemetry.', emoji: '📈' }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('staff_perks')
        .setDescription('🎖️ Calibration: Personalize your tactical flairs and perks'),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });
            const guildId = interaction.guildId;

            const userData = await User.findOne({ userId: interaction.user.id, guildId });
            if (!userData || !userData.staff) {
                return interaction.editReply({ embeds: [createErrorEmbed('No staff profile detected for perk calibration.')] });
            }

            const currentLevel = userData.staff.level || 1;
            const equipped = userData.staff.equippedPerk || 'None';

            const select = new StringSelectMenuBuilder()
                .setCustomId('equip_perk')
                .setPlaceholder('Select a tactical perk...')
                .addOptions(AVAILABLE_PERKS.map(p => ({
                    ...p,
                    default: p.value === equipped
                })));

            const row = new ActionRowBuilder().addComponents(select);

            const embed = await createCustomEmbed(interaction, {
                title: '🎖️ Tactical Perk Configuration',
                description: `### 🛡️ Personnel Flair Calibration\nSelect an active perk to enhance your staff passport signature. Perks reflect your specialized operational focus.\n\n**Current Clearance:** \`LVL ${currentLevel}\`\n**Active Perk:** \`${equipped.toUpperCase()}\``,
                footer: 'Perks indicate your operational specialization to server management.',
                color: 'premium'
            });

            await interaction.editReply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Staff Perks Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('Failed to initialize the perk calibration matrix.')] });
        }
    },

    // Button/Select Menu Handler logic for index.js
    async handleSelect(interaction) {
        const perkValue = interaction.values[0];
        const perk = AVAILABLE_PERKS.find(p => p.value === perkValue);

        await User.findOneAndUpdate(
            { userId: interaction.user.id, guildId: interaction.guildId },
            { 'staff.equippedPerk': perk.label }
        );

        return interaction.update({
            content: `✅ Tactical perk calibrated: **${perk.label}** ${perk.emoji}`,
            components: [],
            embeds: []
        });
    }
};
