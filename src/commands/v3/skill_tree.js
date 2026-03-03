const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed, createErrorEmbed, createPremiumEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { User } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skill_tree')
        .setDescription('Enterprise Hyper-Apex: Macroscopic Proficiency Branches & Skill Mastery')
        .addUserOption(opt => opt.setName('user').setDescription('Sector Personnel (Optional)').setRequired(false)),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            // Enterprise Hyper-Apex License Guard
            const license = await validatePremiumLicense(interaction, 'premium');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: license.components });
            }

            const targetUser = interaction.options.getUser('user') || interaction.user;
            const userData = await User.findOne({ userId: targetUser.id, guildId: interaction.guildId }).lean();

            if (!userData || !userData.staff) {
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v3_skill_tree').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed(`No signal dossier found for <@${targetUser.id}>.`)], components: [row] });
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
                title: `🌳 Enterprise Hyper-Apex: Proficiency Branches`,
                thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
                description: `### 🛡️ Macroscopic Skill Matrix\nMapping neural proficiency branches and command specializations for **${targetUser.username}**.\n\n\`\`\`\n${skillMap}\`\`\`\n**💎 Enterprise HYPER-APEX EXCLUSIVE**`,
                fields: [
                    { name: '👑 Leadership Vector', value: `${generateRibbon(leadership)} **${leadership}%**`, inline: true },
                    { name: '⚙️ Technical Vector', value: `${generateRibbon(technical)} **${technical}%**`, inline: true },
                    { name: '⚔️ Tactical Vector', value: `${generateRibbon(tactical)} **${tactical}%**`, inline: true },
                    { name: '📊 Core Proficiency', value: `\`${rank} RANK SPECIALIST\``, inline: true },
                    { name: '✨ Signal Yield', value: `\`${points.toLocaleString()} pts\``, inline: true },
                    { name: '  Sync Rating', value: '`OPTIMAL`', inline: true }
                ],
                footer: 'Skill Tree Visualization • V3 Workforce Hyper-Apex Suite',
                color: 'premium'
            });

            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v3_skill_tree').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Enterprise Skill Tree Error:', error);
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v3_skill_tree').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed('Skill Matrix failure: Unable to map neural proficiency branches.')], components: [row] });
        }
    }
};


