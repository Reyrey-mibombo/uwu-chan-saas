const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mastery')
        .setDescription('🎖️ View your command proficiency and mastery levels')
        .addUserOption(opt => opt.setName('user').setDescription('Staff member (Optional)')),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            const targetUser = interaction.options.getUser('user') || interaction.user;

            const userData = await User.findOne({ userId: targetUser.id, guildId: interaction.guildId }).lean();

            if (!userData || !userData.staff || !userData.staff.commandUsage) {
                return interaction.editReply({ embeds: [createErrorEmbed(`No mastery data calibrated for <@${targetUser.id}>.`)] });
            }

            const mastery = userData.staff.commandUsage;
            const sortedKeys = Object.keys(mastery).sort((a, b) => mastery[b] - mastery[a]);

            if (sortedKeys.length === 0) {
                return interaction.editReply({ embeds: [createErrorEmbed(`Search failed: <@${targetUser.id}> has not yet mastered any operational modules.`)] });
            }

            const masteryLines = sortedKeys.slice(0, 5).map(key => {
                const count = mastery[key];
                const lvl = Math.floor(Math.sqrt(count)) + 1; // Mastery Level logic
                const filled = Math.min(10, Math.floor((count % (lvl * lvl)) / (lvl * lvl / 10))) || 0;
                const bar = `\`${'■'.repeat(filled)}${'□'.repeat(10 - filled)}\``;
                return `➔ **${key.toUpperCase()}** \`LVL ${lvl}\`\n${bar} \`${count} Ops\``;
            });

            const embed = await createCustomEmbed(interaction, {
                title: `🎖️ Command Mastery: ${targetUser.username}`,
                thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
                description: `### 🛡️ Module Proficiency Metrics\nDetailed analysis of module-specific engagement and operational mastery within the **${interaction.guild.name}** sector.`,
                fields: [
                    { name: '🔥 Top Proficiencies', value: masteryLines.join('\n\n'), inline: false },
                    { name: '📊 Aggregate Expertise', value: `\`${Object.keys(mastery).length}\` Modules Mastered`, inline: true }
                ],
                footer: 'Mastery levels increase based on validated command throughput.',
                color: 'premium'
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Mastery Command Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('Failed to query the mastery registry.')] });
        }
    }
};
