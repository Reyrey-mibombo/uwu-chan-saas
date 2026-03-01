const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');
const { User } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('zenith_passport')
        .setDescription('Zenith Hyper-Apex: The Definitive Divine Personnel Passport & Holographic Identity')
        .addUserOption(opt => opt.setName('user').setDescription('Personnel to audit (Optional)').setRequired(false)),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            // Zenith Hyper-Apex License Guard
            const license = await validatePremiumLicense(interaction);
            if (!license.allowed) {
                return interaction.editReply({ embeds: [license.embed], components: license.components });
            }

            const target = interaction.options.getUser('user') || interaction.user;
            const user = await User.findOne({ userId: target.id, guildId: interaction.guildId }).lean();

            if (!user || !user.staff) {
                return interaction.editReply({ embeds: [createErrorEmbed(`No personnel trace found for <@${target.id}>.`)] });
            }

            const pts = user.staff.points || 0;
            const level = Math.floor(pts / 100);
            const mastery = user.staff.mastery || {};

            // 1. Holographic Identity Ribbon (ASCII)
            const barLength = 15;
            const holographicIndex = (level % 10) / 10;
            const symbols = ['💠', '✦', '✧', '✦', '💠'];
            const holographicRibbon = Array.from({ length: barLength }, (_, i) => {
                const char = symbols[Math.floor((i / barLength) * symbols.length)];
                return i < (holographicIndex * barLength) ? char : '░';
            }).join('');

            const identityRibbon = `\`[${holographicRibbon}]\` **TIER: ${Math.floor(level / 10) + 1} DIVINE**`;

            // 2. Omni-Nexus Sector Density (V1-V8 presence simulation)
            const sectors = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8'];
            const sectorDensity = sectors.map(s => pts > (parseInt(s[1]) * 100) ? `\`[${s}:√]\`` : `\`[${s}:×]\``).join(' ');

            const embed = await createCustomEmbed(interaction, {
                title: `💎 Zenith Divine Identity: ${target.username}`,
                thumbnail: target.displayAvatarURL({ dynamic: true }),
                description: `### 🛡️ Macroscopic Omni-Nexus Passport\nThe definitive identity record for personnel **${target.username}**, synchronized across all 8 Zenith operational tiers.\n\n**🌐 OMNI-NEXUS SECTOR DENSITY**\n${sectorDensity}\n\n**💎 ZENITH HYPER-APEX EXCLUSIVE**`,
                fields: [
                    { name: '✨ Holographic Identity Ribbon', value: identityRibbon, inline: false },
                    { name: '📊 Cumulative Merit', value: `\`${pts.toLocaleString()}\` signals`, inline: true },
                    { name: '🎖️ Divine Ranking', value: `\`LVL ${level}\``, inline: true },
                    { name: '📂 Authority Node', value: `\`${(user.staff.rank || 'Trial').toUpperCase()}\``, inline: true },
                    { name: '⚖️ Mastery Velocity', value: `> Technical: \`${mastery.technical || 0}%\` | Social: \`${mastery.social || 0}%\``, inline: false },
                    { name: '🛡️ Sync Status', value: '`AUTHENTICATED`', inline: true },
                    { name: '🔄 Omni-Bridge', value: '`CONNECTED [V1-V8]`', inline: true },
                    { name: '✨ Visual Tier', value: '`DIVINE [APEX]`', inline: true }
                ],
                footer: 'Omni-Nexus Personnel Identity • V8 Divine Identity Suite',
                color: 'premium'
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Zenith Passport Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('Identity synthesis failure: Unable to compile macroscopic divine passport.')] });
        }
    }
};
