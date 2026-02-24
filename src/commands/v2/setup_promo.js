const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup_promo')
        .setDescription('Configure the auto-promotion system')
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
            return interaction.editReply({
                embeds: [new EmbedBuilder().setColor(0x2ecc71)
                    .setTitle('✅ Rank Role Set')
                    .setDescription(`**${rank.toUpperCase()}** → <@&${role.id}>`)
                    .setFooter({ text: 'Staff who reach this rank will automatically receive this role.' })]
            });
        }

        if (sub === 'channel') {
            const channel = interaction.options.getChannel('channel');
            guildData.settings.promotionChannel = channel.id;
            await guildData.save();
            return interaction.editReply({
                embeds: [new EmbedBuilder().setColor(0x2ecc71)
                    .setTitle('✅ Promotion Channel Set')
                    .setDescription(`Promotions will be announced in <#${channel.id}>`)]
            });
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
            return interaction.editReply({
                embeds: [new EmbedBuilder().setColor(0x2ecc71)
                    .setTitle(`✅ Requirements Set for ${rank.toUpperCase()}`)
                    .addFields(
                        { name: '⭐ Points', value: pts.toString(), inline: true },
                        { name: '🔄 Shifts', value: shifts.toString(), inline: true },
                        { name: '📈 Consistency', value: `${consistency}%`, inline: true },
                        { name: '⚠️ Max Warnings', value: maxWarnings.toString(), inline: true }
                    )]
            });
        }

        if (sub === 'view') {
            const rankRoles = guildData.rankRoles || {};
            const reqs = guildData.promotionRequirements || {};
            const RANKS = ['trial', 'staff', 'senior', 'manager', 'admin'];
            const fields = RANKS.map(r => {
                const roleId = rankRoles[r];
                const req = reqs[r];
                const roleStr = roleId ? `<@&${roleId}>` : '❌ Not set';
                const reqStr = req ? `${req.points}pts / ${req.shifts} shifts / ${req.consistency}% / max ${req.maxWarnings} warns` : '(defaults)';
                return { name: `${r.toUpperCase()}`, value: `Role: ${roleStr}\nReqs: ${reqStr}`, inline: false };
            });
            const ch = guildData.settings?.promotionChannel;
            return interaction.editReply({
                embeds: [new EmbedBuilder().setColor(0x3498db)
                    .setTitle('⚙️ Promotion Setup')
                    .addFields({ name: '📢 Announcement Channel', value: ch ? `<#${ch}>` : '❌ Not set' }, ...fields)
                    .setFooter({ text: 'Use /setup_promo role/channel/requirements to configure' })]
            });
        }
    }
};
