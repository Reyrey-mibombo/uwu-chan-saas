const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mastery')
        .setDescription('View command usage mastery stats')
        .addUserOption(opt => opt.setName('user').setDescription('User to check (Optional)')),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            const targetUser = interaction.options.getUser('user') || interaction.user;

            const userData = await User.findOne({ userId: targetUser.id, 'guilds.guildId': interaction.guildId }).lean();

            if (!userData || !userData.staff || !userData.staff.commandUsage) {
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_mastery').setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary));
                return await interaction.editReply({ embeds: [createErrorEmbed('No mastery data found for this user.')], components: [row] });
            }

            const mastery = userData.staff.commandUsage;
            const sortedKeys = Object.keys(mastery).sort((a, b) => mastery[b] - mastery[a]).slice(0, 6);

            if (sortedKeys.length === 0) {
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_mastery').setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary));
                return await interaction.editReply({ embeds: [createErrorEmbed('No command usage data found.')], components: [row] });
            }

            const totalUsage = Object.values(mastery).reduce((a, b) => a + b, 0);

            const expertiseLines = sortedKeys.map(key => {
                const count = mastery[key];
                const lvl = Math.floor(Math.sqrt(count)) + 1;
                const barLength = 8;
                const filled = '█'.repeat(Math.min(barLength, Math.round((count / (lvl * 10)) * barLength)));
                const empty = '░'.repeat(barLength - filled.length);
                return `**${key}** \`LV${lvl}\` \`[${filled}${empty}]\` ${count} uses`;
            });

            const embed = await createCustomEmbed(interaction, {
                title: `🎖️ Command Mastery: ${targetUser.username}`,
                thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
                description: `Command usage stats for **${targetUser.username}**`,
                fields: [
                    { name: '📊 Top Commands', value: expertiseLines.join('\n'), inline: false },
                    { name: '📈 Total Uses', value: `\`${totalUsage}\` commands used`, inline: true },
                    { name: '🔧 Commands Used', value: `\`${Object.keys(mastery).length}\``, inline: true }
                ],
                color: 'primary'
            });

            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_mastery').setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Mastery Error:', error);
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_mastery').setLabel('🔄 Retry').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed('Failed to load mastery data.')], components: [row] });
        }
    }
};

