const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Guild } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set_requirements_plus')
        .setDescription('[Free+] Set 5 promotion requirements including warnings and shift hours for a target rank')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        // Note: the choices here CAN be statically defined because Discord registering slash commands happens before DB calls
        // However, admins will overwrite keys. To prevent confusion, let's keep the standard 4 but note they act as dict keys.
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

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });
            const guildId = interaction.guildId;
            const rank = interaction.options.getString('rank');
            const points = interaction.options.getInteger('points');
            const shifts = interaction.options.getInteger('shifts');
            const consistency = interaction.options.getInteger('consistency');
            const maxWarnings = interaction.options.getInteger('max_warnings');
            const shiftHours = interaction.options.getInteger('shift_hours');

            let guildData = await Guild.findOne({ guildId });
            if (!guildData) {
                guildData = new Guild({ guildId, name: interaction.guild.name, ownerId: interaction.guild.ownerId });
            }

            if (!guildData.promotionRequirements) guildData.promotionRequirements = {};
            if (!guildData.promotionRequirements[rank]) guildData.promotionRequirements[rank] = {};

            Object.assign(guildData.promotionRequirements[rank], { points, shifts, consistency, maxWarnings, shiftHours });

            guildData.markModified('promotionRequirements');
            await guildData.save();

            const embed = await createCustomEmbed(interaction, {
                title: `⚙️ Operational Calibration: ${rank.toUpperCase()}`,
                description: `Successfully synchronized 5 advanced target constraints for the **${rank.toUpperCase()}** milestone within the **${interaction.guild.name}** sector.`,
                fields: [
                    { name: '1️⃣ ⭐ Target Points', value: `\`${points.toLocaleString()}\``, inline: true },
                    { name: '2️⃣ 🔄 Engagement Shifts', value: `\`${shifts}\``, inline: true },
                    { name: '3️⃣ 📈 Reliability Index', value: `\`${consistency}%\``, inline: true },
                    { name: '4️⃣ ⚠️ Risk Tolerance', value: `\`<= ${maxWarnings}\``, inline: true },
                    { name: '5️⃣ ⏱️ Flight Time', value: shiftHours > 0 ? `\`${shiftHours}h\`` : '*No Constraint Established*', inline: true }
                ],
                footer: 'Milestone parameters are enforced by the background automation engine.',
                color: 'enterprise'
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Set Req Plus Error:', error);
            const errEmbed = createErrorEmbed('An error occurred while attempting to write settings to the configuration server.');
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [errEmbed] });
            } else {
                await interaction.reply({ embeds: [errEmbed], ephemeral: true });
            }
        }
    }
};
