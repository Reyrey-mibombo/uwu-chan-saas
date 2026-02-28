const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { User, Guild, Shift, Warning, Activity } = require('../database/mongo');
const { createCoolEmbed, createSuccessEmbed, createErrorEmbed } = require('./embeds');
const logger = require('./logger');

class PromotionSystem {
    /**
     * Generates a sleek visual progress bar
     * @param {number} current Current value
     * @param {number} target Target value
     * @param {number} length Length of the bar in characters
     * @returns {string} Progress bar string
     */
    static generateProgressBar(current, target, length = 15) {
        if (target <= 0) return '`▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰` 100%';
        const percentage = Math.min(1, current / target);
        const filledLength = Math.round(length * percentage);
        const emptyLength = length - filledLength;

        const bar = '▰'.repeat(filledLength) + '▱'.repeat(emptyLength);
        return `\`${bar}\` ${Math.round(percentage * 100)}%`;
    }

    /**
     * Gets requirements for the next rank
     * @param {string} currentRank 
     * @param {object} guildData 
     * @returns {object}
     */
    static getNextRankRequirements(currentRank, guildData) {
        const RANK_ORDER = ['member', 'trial', 'staff', 'senior', 'manager', 'admin'];
        const currentIndex = RANK_ORDER.indexOf(currentRank);
        const nextRank = RANK_ORDER[currentIndex + 1];

        if (!nextRank || nextRank === 'admin' && currentRank === 'admin') return null;

        const defaultReqs = {
            staff: { points: 100, shifts: 5, consistency: 70, maxWarnings: 3, shiftHours: 0 },
            senior: { points: 300, shifts: 10, consistency: 75, maxWarnings: 2, shiftHours: 0 },
            manager: { points: 600, shifts: 20, consistency: 80, maxWarnings: 1, shiftHours: 0 },
            admin: { points: 1000, shifts: 30, consistency: 85, maxWarnings: 0, shiftHours: 0 }
        };

        const req = guildData.promotionRequirements?.[nextRank] || defaultReqs[nextRank];
        return { rank: nextRank, ...req };
    }

    /**
     * Checks if a user is eligible for a promotion
     * @param {string} userId 
     * @param {string} guildId 
     * @returns {object|null} The new rank if eligible, else null
     */
    static async checkEligibility(userId, guildId, client) {
        const user = await User.findOne({ userId });
        if (!user || !user.staff) return null;

        const guildData = await Guild.findOne({ guildId });
        if (!guildData || !guildData.settings?.modules?.automation) return null;

        const currentRank = user.staff.rank || 'member';
        const nextReq = this.getNextRankRequirements(currentRank, guildData);
        if (!nextReq) return null;

        // Gather real data
        const stats = await this.getUserStats(userId, guildId, user);

        // Check thresholds
        const meetsPoints = stats.points >= (nextReq.points || 0);
        const meetsShifts = stats.shifts >= (nextReq.shifts || 0);
        const meetsConsistency = stats.consistency >= (nextReq.consistency || 0);
        const meetsWarnings = stats.warnings <= (nextReq.maxWarnings ?? 3);
        const meetsHours = stats.shiftHours >= (nextReq.shiftHours || 0);

        if (meetsPoints && meetsShifts && meetsConsistency && meetsWarnings && meetsHours) {
            return await this.executePromotion(userId, guildId, nextReq.rank, stats, guildData, client);
        }

        return null;
    }

    /**
     * Executes the promotion process
     */
    static async executePromotion(userId, guildId, newRank, stats, guildData, client) {
        await User.findOneAndUpdate(
            { userId },
            {
                $set: {
                    'staff.rank': newRank,
                    'staff.lastPromotionDate': new Date()
                }
            }
        );

        const discordGuild = client.guilds.cache.get(guildId);
        if (!discordGuild) return { rank: newRank, success: true };

        const member = await discordGuild.members.fetch(userId).catch(() => null);
        if (member) {
            // Role assignment
            const rankRole = guildData.rankRoles?.[newRank];
            if (rankRole) {
                await member.roles.add(rankRole).catch(e => logger.error(`Failed to assign role ${rankRole} to ${userId}: ${e.message}`));
            }
        }

        // Announcement
        const promoChannelId = guildData.settings?.promotionChannel;
        if (promoChannelId) {
            const channel = discordGuild.channels.cache.get(promoChannelId);
            if (channel) {
                const embed = this.createPromotionEmbed(userId, newRank, stats, member);
                await channel.send({ content: `🎊 **HUGE CONGRATULATIONS TO <@${userId}>!** 🎊`, embeds: [embed] });
            }
        }

        return { rank: newRank, success: true };
    }

    /**
     * Gathers real data for a user
     */
    static async getUserStats(userId, guildId, userDoc = null) {
        const user = userDoc || await User.findOne({ userId });
        const shiftCount = await Shift.countDocuments({ guildId, userId, endTime: { $ne: null } });
        const warningCount = await Warning.countDocuments({ guildId, userId });

        const allShifts = await Shift.find({ guildId, userId, endTime: { $ne: null } });
        const totalDuration = allShifts.reduce((acc, s) => acc + (s.duration || 0), 0);
        const shiftHours = Math.round(totalDuration / 3600);

        return {
            points: user?.staff?.points || 0,
            shifts: shiftCount,
            warnings: warningCount,
            consistency: user?.staff?.consistency || 100,
            shiftHours: shiftHours,
            username: user?.username || 'Unknown'
        };
    }

    /**
     * Creates a high-impact promotion embed
     */
    static createPromotionEmbed(userId, newRank, stats, member) {
        const rankEmojis = { trial: '🌱', staff: '🛡️', senior: '🌟', manager: '💎', admin: '👑' };
        const emoji = rankEmojis[newRank] || '✨';

        return createCoolEmbed({
            title: `🚀 RANK UP: ${newRank.toUpperCase()}!`,
            description: `**<@${userId}>** has proven their dedication and has been promoted to **${emoji} ${newRank.toUpperCase()}**!`,
            color: 'success',
            thumbnail: member?.user?.displayAvatarURL() || null
        }).addFields(
            { name: '📊 Career Stats', value: `> **Points:** ${stats.points}\n> **Shifts:** ${stats.shifts}\n> **Hours:** ${stats.shiftHours}h`, inline: true },
            { name: '✅ Record', value: `> **Consistency:** ${stats.consistency}%\n> **Warnings:** ${stats.warnings}`, inline: true },
            { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:D>`, inline: true }
        ).setFooter({ text: 'Keep up the legendary work! ✨' });
    }
}

module.exports = PromotionSystem;
