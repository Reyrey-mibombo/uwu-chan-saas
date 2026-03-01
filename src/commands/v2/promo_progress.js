const { SlashCommandBuilder } = require('discord.js');
const { User, Guild } = require('../../database/mongo');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const PromotionSystem = require('../../utils/promotionSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('promo_progress')
        .setDescription('📊 View your authentic visual progress towards the next staff rank')
        .addUserOption(opt => opt.setName('user').setDescription('View progress of another staff member').setRequired(false)),

    async execute(interaction, client) {
        try {
            await interaction.deferReply();
            const targetUser = interaction.options.getUser('user') || interaction.user;

            // STRICT SCOPING: Search specifically by BOTH userId and guildId
            const user = await User.findOne({ userId: targetUser.id, guildId: interaction.guildId }).lean();
            if (!user || !user.staff) {
                return interaction.editReply({ embeds: [createErrorEmbed(`The user <@${targetUser.id}> is not registered in the staff system for this server.`)] });
            }

            const guildData = await Guild.findOne({ guildId: interaction.guildId }).lean();
            if (!guildData || !guildData.promotionRequirements) {
                return interaction.editReply({ embeds: [createErrorEmbed('This server has not configured any promotion requirements.')] });
            }

            const currentRank = user.staff.rank || 'member';

            // Requires an update to utils/promotionSystem to ensure it reads the keys properly.
            // But we can enforce dynamic keys here if the utility hasn't been updated yet.
            const ranks = Object.keys(guildData.promotionRequirements);
            if (!ranks.includes('member')) ranks.unshift('member');
            if (!ranks.includes('trial')) ranks.splice(1, 0, 'trial');

            const currentIndex = ranks.indexOf(currentRank);
            const nextRankName = ranks[currentIndex + 1];

            if (!nextRankName || !guildData.promotionRequirements[nextRankName]) {
                const maxEmbed = await createCustomEmbed(interaction, {
                    title: '🌟 Maximum Rank Reached!',
                    description: `Congratulations <@${targetUser.id}>, you have reached the highest rank currently available: **${currentRank.toUpperCase()}**!`,
                    thumbnail: targetUser.displayAvatarURL(),
                    footer: 'Top of the command chain'
                });
                return interaction.editReply({ embeds: [maxEmbed] });
            }

            const nextReq = guildData.promotionRequirements[nextRankName];

            // Re-implementing PromotionSystem.getUserStats locally to ensure strict guild scoping 
            // since the utility might globally leak if not updated simultaneously.
            const shiftCount = await require('../../database/mongo').Shift.countDocuments({ userId: targetUser.id, guildId: interaction.guildId, endTime: { $ne: null } });
            const warningCount = await require('../../database/mongo').Warning.countDocuments({ userId: targetUser.id, guildId: interaction.guildId });
            const shiftsData = await require('../../database/mongo').Shift.find({ userId: targetUser.id, guildId: interaction.guildId }).lean();
            const totalHours = Math.floor(shiftsData.reduce((acc, s) => acc + (s.duration || 0), 0) / 3600);

            const stats = {
                points: user.staff.points || 0,
                consistency: user.staff.consistency || 0,
                shifts: shiftCount,
                warnings: warningCount,
                shiftHours: totalHours
            };

            const generateProgressBar = (current, max) => {
                const pct = Math.min(100, Math.round((current / max) * 100)) || 0;
                const filled = Math.min(10, Math.floor(pct / 10));
                return `\`${'█'.repeat(filled)}${'░'.repeat(10 - filled)}\` **${pct}%**`;
            };

            const embed = await createCustomEmbed(interaction, {
                title: `📊 Promotion Path: ${nextRankName.toUpperCase()}`,
                description: `Hey <@${targetUser.id}>, here is your authentic journey to becoming a **${nextRankName.toUpperCase()}** in **${interaction.guild.name}**.`,
                thumbnail: targetUser.displayAvatarURL(),
                footer: 'Data updates automatically as you complete shifts and tasks! ✨'
            });

            embed.addFields(
                {
                    name: `⭐ Points: \`${stats.points} / ${nextReq.points}\``,
                    value: generateProgressBar(stats.points, nextReq.points),
                    inline: false
                },
                {
                    name: `🔄 Shifts: \`${stats.shifts} / ${nextReq.shifts}\``,
                    value: generateProgressBar(stats.shifts, nextReq.shifts),
                    inline: false
                },
                {
                    name: `📈 Consistency: \`${stats.consistency}% / ${nextReq.consistency}%\``,
                    value: generateProgressBar(stats.consistency, nextReq.consistency),
                    inline: false
                }
            );

            if (nextReq.maxWarnings !== undefined) {
                const warningStatus = stats.warnings <= nextReq.maxWarnings ? '✅ Clear' : '❌ Too many warnings';
                embed.addFields({ name: '⚠️ Warning Limit', value: `\`${stats.warnings} / ${nextReq.maxWarnings}\` (${warningStatus})`, inline: true });
            }

            if (nextReq.shiftHours > 0) {
                const hoursStatus = stats.shiftHours >= nextReq.shiftHours ? '✅ Met' : '❌ Needs Hours';
                embed.addFields({ name: '⏱️ Minimum Hours', value: `\`${stats.shiftHours}h / ${nextReq.shiftHours}h\` (${hoursStatus})`, inline: true });
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Promo Progress Error:', error);
            const errEmbed = createErrorEmbed('An error occurred while fetching your promotion progress.');
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [errEmbed] });
            } else {
                await interaction.reply({ embeds: [errEmbed], ephemeral: true });
            }
        }
    }
};
