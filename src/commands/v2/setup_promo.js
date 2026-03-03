const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed } = require('../../utils/enhancedEmbeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('promo_config')
        .setDescription('Configure the auto-promotion system (Enhanced)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub => sub
            .setName('role')
            .setDescription('Assign a Discord role to a rank')
            .addStringOption(opt => opt.setName('rank').setDescription('Rank name').setRequired(true)
                .addChoices(
                    { name: 'Trial', value: 'trial' },
                    { name: 'Staff', value: 'staff' },
                    { name: 'Senior', value: 'senior' },
                    { name: 'Manager', value: 'manager' },
                    { name: 'Admin', value: 'admin' }
                ))
            .addRoleOption(opt => opt.setName('role').setDescription('Role to assign').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('channel')
            .setDescription('Set the channel for promotion announcements')
            .addChannelOption(opt => opt.setName('channel').setDescription('Channel').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('requirements')
            .setDescription('Set promotion requirements for a rank')
            .addStringOption(opt => opt.setName('rank').setDescription('Rank').setRequired(true)
                .addChoices(
                    { name: 'Staff', value: 'staff' },
                    { name: 'Senior', value: 'senior' },
                    { name: 'Manager', value: 'manager' },
                    { name: 'Admin', value: 'admin' }
                ))
            .addIntegerOption(opt => opt.setName('points').setDescription('Required points').setRequired(true))
            .addIntegerOption(opt => opt.setName('shifts').setDescription('Required shifts').setRequired(true))
            .addIntegerOption(opt => opt.setName('consistency').setDescription('Min consistency % (0-100)').setRequired(true))
            .addIntegerOption(opt => opt.setName('max_warnings').setDescription('Max allowed warnings').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('view')
            .setDescription('View current promotion configuration')),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });
        const { Guild } = require('../../database/mongo');
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guildId;

        let guildData = await Guild.findOne({ guildId });
        if (!guildData) {
            guildData = new Guild({ guildId, name: interaction.guild.name, ownerId: interaction.guild.ownerId });
        }


        if (sub === 'role') {
            const rank = interaction.options.getString('rank');
            const role = interaction.options.getRole('role');
            if (!guildData.rankRoles) guildData.rankRoles = {};
            guildData.rankRoles[rank] = role.id;
            guildData.markModified('rankRoles');
            await guildData.save();

            const embed = await createCustomEmbed(interaction, {
                title: '🛡️ Classification Role Assigned',
                description: `Successfully synchronized the **${rank.toUpperCase()}** classification to the <@&${role.id}> role.`,
                color: 'success'
            });
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_setup_promo').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
        }

        if (sub === 'channel') {
            const channel = interaction.options.getChannel('channel');
            guildData.settings.promotionChannel = channel.id;
            await guildData.save();

            const embed = await createCustomEmbed(interaction, {
                title: '📡 Announcement Node Established',
                description: `Promotion advancement signals will now be broadcast to <#${channel.id}>.`,
                color: 'success'
            });
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_setup_promo').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
        }

        if (sub === 'requirements') {
            const rank = interaction.options.getString('rank');
            const pts = interaction.options.getInteger('points');
            const shifts = interaction.options.getInteger('shifts');
            const consistency = interaction.options.getInteger('consistency');
            const maxWarnings = interaction.options.getInteger('max_warnings');
            if (!guildData.promotionRequirements) guildData.promotionRequirements = {};
            guildData.promotionRequirements[rank] = { points: pts, shifts, consistency, maxWarnings };
            guildData.markModified('promotionRequirements');
            await guildData.save();

            const embed = await createCustomEmbed(interaction, {
                title: `⚙️ Calibration Complete: ${rank.toUpperCase()}`,
                description: `Operational requirements for the **${rank.toUpperCase()}** classification have been successfully updated.`,
                fields: [
                    { name: '⭐ Points', value: `\`${pts.toLocaleString()}\``, inline: true },
                    { name: '  Shifts', value: `\`${shifts}\``, inline: true },
                    { name: '📈 Reliability', value: `\`${consistency}%\``, inline: true },
                    { name: '⚠️ Risk Limit', value: `\`${maxWarnings}\``, inline: true }
                ],
                color: 'enterprise'
            });
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_setup_promo').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
        }

        if (sub === 'view') {
            const rankRoles = guildData.rankRoles || {};
            const reqs = guildData.promotionRequirements || {};
            const RANKS = ['trial', 'staff', 'senior', 'manager', 'admin'];
            const fields = RANKS.map(r => {
                const roleId = rankRoles[r];
                const req = reqs[r];
                const roleStr = roleId ? `<@&${roleId}>` : '*Not Established*';
                const reqStr = req ? `\`${req.points} PTS\` | \`${req.shifts} SHIFTS\` | \`${req.consistency}%\` | \`<= ${req.maxWarnings} WARNS\`` : '*Using Global Defaults*';
                return { name: `📂 Classification: ${r.toUpperCase()}`, value: `> **Discord Role**: ${roleStr}\n> **Requirements**: ${reqStr}`, inline: false };
            });
            const ch = guildData.settings?.promotionChannel;

            const embed = await createCustomEmbed(interaction, {
                title: '📋 Enterprise Configuration Overview',
                description: `Core operational parameters for hierarchical advancement in **${interaction.guild.name}**.`,
                fields: [
                    { name: '📡 Announcement Node', value: ch ? `<#${ch}>` : '*No Node Established*' },
                    ...fields
                ],
                footer: 'Authorized Management Glance'
            });
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_setup_promo').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
        }
    }
};



