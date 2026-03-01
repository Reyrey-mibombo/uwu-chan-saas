const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mastery')
        .setDescription('Zenith Hyper-Apex: macroscopic Module Proficiency & Hex-Mastery Profiling')
        .addUserOption(opt => opt.setName('user').setDescription('Personnel to audit (Optional)')),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            const targetUser = interaction.options.getUser('user') || interaction.user;

            const userData = await User.findOne({ userId: targetUser.id, guildId: interaction.guildId }).lean();

            if (!userData || !userData.staff || !userData.staff.commandUsage) {
                return interaction.editReply({ embeds: [createErrorEmbed(`No mastery calibration found for <@${targetUser.id}>.`)] });
            }

            const mastery = userData.staff.commandUsage;
            const sortedKeys = Object.keys(mastery).sort((a, b) => mastery[b] - mastery[a]).slice(0, 6);

            if (sortedKeys.length === 0) {
                return interaction.editReply({ embeds: [createErrorEmbed(`Search failed: <@${targetUser.id}> has no mastered modules.`)] });
            }

            // 1. Hex-Module Profiling (ASCII categorization)
            const expertiseLines = sortedKeys.map(key => {
                const count = mastery[key];
                const lvl = Math.floor(Math.sqrt(count)) + 1;
                const barLength = 10;
                const filled = '█'.repeat(Math.min(barLength, Math.round((count / (lvl * lvl * 5)) * barLength)));
                const empty = '░'.repeat(barLength - filled.length);
                return `➔ **${key.toUpperCase()}** \`LVL ${lvl}\`\n\`[${filled}${empty}]\` \`${count} Ops\``;
            });

            const embed = await createCustomEmbed(interaction, {
                title: `🎖️ Zenith Hyper-Apex: Module Mastery`,
                thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
                description: `### 🛡️ Macroscopic Hex-Proficiency Matrix\nMapping neural command proficiency and industrial-grade module mastery for **${targetUser.username}**.\n\n**💎 ZENITH HYPER-APEX EXCLUSIVE**`,
                fields: [
                    { name: '🔥 Module Expertise Ribbons', value: expertiseLines.join('\n'), inline: false },
                    { name: '📊 Total Nodes', value: `\`${Object.keys(mastery).length}\` Mastered`, inline: true },
                    { name: '✨ Mastery Velocity', value: '`OPTIMAL`', inline: true },
                    { name: '🌐 Global Sync', value: '`CONNECTED`', inline: true }
                ],
                footer: 'Hex-Mastery Profiling • V2 Expansion Hyper-Apex Suite',
                color: 'premium'
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Zenith Mastery Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('Mastery Registry failure: Unable to decode proficiency matrix.')] });
        }
    }
};
