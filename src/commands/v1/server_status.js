const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server_status')
        .setDescription('View live, real-time analytics from the Discord server cache.'),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            const guild = interaction.guild;

            // Force fetch members if possible, otherwise use cache
            await guild.members.fetch({ force: false }).catch(() => { });

            const totalMembers = guild.memberCount;
            const onlineMembers = guild.members.cache.filter(m => m.presence?.status === 'online').size;
            const idleMembers = guild.members.cache.filter(m => m.presence?.status === 'idle').size;
            const dndMembers = guild.members.cache.filter(m => m.presence?.status === 'dnd').size;
            const offlineMembers = totalMembers - (onlineMembers + idleMembers + dndMembers);

            const bots = guild.members.cache.filter(m => m.user.bot).size;
            const humans = totalMembers - bots;

            const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
            const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;

            let voiceActive = 0;
            guild.channels.cache.filter(c => c.type === 2).forEach(vc => {
                voiceActive += vc.members.size;
            });

            const rolesCount = guild.roles.cache.size;
            const emojisCount = guild.emojis.cache.size;
            const boostTier = guild.premiumTier;
            const boostCount = guild.premiumSubscriptionCount || 0;

            const { Shift, User } = require('../../database/mongo');
            const [globalShifts, globalPointsData] = await Promise.all([
                Shift.countDocuments({ endTime: { $ne: null } }),
                User.aggregate([
                    { $group: { _id: null, total: { $sum: "$staff.points" } } }
                ])
            ]);
            const globalPoints = globalPointsData[0]?.total || 0;

            const embed = await createCustomEmbed(interaction, {
                title: `📊 Macroscopic Status: ${guild.name}`,
                thumbnail: guild.iconURL({ dynamic: true }),
                description: `**ID:** \`${guild.id}\`\n**Owner:** <@${guild.ownerId}>\n**Clearance:** \`V2 APEX\``,
                footer: 'Real-time telemetry aggregated from local cache and global spectral logs.'
            });

            embed.addFields(
                { name: '👥 Population', value: `Total: **${totalMembers.toLocaleString()}**\nHumans: **${humans.toLocaleString()}**\nBots: **${bots.toLocaleString()}**`, inline: true },
                { name: '🟢 Presence', value: `Online: **${onlineMembers.toLocaleString()}**\nIdle: **${idleMembers.toLocaleString()}**\nDND: **${dndMembers.toLocaleString()}**`, inline: true },
                { name: '💬 Engagement', value: `Text: **${textChannels}**\nVoice: **${voiceChannels}**\nIn Voice: **${voiceActive}**`, inline: true },
                { name: '🌎 Global Volume', value: `Total Shifts: **${globalShifts.toLocaleString()}**\nGlobal Points: **${globalPoints.toLocaleString()}**`, inline: false },
                { name: '💎 Boosting', value: `Tier: **${boostTier}**\nBoosts: **${boostCount}**`, inline: true },
                { name: '🛠️ Metadata', value: `Roles: **${rolesCount}**\nEmojis: **${emojisCount}**`, inline: true }
            );

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Server Status Error:', error);
            const errEmbed = createErrorEmbed('An error occurred while analyzing the server cache.');
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [errEmbed] });
            } else {
                await interaction.reply({ embeds: [errEmbed], ephemeral: true });
            }
        }
    }
};
