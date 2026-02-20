const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { Guild } = require('../../database/mongo');

// v3 (PREMIUM) — 7 requirements: + achievements, reputation
module.exports = {
    data: new SlashCommandBuilder()
        .setName('set_requirements_premium')
        .setDescription('[Premium] Set 7 promotion requirements including achievements & reputation')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(opt => opt.setName('rank').setDescription('Which rank to configure').setRequired(true)
            .addChoices(
                { name: 'Staff', value: 'staff' },
                { name: 'Senior', value: 'senior' },
                { name: 'Manager', value: 'manager' },
                { name: 'Admin', value: 'admin' }
            ))
        .addIntegerOption(opt => opt.setName('points').setDescription('Req 1: Min points').setRequired(true).setMinValue(0).setMaxValue(99999))
        .addIntegerOption(opt => opt.setName('shifts').setDescription('Req 2: Min shifts').setRequired(true).setMinValue(0).setMaxValue(9999))
        .addIntegerOption(opt => opt.setName('consistency').setDescription('Req 3: Min consistency %').setRequired(true).setMinValue(0).setMaxValue(100))
        .addIntegerOption(opt => opt.setName('max_warnings').setDescription('Req 4: Max warnings').setRequired(true).setMinValue(0).setMaxValue(99))
        .addIntegerOption(opt => opt.setName('shift_hours').setDescription('Req 5: Min shift hours (0=off)').setRequired(true).setMinValue(0).setMaxValue(9999))
        .addIntegerOption(opt => opt.setName('achievements').setDescription('Req 6: Min achievements earned (0=off)').setRequired(true).setMinValue(0).setMaxValue(999))
        .addIntegerOption(opt => opt.setName('reputation').setDescription('Req 7: Min reputation score (0=off)').setRequired(true).setMinValue(0).setMaxValue(9999)),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });
        const guildId = interaction.guildId;
        const rank = interaction.options.getString('rank');
        const points = interaction.options.getInteger('points');
        const shifts = interaction.options.getInteger('shifts');
        const consistency = interaction.options.getInteger('consistency');
        const maxWarnings = interaction.options.getInteger('max_warnings');
        const shiftHours = interaction.options.getInteger('shift_hours');
        const achievements = interaction.options.getInteger('achievements');
        const reputation = interaction.options.getInteger('reputation');

        let guildData = await Guild.findOne({ guildId }) || new Guild({ guildId, name: interaction.guild.name, ownerId: interaction.guild.ownerId });

        if (!guildData.promotionRequirements) guildData.promotionRequirements = {};
        if (!guildData.promotionRequirements[rank]) guildData.promotionRequirements[rank] = {};
        Object.assign(guildData.promotionRequirements[rank], { points, shifts, consistency, maxWarnings, shiftHours, achievements, reputation });
        guildData.markModified('promotionRequirements');
        await guildData.save();

        const embed = new EmbedBuilder()
            .setTitle(`💎 Premium Requirements Set — ${rank.toUpperCase()}`)
            .setColor(0x9b59b6)
            .setDescription('**Premium tier: 7 requirements configured.**\n🌟 Upgrade to Enterprise to unlock 3 more: days in server, clean record, and custom notes.')
            .addFields(
                { name: '1️⃣ ⭐ Min Points', value: points.toString(), inline: true },
                { name: '2️⃣ 🔄 Min Shifts', value: shifts.toString(), inline: true },
                { name: '3️⃣ 📈 Min Consistency %', value: `${consistency}%`, inline: true },
                { name: '4️⃣ ⚠️ Max Warnings', value: maxWarnings.toString(), inline: true },
                { name: '5️⃣ ⏱️ Min Shift Hours', value: shiftHours > 0 ? `${shiftHours}h` : 'Disabled', inline: true },
                { name: '6️⃣ 🏅 Min Achievements', value: achievements > 0 ? achievements.toString() : 'Disabled', inline: true },
                { name: '7️⃣ 🌟 Min Reputation', value: reputation > 0 ? reputation.toString() : 'Disabled', inline: true }
            )
            .setFooter({ text: 'Premium tier — Auto-promotion scans every 15 min' });

        await interaction.editReply({ embeds: [embed] });
    }
};
