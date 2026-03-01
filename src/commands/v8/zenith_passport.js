const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');
const { User, Activity } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('zenith_passport')
        .setDescription('Zenith Hyper-Apex: The Definitive Divine Personnel Passport')
        .addUserOption(opt => opt.setName('user').setDescription('Personnel to audit').setRequired(false)),

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
                return interaction.editReply({ embeds: [createErrorEmbed(`No personnel trace found. <@${target.id}> is unmapped.`)] });
            }

            const pts = user.staff.points || 0;
            const level = Math.floor(pts / 100);
            const mastery = user.staff.mastery || {};

            // Divine Ranking Calculation
            const ranks = ['INITIATE', 'OPERATIVE', 'COMMANDER', 'EXECUTIVE', 'TITAN', 'DIVINE'];
            const rankIndex = Math.min(ranks.length - 1, Math.floor(level / 10));
            const currentRank = ranks[rankIndex];

            // 1. Generate Divine Ribbon
            const barLength = 15;
            const progress = (level % 10) / 10;
            const filled = '✧'.repeat(Math.round(progress * barLength));
            const empty = '░'.repeat(barLength - filled.length);
            const divineRibbon = `\`[${filled}${empty}]\` **RANK: ${currentRank}**`;

            const embed = await createCustomEmbed(interaction, {
                title: `💎 Zenith Divine Identity: ${target.username}`,
                thumbnail: target.displayAvatarURL({ dynamic: true }),
                description: `### 🛡️ Macroscopic Personnel Passport\nThe definitive identity record for personnel **${target.username}**, synchronized across all 8 Zenith sectors.\n\n**💎 ZENITH HYPER-APEX EXCLUSIVE**`,
                fields: [
                    { name: '✨ Divine Rank Ribbon', value: divineRibbon, inline: false },
                    { name: '📊 Total Merit', value: `\`${pts.toLocaleString()}\` signals`, inline: true },
                    { name: '🎖️ Divine Tier', value: `\`LVL ${level}\``, inline: true },
                    { name: '📂 Authority Node', value: `\`${user.staff.rank.toUpperCase()}\``, inline: true },
                    { name: '⚖️ Mastery Velocity', value: `> Technical: \`${mastery.technical || 0}%\`\n> Behavioral: \`${mastery.admin || 0}%\`\n> Collaborative: \`${mastery.social || 0}%\``, inline: false },
                    { name: '🛡️ Passport Status', value: '`AUTHENTICATED`', inline: true },
                    { name: '🔄 Omni-Sync', value: '`V1-V8 ACTIVE`', inline: true }
                ],
                footer: 'Omni-Nexus Personnel Identity • V8 Divine Identity Suite',
                color: 'premium'
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Zenith Passport Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('Identity synthesis failure: Unable to compile divine passport.')] });
        }
    }
};
