const { User } = require('../database/mongo');
const { createPremiumEmbed } = require('./embeds');

const XP_PER_COMMAND = 15;
const XP_MIN_VARIANCE = -5;
const XP_MAX_VARIANCE = 10;
const BASE_XP_REQUIREMENT = 100;

function calculateXPNeeded(level) {
    // Basic scaling: 100, 250, 450, 700...
    return BASE_XP_REQUIREMENT + (level * 50 * level);
}

async function handleCommandXP(interaction) {
    const userId = interaction.user.id;

    try {
        let user = await User.findOne({ userId });
        if (!user) {
            user = new User({ userId, username: interaction.user.username });
        }

        if (!user.staff) user.staff = {};
        if (!user.staff.commandUsage) user.staff.commandUsage = {};

        // Track Mastery
        const cmdName = interaction.commandName;
        user.staff.commandUsage[cmdName] = (user.staff.commandUsage[cmdName] || 0) + 1;

        const currentXP = user.staff.xp || 0;
        const currentLevel = user.staff.level || 1;

        // Random XP granted between 10 and 25
        const xpGained = XP_PER_COMMAND + Math.floor(Math.random() * (XP_MAX_VARIANCE - XP_MIN_VARIANCE + 1)) + XP_MIN_VARIANCE;

        user.staff.xp = currentXP + xpGained;

        const xpNeeded = calculateXPNeeded(currentLevel);

        let leveledUp = false;
        if (user.staff.xp >= xpNeeded) {
            user.staff.level = currentLevel + 1;
            user.staff.xp = user.staff.xp - xpNeeded; // Carry over XP
            leveledUp = true;
        }

        await user.save();

        if (leveledUp) {
            const { broadcastMilestone } = require('./milestone_broadcast');
            await broadcastMilestone(interaction, 'RANK_UP', {
                userId: userId,
                newRank: `Level ${user.staff.level}`
            });

            const embed = createPremiumEmbed({
                title: '🎉 PERSONNEL LEVEL UP!',
                description: `Congratulations <@${userId}>! Your operational clearance has increased!\n\nYou have transitioned to **Staff Level ${user.staff.level}**!`,
                thumbnail: interaction.user.displayAvatarURL({ dynamic: true })
            }).setColor('#ffaa00');

            await interaction.followUp({ embeds: [embed], ephemeral: true });
        }
    } catch (err) {
        console.error('Error handling command XP:', err);
    }
}

module.exports = { handleCommandXP, calculateXPNeeded };
