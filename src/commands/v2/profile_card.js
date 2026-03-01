const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User, Shift, Activity } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile_card')
        .setDescription('Zenith Hyper-Apex: Macroscopic Staff Passport & Identity Dossier')
        .addUserOption(opt => opt.setName('user').setDescription('Sector Personnel (Optional)').setRequired(false)),

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
                return interaction.editReply({ embeds: [createErrorEmbed(`No signal dossier found for <@${targetUser.id}>.`)] });
            }

            const points = userData.staff.points || 0;
            const rank = (userData.staff.rank || 'Trial').toUpperCase();
            const achievements = userData.staff.achievements || [];
            const totalShifts = shifts.length;
            const level = userData.staff.level || 1;
            const xp = userData.staff.xp || 0;
            const equippedPerk = userData.staff.equippedPerk || 'Standard Personnel';

            const { calculateXPNeeded } = require('../../utils/xpSystem');
            const xpNeeded = calculateXPNeeded(level);

            const xpPercent = Math.min(100, Math.floor((xp / xpNeeded) * 100));
            const barLength = 15;
            const filled = '█'.repeat(Math.round((xpPercent / 100) * barLength));
            const empty = '░'.repeat(barLength - filled.length);
            const resonanceRibbon = `\`[${filled}${empty}]\` **${xpPercent}%**`;

            const completedShifts = shifts.filter(s => s.endTime).length;
            const efficiency = totalShifts > 0 ? Math.round((completedShifts / totalShifts) * 100) : 0;

            const efficiencyLength = 10;
            const effFilled = '█'.repeat(Math.round(efficiency / 10));
            const effEmpty = '░'.repeat(efficiencyLength - effFilled.length);
            const metabolicRibbon = `\`[${effFilled}${effEmpty}]\` **${efficiency}%**`;

            const badgeList = achievements.length > 0
                ? achievements.slice(0, 5).map(a => `\`${a}\``).join(' ')
                : '*No badges awarded*';

            const embed = await createCustomEmbed(interaction, {
                title: `📇 Zenith Hyper-Apex: Staff Passport`,
                thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
                description: `### 🛡️ Sector Identity Dossier\nAuthenticated personnel profile for **${targetUser.username}**. Resonance synchronization active.\n\n**💎 ZENITH HYPER-APEX EXCLUSIVE**`,
                fields: [
                    { name: '📂 Classification', value: `\`${rank}\``, inline: true },
                    { name: '✨ Level Clearance', value: `\`LVL ${level}\``, inline: true },
                    { name: '⭐ Strategic Points', value: `\`${points.toLocaleString()}\``, inline: true },
                    { name: '🔋 Resonance Ribbon', value: resonanceRibbon, inline: false },
                    { name: '📊 Metabolic Efficiency', value: metabolicRibbon, inline: false },
                    { name: '🎖️ Tactical Perk', value: `\`${equippedPerk.toUpperCase()}\``, inline: true },
                    { name: '🔄 Lifetime Patrols', value: `\`${totalShifts.toLocaleString()}\``, inline: true },
                    { name: '🏅 Active Merits', value: badgeList, inline: false },
                    { name: '🌐 Global Benchmark', value: '`🟢 ELITE S-TIER`', inline: true }
                ],
                footer: 'Blockchain-verified Operational Identity • V2 Expansion Hyper-Apex',
                color: (efficiency >= 90 ? 'success' : 'premium')
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Profile Card Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('Dossier failure: Unable to synchronize high-fidelity identity card.')] });
        }
    }
};
