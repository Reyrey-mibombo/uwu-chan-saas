const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { Guild } = require('../../database/mongo');

// v6 (ENTERPRISE) — All 10 requirements
module.exports = {
    data: new SlashCommandBuilder()
        .setName('set_requirements_enterprise')
        .setDescription('[Enterprise] Full 10-requirement promotion configuration')
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
        .addIntegerOption(opt => opt.setName('achievements').setDescription('Req 6: Min achievements (0=off)').setRequired(true).setMinValue(0).setMaxValue(999))
        .addIntegerOption(opt => opt.setName('reputation').setDescription('Req 7: Min reputation (0=off)').setRequired(true).setMinValue(0).setMaxValue(9999))
        .addIntegerOption(opt => opt.setName('days_in_server').setDescription('Req 8: Min days as server member (0=off)').setRequired(true).setMinValue(0).setMaxValue(9999))
        .addIntegerOption(opt => opt.setName('clean_record_days').setDescription('Req 9: Days without any warning (0=off)').setRequired(true).setMinValue(0).setMaxValue(9999))
        .addStringOption(opt => opt.setName('custom_note').setDescription('Req 10: Custom note shown in owner DM (e.g. "Must have voice chat experience")').setRequired(false)),

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
        const daysInServer = interaction.options.getInteger('days_in_server');
        const cleanRecordDays = interaction.options.getInteger('clean_record_days');
        const customNote = interaction.options.getString('custom_note') || '';

        let guildData = await Guild.findOne({ guildId }) || new Guild({ guildId, name: interaction.guild.name, ownerId: interaction.guild.ownerId });

        if (!guildData.promotionRequirements) guildData.promotionRequirements = {};
        if (!guildData.promotionRequirements[rank]) guildData.promotionRequirements[rank] = {};
        Object.assign(guildData.promotionRequirements[rank], {
            points, shifts, consistency, maxWarnings, shiftHours,
            achievements, reputation, daysInServer, cleanRecordDays, customNote
        });
        guildData.markModified('promotionRequirements');
        await guildData.save();

        const off = (v) => v > 0 ? v.toString() : 'Disabled';

        const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
            .setTitle(`👑 Enterprise Full Requirements Set — ${rank.toUpperCase()}`)
            
            .setDescription('**Enterprise tier: All 10 requirements configured.**\nThis is the maximum customization level.')
            .addFields(
                { name: '1️⃣ ⭐ Min Points', value: points.toString(), inline: true },
                { name: '2️⃣ 🔄 Min Shifts', value: shifts.toString(), inline: true },
                { name: '3️⃣ 📈 Min Consistency %', value: `${consistency}%`, inline: true },
                { name: '4️⃣ ⚠️ Max Warnings', value: maxWarnings.toString(), inline: true },
                { name: '5️⃣ ⏱️ Min Shift Hours', value: off(shiftHours), inline: true },
                { name: '6️⃣ 🏅 Min Achievements', value: off(achievements), inline: true },
                { name: '7️⃣ 🌟 Min Reputation', value: off(reputation), inline: true },
                { name: '8️⃣ 📅 Min Days In Server', value: off(daysInServer), inline: true },
                { name: '9️⃣ 🔒 Clean Record Days', value: off(cleanRecordDays), inline: true },
                { name: '🔟 📝 Custom Note (in DM)', value: customNote || 'None set', inline: false }
            )
            ;

        await interaction.editReply({ embeds: [embed] });
    }
};
