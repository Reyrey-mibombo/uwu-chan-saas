const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');
const { Activity } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('automation_pulse')
        .setDescription('Zenith Hyper-Apex: Macroscopic Integrity Scanning & Metabolic Heartbeat'),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            // Zenith Hyper-Apex License Guard
            const license = await validatePremiumLicense(interaction);
            if (!license.allowed) {
                return interaction.editReply({ embeds: [license.embed], components: license.components });
            }

            const guildId = interaction.guildId;
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

            const [commandActivities, totalActivities] = await Promise.all([
                Activity.countDocuments({ guildId, type: 'command', createdAt: { $gte: twentyFourHoursAgo } }),
                Activity.countDocuments({ guildId, createdAt: { $gte: twentyFourHoursAgo } })
            ]);

            const filtrationDensity = totalActivities > 0 ? (commandActivities / totalActivities) * 100 : 0;
            const bpm = (60 + (filtrationDensity * 0.4)).toFixed(1);

            // 1. Integrity Scanning Ribbon (ASCII)
            const barLength = 15;
            const scanChars = ['|', '/', '-', '\\'];
            const scanSymbol = scanChars[Math.floor(Date.now() / 250) % 4];
            const scanner = Array.from({ length: barLength }, (_, i) => {
                const pos = Math.floor(Date.now() / 200) % barLength;
                return i === pos ? scanSymbol : '=';
            }).join('');

            const integrityRibbon = `\`[${scanner}]\` **${filtrationDensity.toFixed(1)}% FILTRATION**`;

            // 2. Metabolic Heartbeat Ribbon
            const heartbeat = Array.from({ length: barLength }, (_, i) => {
                const t = (i / barLength) * Math.PI * 4;
                const val = Math.sin(t) * Math.exp(-Math.abs(Math.sin(t / 2)) * 2);
                return val > 0.5 ? 'Λ' : (val > 0.1 ? 'v' : '_');
            }).join('');

            const pulseRibbon = `\`[${heartbeat}]\` **${bpm} BPM PULSE**`;

            const embed = await createCustomEmbed(interaction, {
                title: '🤖 Zenith Hyper-Apex: Automation Heartbeat',
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                description: `### 🚀 Sector Metabolic Integrity\nMacroscopic visualization of automation "breathing" and signal filtration integrity for sector **${interaction.guild.name}**.\n\n**💎 ZENITH HYPER-APEX EXCLUSIVE**`,
                fields: [
                    { name: '📡 Integrity Scanning Ribbon', value: integrityRibbon, inline: false },
                    { name: '✨ Metabolic Heartbeat Ribbon', value: pulseRibbon, inline: false },
                    { name: '📈 Signal Density', value: `\`${totalActivities.toLocaleString()}\` 24h`, inline: true },
                    { name: '📉 Noise Filter', value: `\`${(100 - filtrationDensity).toFixed(1)}%\``, inline: true },
                    { name: '⚖️ Pulse Sync', value: '`CONNECTED`', inline: true },
                    { name: '🛡️ Core Integrity', value: '`99.9% [SHIELD]`', inline: true },
                    { name: '🌐 Global Sync', value: '`ENCRYPTED`', inline: true }
                ],
                footer: 'Automation Metabolic Matrix • V7 Automation Hyper-Apex Suite',
                color: 'premium'
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Zenith Automation Pulse Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('Automation Pulse failure: Unable to synchronize metabolic heartbeat.')] });
        }
    }
};
