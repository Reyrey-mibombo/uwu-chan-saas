const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/enhancedEmbeds');
const { User, Guild, Shift, Activity } = require('../../database/mongo');
const PromotionSystem = require('../../utils/promotionSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('staff_terminal')
        .setDescription('👔 Access the unified staff operational terminal'),

    async execute(interaction, client) {
        try {
            await interaction.deferReply({ ephemeral: true });
            await this.renderTerminal(interaction, client);
        } catch (error) {
            console.error('Staff Terminal Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('Failed to initialize staff terminal.')] });
        }
    },

    async renderTerminal(interaction, client) {
        const userId = interaction.user.id;
        const guildId = interaction.guildId;

        const user = await User.findOne({ userId });
        const guildData = await Guild.findOne({ guildId });
        const guildProfile = user?.guilds?.find(g => g.guildId === guildId);

        if (!guildProfile || !guildProfile.staff) {
            return await interaction.editReply({ embeds: [createErrorEmbed('No staff record found. Please register first.')] });
        }

        const stats = await PromotionSystem.getUserStats(userId, guildId, user);
        const activeShift = await Shift.findOne({ userId, guildId, endTime: null });

        const statusEmoji = activeShift ? (activeShift.status === 'paused' ? '🟡' : '🟢') : '🔴';
        const statusText = activeShift ? (activeShift.status === 'paused' ? 'ON BREAK' : 'ON DUTY') : 'OFF DUTY';

        const embed = await createCustomEmbed(interaction, {
            title: '👔 Staff Operational Terminal',
            description: `### 🛡️ Personnel: ${interaction.user.username}\nUnified control interface for server operations and personnel tracking.`,
            thumbnail: interaction.user.displayAvatarURL({ dynamic: true }),
            fields: [
                { name: '📡 Current Status', value: `\`${statusEmoji} ${statusText}\``, inline: true },
                { name: '🛡️ Rank', value: `\`${(guildProfile.staff.rank || 'trial').toUpperCase()}\``, inline: true },
                { name: '✨ Points', value: `\`${stats.points.toLocaleString()}\``, inline: true },
                { name: '⏱️ Total Shift Hours', value: `\`${stats.shiftHours}h\``, inline: true },
                { name: '✅ Record', value: `\`${stats.consistency}% Consistency\``, inline: true },
                { name: '⚠️ Warnings', value: `\`${stats.warnings}\``, inline: true }
            ],
            footer: 'Unified Operational Interface • V3 Strategic',
            color: activeShift ? 'success' : 'primary'
        });

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(activeShift ? `terminal_end_${activeShift._id}` : 'terminal_start')
                .setLabel(activeShift ? 'End Shift' : 'Start Shift')
                .setEmoji(activeShift ? '⏹️' : '▶️')
                .setStyle(activeShift ? ButtonStyle.Danger : ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(activeShift?.status === 'paused' ? `terminal_resume_${activeShift?._id}` : `terminal_pause_${activeShift?._id}`)
                .setLabel(activeShift?.status === 'paused' ? 'Resume' : 'Pause')
                .setEmoji(activeShift?.status === 'paused' ? '▶️' : '⏸️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!activeShift)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('terminal_refresh')
                .setLabel('Refresh Stats')
                .setEmoji('🔄')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('terminal_achievements')
                .setLabel('Achievements')
                .setEmoji('🏆')
                .setStyle(ButtonStyle.Primary)
        );

        await interaction.editReply({ embeds: [embed], components: [row1, row2] });
    }
};
