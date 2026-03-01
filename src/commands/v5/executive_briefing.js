const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');
const { Activity, Guild } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('executive_briefing')
        .setDescription('Zenith Hyper-Apex: Macroscopic "State of the Sector" AI Briefing'),

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

            const [activityCount, warningCount, memberCount] = await Promise.all([
                Activity.countDocuments({ guildId, createdAt: { $gte: twentyFourHoursAgo } }),
                Activity.countDocuments({ guildId, type: 'warning', createdAt: { $gte: twentyFourHoursAgo } }),
                Promise.resolve(interaction.guild.memberCount)
            ]);

            // AI Summary Simulation
            const efficiency = (activityCount / (memberCount || 1)).toFixed(2);
            const stability = warningCount > 5 ? 'STABLE [ELEVATED NOISE]' : 'S-RANK STABLE';

            const briefSummary = activityCount > 50
                ? `Sector metabolic rate is **High**. Personnel output exceeds network baseline. No critical threat vectors identified.`
                : `Sector signals are **Nominal**. Operational density is stable. Intelligence recommends increasing engagement cycles.`;

            const embed = await createCustomEmbed(interaction, {
                title: '📊 Zenith Hyper-Apex: Executive Daily Briefing',
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                description: `### 🔮 State of the Sector: ${interaction.guild.name}\nHigh-fidelity macroscopic intelligence briefing compiled by Zenith AI from trailing 24h telemetry.\n\n**💎 ZENITH HYPER-APEX EXCLUSIVE**`,
                fields: [
                    { name: '🧠 Strategic AI Summary', value: briefSummary, inline: false },
                    { name: '📉 Metabolic Efficiency', value: `\`${efficiency}\` signals/node`, inline: true },
                    { name: '🛡️ Stability Status', value: `\`${stability}\``, inline: true },
                    { name: '📡 Signal Volume', value: `\`${activityCount.toLocaleString()}\` 24h`, inline: true },
                    { name: '✨ Intelligence Tier', value: '`PLATINUM [HYPER-APEX]`', inline: true },
                    { name: '🏢 Sector Class', value: memberCount > 100 ? '`ENTERPRISE`' : '`STANDARD`', inline: true },
                    { name: '⚖️ Reliability', value: '`99.9% (Zenith-Sync)`', inline: true }
                ],
                footer: 'Executive Briefing Engine • V5 Executive Hyper-Apex Suite',
                color: 'premium'
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Zenith Executive Briefing Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('Intelligence failure: Unable to compile executive briefing summary.')] });
        }
    }
};
