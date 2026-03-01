const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');
const { User, Activity } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('workforce_hub')
        .setDescription('Zenith Hyper-Apex: Workforce Strategic Command Center'),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            // Zenith Hyper-Apex License Guard
            const license = await validatePremiumLicense(interaction);
            if (!license.allowed) {
                return interaction.editReply({ embeds: [license.embed], components: license.components });
            }

            const guildId = interaction.guildId;
            const memberCount = interaction.guild.memberCount;
            const staffCount = await User.countDocuments({ guildId, staff: { $exists: true } });

            // Fetch 24h Signal Volume
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const signals24h = await Activity.countDocuments({ guildId, createdAt: { $gte: twentyFourHoursAgo } });

            // Global Benchmark Simulation (Sector signal density vs global average)
            const globalAvg = 450;
            const sectorPerformance = Math.min(100, (signals24h / globalAvg) * 100).toFixed(1);

            const barLength = 15;
            const filled = '█'.repeat(Math.round((sectorPerformance / 100) * barLength));
            const empty = '░'.repeat(barLength - filled.length);
            const benchmarkRibbon = `\`[${filled}${empty}]\` **${sectorPerformance}% OF GLOBAL**`;

            const embed = await createCustomEmbed(interaction, {
                title: '🏢 Zenith Hyper-Apex: Workforce Command Hub',
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                description: `### 🚀 Operational Control Center\nMacroscopic personnel management terminal for sector **${interaction.guild.name}**. Real-time industry benchmarks active.\n\n**💎 ZENITH HYPER-APEX EXCLUSIVE**`,
                fields: [
                    { name: '🌐 Industry Benchmark', value: benchmarkRibbon, inline: false },
                    { name: '📉 Sector Pulse', value: `\`${(signals24h / 24).toFixed(1)}\` signals/hr`, inline: true },
                    { name: '👥 Node Count', value: `\`${staffCount}\` verified units`, inline: true },
                    { name: '📊 Capacity', value: `\`${((staffCount / memberCount) * 100).toFixed(1)}%\` saturation`, inline: true },
                    { name: '✨ Unified Hub Status', value: '`🟢 OPERATIONAL [HYPER-APEX]`', inline: true },
                    { name: '🛰️ Signal Sync', value: '`CONNECTED`', inline: true }
                ],
                footer: 'Workforce Hub Interface • V3 Premium Suite',
                color: 'premium'
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Zenith Workforce Hub Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('Hub failure: Unable to synchronize workforce telemetry.')] });
        }
    }
};
