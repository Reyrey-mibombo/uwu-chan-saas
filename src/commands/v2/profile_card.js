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

            // Calculate efficiency (completion rate)
            const completedShifts = shifts.filter(s => s.endTime).length;
            const efficiency = totalShifts > 0 ? Math.round((completedShifts / totalShifts) * 100) : 0;

            const badgeList = achievements.length > 0
                ? achievements.slice(0, 5).map(a => `\`${a}\``).join(' ')
                : '*No badges awarded*';

            const embed = await createCustomEmbed(interaction, {
                title: `📇 Staff Passport: ${targetUser.username}`,
                thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
                description: `### 🛡️ Sector Identity: ${interaction.guild.name}\nAuthorized personnel profile for **${targetUser.username}**. All telemetry verified.`,
                fields: [
                    { name: '📂 Classification', value: `\`${rank}\``, inline: true },
                    { name: '⭐ Strategic Points', value: `\`${points.toLocaleString()}\``, inline: true },
                    { name: '📊 Efficiency', value: `\`${efficiency}%\``, inline: true },
                    { name: '🔄 Lifetime Patrols', value: `\`${totalShifts.toLocaleString()}\``, inline: true },
                    { name: '🏅 Active Merits', value: badgeList, inline: false }
                ],
                footer: 'Blockchain-verified Operational Identity • V2 Enterprise',
                color: efficiency >= 90 ? 'success' : efficiency >= 70 ? 'premium' : 'primary'
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Profile Card Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('An error occurred while generating the high-fidelity identity card.')] });
        }
    }
};
