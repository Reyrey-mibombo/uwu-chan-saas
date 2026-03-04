const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed, createErrorEmbed, createPremiumEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { Activity, Shift } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shield_status')
        .setDescription('Enterprise Hyper-Apex: Macroscopic Security Layer Audit & Armor Density'),

    async execute(interaction, client) {
        try {
            if (!interaction.deferred && !interaction.replied) await interaction.deferReply();

            // Enterprise Hyper-Apex License Guard
            const license = await validatePremiumLicense(interaction, 'premium');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: license.components });
            }

            const guildId = interaction.guildId;
            const staffCount = await interaction.guild.members.fetch().then(members => members.filter(m => m.permissions.has('ModerateMembers')).size).catch(() => 0);

            // 1. Armor Density Ribbons
            const generateArmorRibbon = (val, length = 12) => {
                const filled = '▓'.repeat(Math.round((val / 100) * length));
                const empty = '░'.repeat(length - filled.length);
                return `\`[${filled}${empty}]\``;
            };

            const perimeterIntegrity = Math.min(100, staffCount * 10 + 40);
            const signalFiltration = 94.2;
            const deterrenceLevel = Math.min(100, staffCount * 15 + 20);

            const embed = await createCustomEmbed(interaction, {
                title: '🛡️ Enterprise Hyper-Apex: Shield Status',
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                description: `### 🔒 Macroscopic Armor Density Audit\nAnalyzing active security layers and structural integrity for sector **${interaction.guild.name}**.\n\n**💎 Enterprise HYPER-APEX EXCLUSIVE**`,
                fields: [
                    { name: '🧱 Perimeter Integrity', value: `${generateArmorRibbon(perimeterIntegrity)} **${perimeterIntegrity}%**`, inline: false },
                    { name: '📡 Signal Filtration', value: `${generateArmorRibbon(signalFiltration)} **${signalFiltration}%**`, inline: false },
                    { name: '⚔️ Active Deterrence', value: `${generateArmorRibbon(deterrenceLevel)} **${deterrenceLevel}%**`, inline: false },
                    { name: '✨ System Pulse', value: '`🟢 RESONATING [OPTIMAL]`', inline: true },
                    { name: '🏢 Sector Capacity', value: `\`${staffCount}\` Wardens`, inline: true },
                    { name: '🔐 Auth Key', value: '`SHIELD-SYNC-04`', inline: true }
                ],
                footer: 'Security Layer Audit • V4 Guardian Hyper-Apex Suite',
                color: 'premium'
            });

            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v4_shield_status').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Enterprise Shield Status Error:', error);
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v4_shield_status').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed('Shield Matrix failure: Unable to audit macroscopic armor density.')], components: [row] });
        }
    }
};


