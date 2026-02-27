const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { Guild } = require('../../database/mongo');

// v2 (FREE) — 5 requirements: + maxWarnings, shiftHours
module.exports = {
    data: new SlashCommandBuilder()
        .setName('set_requirements_plus')
        .setDescription('[Free+] Set 5 promotion requirements including warnings and shift hours')
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
        .addIntegerOption(opt => opt.setName('max_warnings').setDescription('Req 4: Max allowed warnings (0 = zero tolerance)').setRequired(true).setMinValue(0).setMaxValue(99))
        .addIntegerOption(opt => opt.setName('shift_hours').setDescription('Req 5: Min total shift hours (0 = disabled)').setRequired(true).setMinValue(0).setMaxValue(9999)),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });
        const guildId = interaction.guildId;
        const rank = interaction.options.getString('rank');
        const points = interaction.options.getInteger('points');
        const shifts = interaction.options.getInteger('shifts');
        const consistency = interaction.options.getInteger('consistency');
        const maxWarnings = interaction.options.getInteger('max_warnings');
        const shiftHours = interaction.options.getInteger('shift_hours');

        let guildData = await Guild.findOne({ guildId }) || new Guild({ guildId, name: interaction.guild.name, ownerId: interaction.guild.ownerId });

        if (!guildData.promotionRequirements) guildData.promotionRequirements = {};
        if (!guildData.promotionRequirements[rank]) guildData.promotionRequirements[rank] = {};
        Object.assign(guildData.promotionRequirements[rank], { points, shifts, consistency, maxWarnings, shiftHours });
        guildData.markModified('promotionRequirements');
        await guildData.save();

        const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
            .setTitle(`⚙️ Extended Requirements Set — ${rank.toUpperCase()}`)
            
            .setDescription('**Free tier: 5 requirements configured.**\n💎 Upgrade to Premium to unlock achievements & reputation requirements.\n🌟 Enterprise unlocks all 10.')
            .addFields(
                { name: '1️⃣ ⭐ Min Points', value: points.toString(), inline: true },
                { name: '2️⃣ 🔄 Min Shifts', value: shifts.toString(), inline: true },
                { name: '3️⃣ 📈 Min Consistency %', value: `${consistency}%`, inline: true },
                { name: '4️⃣ ⚠️ Max Warnings', value: maxWarnings.toString(), inline: true },
                { name: '5️⃣ ⏱️ Min Shift Hours', value: shiftHours > 0 ? `${shiftHours}h` : 'Disabled', inline: true }
            )
            ;

        await interaction.editReply({ embeds: [embed] });
    }
};
