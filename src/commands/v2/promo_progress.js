const { SlashCommandBuilder } = require('discord.js');
const { User, Guild } = require('../../database/mongo');
const { createCoolEmbed } = require('../../utils/embeds');
const PromotionSystem = require('../../utils/promotionSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('promo_progress')
        .setDescription('📊 View your visual progress towards the next staff rank')
        .addUserOption(opt => opt.setName('user').setDescription('View progress of another staff member').setRequired(false)),

    async execute(interaction, client) {
        await interaction.deferReply();
        const targetUser = interaction.options.getUser('user') || interaction.user;

        const user = await User.findOne({ userId: targetUser.id });
        if (!user || !user.staff) {
            return interaction.editReply({ content: '❌ This user is not registered in the staff system.', ephemeral: true });
        }

        const guildData = await Guild.findOne({ guildId: interaction.guildId });
        const currentRank = user.staff.rank || 'member';

        const nextReq = PromotionSystem.getNextRankRequirements(currentRank, guildData);
        if (!nextReq) {
            return interaction.editReply({
                embeds: [
                    createCoolEmbed({
                        title: '🌟 Maximum Rank Reached!',
                        description: `Congratulations **${targetUser.username}**, you have reached the highest rank currently available: **${currentRank.toUpperCase()}**!`,
                        color: 'premium',
                        thumbnail: targetUser.displayAvatarURL()
                    })
                ]
            });
        }

        const stats = await PromotionSystem.getUserStats(targetUser.id, interaction.guildId, user);

        const embed = createCoolEmbed({
            title: `📊 Promotion Path: ${nextReq.rank.toUpperCase()}`,
            description: `Hey **${targetUser.username}**, here is your journey to becoming a **${nextReq.rank.toUpperCase()}**. Keep it up!`,
            color: 'info',
            thumbnail: targetUser.displayAvatarURL()
        });

        // Add Progress Bars
        embed.addFields(
            {
                name: `⭐ Points: ${stats.points} / ${nextReq.points}`,
                value: PromotionSystem.generateProgressBar(stats.points, nextReq.points),
                inline: false
            },
            {
                name: `🔄 Shifts: ${stats.shifts} / ${nextReq.shifts}`,
                value: PromotionSystem.generateProgressBar(stats.shifts, nextReq.shifts),
                inline: false
            },
            {
                name: `📈 Consistency: ${stats.consistency}% / ${nextReq.consistency}%`,
                value: PromotionSystem.generateProgressBar(stats.consistency, nextReq.consistency),
                inline: false
            }
        );

        if (nextReq.maxWarnings !== undefined) {
            const warningStatus = stats.warnings <= nextReq.maxWarnings ? '✅ Clear' : '❌ Too many warnings';
            embed.addFields({ name: '⚠️ Warning Limit', value: `\`${stats.warnings} / ${nextReq.maxWarnings}\` (${warningStatus})`, inline: true });
        }

        if (nextReq.shiftHours > 0) {
            embed.addFields({ name: '⏱️ Shift Hours', value: `\`${stats.shiftHours}h / ${nextReq.shiftHours}h\``, inline: true });
        }

        embed.setFooter({ text: 'Data updates automatically as you complete shifts and tasks! ✨' });

        await interaction.editReply({ embeds: [embed] });
    }
};
