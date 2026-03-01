const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User, Shift, Activity } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile_card')
        .setDescription('📇 View your high-fidelity Staff Passport and operational identity')
        .addUserOption(opt => opt.setName('user').setDescription('Staff member (Optional)').setRequired(false)),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const guildId = interaction.guildId;

            const [userData, shifts, activities] = await Promise.all([
                User.findOne({ userId: targetUser.id, guildId }).lean(),
                Shift.find({ userId: targetUser.id, guildId }).lean(),
                Activity.find({ userId: targetUser.id, guildId }).lean()
            ]);

            if (!userData || !userData.staff) {
                return interaction.editReply({ embeds: [createErrorEmbed(`No staff profile detected for <@${targetUser.id}> in this sector.`)] });
            }

            const points = userData.staff.points || 0;
            const rank = (userData.staff.rank || 'Trial').toUpperCase();
            const achievements = userData.staff.achievements || [];
            const totalShifts = shifts.length;

            // [Ultra] Leveling & Personalization
            const level = userData.staff.level || 1;
            const xp = userData.staff.xp || 0;
            const { calculateXPNeeded } = require('../../utils/xpSystem');
            const xpNeeded = calculateXPNeeded(level);
            const xpPercent = Math.min(100, Math.floor((xp / xpNeeded) * 100));
            const xpFilled = Math.floor(xpPercent / 10);
            const xpBar = `\`${'■'.repeat(xpFilled)}${'□'.repeat(10 - xpFilled)}\` **${xpPercent}%**`;

            const tagline = userData.staff.tagline || 'Operational Personnel';
            const customColor = userData.staff.profileColor || null;

            // Calculate efficiency (completion rate)
            const completedShifts = shifts.filter(s => s.endTime).length;
            const efficiency = totalShifts > 0 ? Math.round((completedShifts / totalShifts) * 100) : 0;

            const badgeList = achievements.length > 0
                ? achievements.slice(0, 5).map(a => `\`${a}\``).join(' ')
                : '*No badges awarded*';

            const embed = await createCustomEmbed(interaction, {
                title: `📇 Staff Passport: ${targetUser.username}`,
                thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
                description: `### 🛡️ Sector Identity: ${interaction.guild.name}\n> *${tagline}*\nAuthorized personnel profile for **${targetUser.username}**. All telemetry verified.`,
                fields: [
                    { name: '📂 Classification', value: `\`${rank}\``, inline: true },
                    { name: '✨ Level Clearance', value: `\`LVL ${level}\``, inline: true },
                    { name: '⭐ Strategic Points', value: `\`${points.toLocaleString()}\``, inline: true },
                    { name: '🔋 Level Progress', value: xpBar, inline: false },
                    { name: '📊 Efficiency', value: `\`${efficiency}%\``, inline: true },
                    { name: '🔄 Lifetime Patrols', value: `\`${totalShifts.toLocaleString()}\``, inline: true },
                    { name: '🏅 Active Merits', value: badgeList, inline: false }
                ],
                footer: 'Blockchain-verified Operational Identity • V2 Ultra',
                color: customColor || (efficiency >= 90 ? 'success' : 'premium')
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Profile Card Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('An error occurred while generating the high-fidelity identity card.')] });
        }
    }
};
