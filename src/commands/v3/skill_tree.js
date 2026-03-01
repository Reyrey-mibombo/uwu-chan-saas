const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');
const { User } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skill_tree')
        .setDescription('Zenith Hyper-Apex: Macroscopic Proficiency Branches & Skill Mastery')
        .addUserOption(opt => opt.setName('user').setDescription('Sector Personnel (Optional)').setRequired(false)),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            // Zenith Hyper-Apex License Guard
            const license = await validatePremiumLicense(interaction);
            if (!license.allowed) {
                return interaction.editReply({ embeds: [license.embed], components: license.components });
            }

            const targetUser = interaction.options.getUser('user') || interaction.user;
            const userData = await User.findOne({ userId: targetUser.id, guildId: interaction.guildId }).lean();

            if (!userData || !userData.staff) {
                return interaction.editReply({ embeds: [createErrorEmbed(`No signal dossier found for <@${targetUser.id}>.`)] });
            }

            const points = userData.staff.points || 0;
            const rank = (userData.staff.rank || 'Trial').toUpperCase();

            // 1. Proficiency Branches (ASCII Art)
            const skillMap = [
                `    [OPERATIONAL]`,
                `         |`,
                `    +----+----+`,
                `    |         |`,
                `[LEAD]     [TECH]`,
                `    |         |`,
                `  (MASTERY: ${Math.min(100, (points / 50).toFixed(0))}%)`
            ].join('\n');

            // 2. Mastery Progress Ribbons
            const generateRibbon = (val, length = 10) => {
                const filled = '█'.repeat(Math.round((val / 100) * length));
                const empty = '░'.repeat(length - filled.length);
                return `\`[${filled}${empty}]\``;
            };

            const leadership = Math.min(100, Math.round(points / 20));
            const technical = Math.min(100, Math.round(points / 15));
            const tactical = Math.min(100, Math.round(points / 25));

            const embed = await createCustomEmbed(interaction, {
                title: `🌳 Zenith Hyper-Apex: Proficiency Branches`,
                thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
                description: `### 🛡️ Macroscopic Skill Matrix\nMapping neural proficiency branches and command specializations for **${targetUser.username}**.\n\n\`\`\`\n${skillMap}\`\`\`\n**💎 ZENITH HYPER-APEX EXCLUSIVE**`,
                fields: [
                    { name: '👑 Leadership Vector', value: `${generateRibbon(leadership)} **${leadership}%**`, inline: true },
                    { name: '⚙️ Technical Vector', value: `${generateRibbon(technical)} **${technical}%**`, inline: true },
                    { name: '⚔️ Tactical Vector', value: `${generateRibbon(tactical)} **${tactical}%**`, inline: true },
                    { name: '📊 Core Proficiency', value: `\`${rank} RANK SPECIALIST\``, inline: true },
                    { name: '✨ Signal Yield', value: `\`${points.toLocaleString()} pts\``, inline: true },
                    { name: '🔄 Sync Rating', value: '`OPTIMAL`', inline: true }
                ],
                footer: 'Skill Tree Visualization • V3 Workforce Hyper-Apex Suite',
                color: 'premium'
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Zenith Skill Tree Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('Skill Matrix failure: Unable to map neural proficiency branches.')] });
        }
    }
};
