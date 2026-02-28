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

        if (!user.stats) user.stats = {};

        const currentXP = user.stats.xp || 0;
        const currentLevel = user.stats.level || 1;

        // Random XP granted between 10 and 25
        const xpGained = XP_PER_COMMAND + Math.floor(Math.random() * (XP_MAX_VARIANCE - XP_MIN_VARIANCE + 1)) + XP_MIN_VARIANCE;

        user.stats.xp = currentXP + xpGained;

        const xpNeeded = calculateXPNeeded(currentLevel);

        let leveledUp = false;
        if (user.stats.xp >= xpNeeded) {
            user.stats.level = currentLevel + 1;
            user.stats.xp = user.stats.xp - xpNeeded; // Carry over XP
            leveledUp = true;
        }

        await user.save();

        if (leveledUp) {
            const embed = createPremiumEmbed({
                title: '🎉 LEVEL UP!',
                description: `Congratulations <@${userId}>! You are a power user!\n\nYou have leveled up to **Bot Level ${user.stats.level}**!`,
                thumbnail: interaction.user.displayAvatarURL()
            }).setColor('#ffaa00').setImage('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3ZtMTMwaXZuOTVybWJ2ODRqaGdyNnZyZW94eTVxYTh4ODdrbDBycyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/BPJmthQ3YRwD6QqcVD/giphy.gif'); // Celebration GIF

            await interaction.followUp({ embeds: [embed], ephemeral: true });
        }
    } catch (err) {
        console.error('Error handling command XP:', err);
    }
}

module.exports = { handleCommandXP, calculateXPNeeded };
