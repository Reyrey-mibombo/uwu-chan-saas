const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { Guild } = require('../../database/mongo');

// v1 (FREE) — Basic 3 requirements: points, shifts, consistency
module.exports = {
    data: new SlashCommandBuilder()
        .setName('set_requirements')
        .setDescription('[Free] Set basic promotion requirements (3 customizable: points, shifts, consistency)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(opt => opt.setName('rank').setDescription('Which rank to configure').setRequired(true)
            .addChoices(
                { name: 'Staff', value: 'staff' },
                { name: 'Senior', value: 'senior' },
                { name: 'Manager', value: 'manager' },
                { name: 'Admin', value: 'admin' }
            ))
        .addIntegerOption(opt => opt.setName('points').setDescription('Req 1: Minimum points needed (e.g. 100)').setRequired(true).setMinValue(0).setMaxValue(99999))
        .addIntegerOption(opt => opt.setName('shifts').setDescription('Req 2: Minimum shifts completed (e.g. 5)').setRequired(true).setMinValue(0).setMaxValue(9999))
        .addIntegerOption(opt => opt.setName('consistency').setDescription('Req 3: Minimum consistency % (0-100)').setRequired(true).setMinValue(0).setMaxValue(100)),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });
        const guildId = interaction.guildId;
        const rank = interaction.options.getString('rank');
        const points = interaction.options.getInteger('points');
        const shifts = interaction.options.getInteger('shifts');
        const consistency = interaction.options.getInteger('consistency');

        let guildData = await Guild.findOne({ guildId }) || new Guild({ guildId, name: interaction.guild.name, ownerId: interaction.guild.ownerId });

        if (!guildData.promotionRequirements) guildData.promotionRequirements = {};
        if (!guildData.promotionRequirements[rank]) guildData.promotionRequirements[rank] = {};
        guildData.promotionRequirements[rank].points = points;
        guildData.promotionRequirements[rank].shifts = shifts;
        guildData.promotionRequirements[rank].consistency = consistency;
        guildData.markModified('promotionRequirements');
        await guildData.save();

        const embed = new EmbedBuilder()
            .setTitle(`⚙️ Basic Requirements Set — ${rank.toUpperCase()}`)
            .setColor(0x3498db)
            .setDescription('**Free tier: 3 requirements configured.**\n💎 Upgrade to Premium for +2 more requirements.\n🌟 Enterprise unlocks all 10.')
            .addFields(
                { name: '1️⃣ ⭐ Min Points', value: points.toString(), inline: true },
                { name: '2️⃣ 🔄 Min Shifts', value: shifts.toString(), inline: true },
                { name: '3️⃣ 📈 Min Consistency %', value: `${consistency}%`, inline: true }
            )
            .setFooter({ text: 'Auto-promotion will check these when the bot scans every 15 min' });

        await interaction.editReply({ embeds: [embed] });
    }
};
