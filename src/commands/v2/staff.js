const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { User, Guild, Activity } = require('../../database/mongo');
const { createSuccessEmbed, createErrorEmbed, createCoolEmbed } = require('../../utils/enhancedEmbeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('staff')
        .setDescription('Manage the server staff roster, ranks, and points (Admin Only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub => sub
            .setName('add')
            .setDescription('Add a user to the staff team')
            .addUserOption(opt => opt.setName('user').setDescription('User to add').setRequired(true))
            .addStringOption(opt => opt.setName('rank').setDescription('Initial rank').setRequired(true)
                .addChoices(
                    { name: 'Trial', value: 'trial' },
                    { name: 'Staff', value: 'staff' },
                    { name: 'Senior', value: 'senior' },
                    { name: 'Manager', value: 'manager' },
                    { name: 'Admin', value: 'admin' }
                ))
        )
        .addSubcommand(sub => sub
            .setName('remove')
            .setDescription('Remove a user from the staff team')
            .addUserOption(opt => opt.setName('user').setDescription('User to remove').setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('setrank')
            .setDescription('Change a staff member\'s rank')
            .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(true))
            .addStringOption(opt => opt.setName('rank').setDescription('New rank').setRequired(true)
                .addChoices(
                    { name: 'Trial', value: 'trial' },
                    { name: 'Staff', value: 'staff' },
                    { name: 'Senior', value: 'senior' },
                    { name: 'Manager', value: 'manager' },
                    { name: 'Admin', value: 'admin' }
                ))
        )
        .addSubcommandGroup(group => group
            .setName('points')
            .setDescription('Manage staff points')
            .addSubcommand(sub => sub
                .setName('add')
                .setDescription('Add points to a staff member')
                .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(true))
                .addIntegerOption(opt => opt.setName('amount').setDescription('Amount of points').setRequired(true).setMinValue(1))
            )
            .addSubcommand(sub => sub
                .setName('remove')
                .setDescription('Remove points from a staff member')
                .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(true))
                .addIntegerOption(opt => opt.setName('amount').setDescription('Amount of points').setRequired(true).setMinValue(1))
            )
        ),

    async execute(interaction, client) {
        try {
            await interaction.deferReply({ ephemeral: false });

            const guildId = interaction.guildId;
            const subGroup = interaction.options.getSubcommandGroup(false);
            const subCommand = interaction.options.getSubcommand();
            const targetUser = interaction.options.getUser('user');
            const guildData = await Guild.findOne({ guildId });

            let userDoc = await User.findOne({ userId: targetUser.id });
            if (!userDoc) {
                userDoc = new User({ userId: targetUser.id, username: targetUser.username, guilds: [{ guildId }] });
                await userDoc.save();
            }

            const ensureGuildArray = () => {
                let guildProfile = userDoc.guilds.find(g => g.guildId === guildId);
                if (!guildProfile) {
                    guildProfile = { guildId, staff: { rank: 'member', points: 0, warnings: 0, consistency: 100 } };
                    userDoc.guilds.push(guildProfile);
                }
                if (!guildProfile.staff) guildProfile.staff = { rank: 'member', points: 0, warnings: 0, consistency: 100 };
                return guildProfile;
            };

            // ──────────────────────────────────────────────
            // 1. ADD / SETRANK COMMAND
            // ──────────────────────────────────────────────
            if (subCommand === 'add' || subCommand === 'setrank') {
                const rank = interaction.options.getString('rank');
                const guildProfile = ensureGuildArray();
                const oldRank = guildProfile.staff.rank || 'member';

                // Check if user is already staff on 'add'
                if (subCommand === 'add' && oldRank !== 'member') {
                    return interaction.editReply({ embeds: [createErrorEmbed(`<@${targetUser.id}> is already in the staff team as **${oldRank.toUpperCase()}**.`)] });
                }

                // Ensure user is staff on 'setrank'
                if (subCommand === 'setrank' && oldRank === 'member') {
                    return interaction.editReply({ embeds: [createErrorEmbed(`<@${targetUser.id}> is not currently a staff member. Use \`/staff add\` first.`)] });
                }

                guildProfile.staff.rank = rank;
                if (subCommand === 'add' && guildProfile.staff.points === undefined) {
                    guildProfile.staff.points = 0;
                    guildProfile.staff.consistency = 100;
                }

                // --- Global Fallback ---
                if (!userDoc.staff) userDoc.staff = {};
                userDoc.staff.rank = rank;
                userDoc.staff.points = userDoc.staff.points || guildProfile.staff.points || 0;
                await userDoc.save();

                // 📝 CREATE WEB DASH ACTIVITY LOG
                await Activity.create({
                    guildId,
                    userId: targetUser.id,
                    type: subCommand === 'add' ? 'promotion' : (['admin', 'manager', 'senior'].includes(rank) ? 'promotion' : 'demotion'),
                    meta: `Admin ${interaction.user.username} ${subCommand === 'add' ? 'added' : 'changed'} rank to ${rank.toUpperCase()}`,
                    data: { newRank: rank, oldRank, actionBy: interaction.user.id }
                });

                // 🔗 ATTACH DISCORD ROLE
                const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
                let roleMsg = '';
                if (member && guildData?.rankRoles) {
                    const newRoleId = guildData.rankRoles[rank];
                    const oldRoleId = guildData.rankRoles[oldRank];
                    if (oldRoleId) await member.roles.remove(oldRoleId).catch(() => { });
                    if (newRoleId) {
                        await member.roles.add(newRoleId).catch(() => { });
                        roleMsg = `\nThe corresponding Discord role <@&${newRoleId}> was assigned.`;
                    }
                }

                const successEmbed = createSuccessEmbed(`${subCommand === 'add' ? 'Added' : 'Updated'} Staff Member successfully!`)
                    .setDescription(`**<@${targetUser.id}>** is now officially **${rank.toUpperCase()}**.${roleMsg}`)
                    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }));

                return interaction.editReply({ embeds: [successEmbed] });
            }

            // ──────────────────────────────────────────────
            // 2. REMOVE COMMAND
            // ──────────────────────────────────────────────
            if (subCommand === 'remove') {
                const guildProfile = ensureGuildArray();
                const oldRank = guildProfile.staff.rank;

                if (oldRank === 'member' || !oldRank) {
                    return interaction.editReply({ embeds: [createErrorEmbed(`<@${targetUser.id}> is not in the staff team.`)] });
                }

                guildProfile.staff.rank = 'member';
                guildProfile.staff.points = 0; // Wipe points on removal

                userDoc.staff.rank = 'member';
                await userDoc.save();

                // 📝 CREATE WEB DASH ACTIVITY LOG
                await Activity.create({
                    guildId,
                    userId: targetUser.id,
                    type: 'demotion',
                    meta: `Admin ${interaction.user.username} removed from staff team entirely.`,
                    data: { newRank: 'member', oldRank, actionBy: interaction.user.id }
                });

                // 🔗 DETACH DISCORD ROLE
                const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
                if (member && guildData?.rankRoles && guildData.rankRoles[oldRank]) {
                    await member.roles.remove(guildData.rankRoles[oldRank]).catch(() => { });
                }

                return interaction.editReply({ embeds: [createSuccessEmbed(`**<@${targetUser.id}>** has been removed from the staff team and wiped.`)] });
            }

            // ──────────────────────────────────────────────
            // 3. POINTS COMMANDS
            // ──────────────────────────────────────────────
            if (subGroup === 'points') {
                const amount = interaction.options.getInteger('amount');
                const guildProfile = ensureGuildArray();

                if (guildProfile.staff.rank === 'member') {
                    return interaction.editReply({ embeds: [createErrorEmbed(`<@${targetUser.id}> is not staff. Add them via \`/staff add\` first.`)] });
                }

                if (subCommand === 'add') {
                    guildProfile.staff.points = (guildProfile.staff.points || 0) + amount;
                    userDoc.staff.points = (userDoc.staff.points || 0) + amount;
                } else if (subCommand === 'remove') {
                    guildProfile.staff.points = Math.max(0, (guildProfile.staff.points || 0) - amount);
                    userDoc.staff.points = Math.max(0, (userDoc.staff.points || 0) - amount);
                }

                await userDoc.save();

                // 📝 CREATE WEB DASH ACTIVITY LOG
                await Activity.create({
                    guildId,
                    userId: targetUser.id,
                    type: 'admin_action',
                    meta: `Points artificially ${subCommand === 'add' ? 'granted' : 'deducted'} by ${interaction.user.username}: ${amount}`,
                    data: { pointsAltered: amount, total: guildProfile.staff.points, actionBy: interaction.user.id }
                });

                const ptsEmbed = createCoolEmbed({
                    title: `💎 Points Updated — ${targetUser.username}`,
                    description: `Successfully **${subCommand === 'add' ? 'added' : 'removed'} ${amount} points** for <@${targetUser.id}>.`,
                    color: subCommand === 'add' ? 'success' : 'warning',
                    thumbnail: targetUser.displayAvatarURL()
                }).addFields({ name: 'Total Points', value: `\`${guildProfile.staff.points}\`` });

                return interaction.editReply({ embeds: [ptsEmbed] });
            }

        } catch (error) {
            console.error('[Staff]', error);
            await interaction.editReply({ embeds: [createErrorEmbed('Failed to execute staff command. Check logs.')] }).catch(() => { });
        }
    }
};
