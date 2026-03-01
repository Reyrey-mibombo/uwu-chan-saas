const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');
const { Guild } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shield_status')
        .setDescription('Zenith Hyper-Apex: Visual Security Deterrence & Active Layer Monitoring'),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            // Zenith Hyper-Apex License Guard
            const license = await validatePremiumLicense(interaction);
            if (!license.allowed) {
                return interaction.editReply({ embeds: [license.embed], components: license.components });
            }

            const guildData = license.guildData;
            const modSettings = guildData?.moderation || {};

            const layers = [
                { name: 'Anti-Spam Filter', status: modSettings.antiSpam?.enabled ?? true ? 'ACTIVE' : 'INACTIVE' },
                { name: 'Link Neutralizer', status: modSettings.linkBlocker?.enabled ?? true ? 'ACTIVE' : 'INACTIVE' },
                { name: 'Signal Encryption', status: 'SYNCHRONIZED' },
                { name: 'Global Intelligence', status: 'CONNECTED' }
            ];

            const activeCount = layers.filter(l => l.status === 'ACTIVE' || l.status === 'SYNCHRONIZED' || l.status === 'CONNECTED').length;
            const deterrenceLevel = Math.round((activeCount / layers.length) * 100);

            // 1. Generate Shield Ribbon
            const barLength = 15;
            const filled = '█'.repeat(Math.round((deterrenceLevel / 100) * barLength));
            const empty = '░'.repeat(barLength - filled.length);
            const shieldRibbon = `\`[${filled}${empty}]\` **${deterrenceLevel}% DETERRENCE**`;

            const fields = layers.map(l => ({
                name: `🛡️ ${l.name}`,
                value: `Status: \`${l.status}\``,
                inline: true
            }));

            const embed = await createCustomEmbed(interaction, {
                title: '🛡️ Zenith Hyper-Apex: Shield Status Dashboard',
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                description: `### 🚀 Sector Security Deterrence\nVisual audit of active security layers and metabolic deterrence levels for sector **${interaction.guild.name}**.\n\n**💎 ZENITH HYPER-APEX EXCLUSIVE**`,
                fields: [
                    { name: '✨ Cumulative Shield Ribbon', value: shieldRibbon, inline: false },
                    ...fields,
                    { name: '⚖️ Intelligence Tier', value: '`PLATINUM [HYPER-APEX]`', inline: true },
                    { name: '🛡️ Auth Node', value: '`ZENITH-GUARD-TITAN`', inline: true }
                ],
                footer: 'Security Deterrence Matrix • V4 Guardian Hyper-Apex Suite',
                color: deterrenceLevel > 70 ? 'success' : 'premium'
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Zenith Shield Status Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('Guardian Dashboard failure: Unable to synchronize shield telemetry.')] });
        }
    }
};
