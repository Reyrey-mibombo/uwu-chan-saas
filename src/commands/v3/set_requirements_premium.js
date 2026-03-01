const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createCustomEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');
const { Guild } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set_requirements_premium')
        .setDescription('[Premium Array] Configure advanced grading limits targeting achievements and reputation boundaries.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        // No longer relying on a hardcoded array, dynamic database insertion instead!
        .addStringOption(opt => opt.setName('rank').setDescription('Target string name to assign or override parameters exclusively for (i.e manager)').setRequired(true))
        .addIntegerOption(opt => opt.setName('points').setDescription('Req 1: Min total points').setRequired(true).setMinValue(0).setMaxValue(99999))
        .addIntegerOption(opt => opt.setName('shifts').setDescription('Req 2: Min total shifts').setRequired(true).setMinValue(0).setMaxValue(9999))
        .addIntegerOption(opt => opt.setName('consistency').setDescription('Req 3: Min consistency grading %').setRequired(true).setMinValue(0).setMaxValue(100))
        .addIntegerOption(opt => opt.setName('max_warnings').setDescription('Req 4: Server warning limitation block').setRequired(true).setMinValue(0).setMaxValue(99))
        .addIntegerOption(opt => opt.setName('shift_hours').setDescription('Req 5: Minimum clocked patrol hours (0=off)').setRequired(true).setMinValue(0).setMaxValue(9999))
        .addIntegerOption(opt => opt.setName('achievements').setDescription('Req 6: Min achievements awarded (0=off)').setRequired(true).setMinValue(0).setMaxValue(999))
        .addIntegerOption(opt => opt.setName('reputation').setDescription('Req 7: Min positive reputation count (0=off)').setRequired(true).setMinValue(0).setMaxValue(9999)),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });
            const guildId = interaction.guildId;
            const rank = interaction.options.getString('rank').toLowerCase().replace(/\s+/g, '_');
            const points = interaction.options.getInteger('points');
            const shifts = interaction.options.getInteger('shifts');
            const consistency = interaction.options.getInteger('consistency');
            const maxWarnings = interaction.options.getInteger('max_warnings');
            const shiftHours = interaction.options.getInteger('shift_hours');
            const achievements = interaction.options.getInteger('achievements');
            const reputation = interaction.options.getInteger('reputation');

            let guildData = await Guild.findOne({ guildId });
            if (!guildData) {
                guildData = new Guild({ guildId, name: interaction.guild.name, ownerId: interaction.guild.ownerId });
            }

            // Must enforce premium limit bypass checking so normal instances don't exploit the architecture
            if (!guildData.premium?.isActive && !guildData.premium?.tier) {
                return interaction.editReply({ embeds: [createErrorEmbed('You do not have the required backend access to write advanced algorithmic requirement vectors.\nPlease ask the owner to bypass limits and support UWU Chan development.')] });
            }

            if (!guildData.promotionRequirements) guildData.promotionRequirements = {};
            if (!guildData.promotionRequirements[rank]) guildData.promotionRequirements[rank] = {};

            Object.assign(guildData.promotionRequirements[rank], { points, shifts, consistency, maxWarnings, shiftHours, achievements, reputation });

            // Critical! Mongo Mixed type needs explicit saving mark
            guildData.markModified('promotionRequirements');
            await guildData.save();

            const embed = await createCustomEmbed(interaction, {
                title: `💎 Algorithmic Boundary Adjusted`,
                description: `Successfully overwritten \`${rank.toUpperCase()}\` requirements into server bounds mapping across 7 vectors.`,
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                fields: [
                    { name: '⭐ Points Target', value: `\`${points}\``, inline: true },
                    { name: '🔄 Operational Target', value: `\`${shifts}\` Patrols`, inline: true },
                    { name: '📈 Consistency Target', value: `\`${consistency}%\``, inline: true },
                    { name: '⚠️ Alert Buffer', value: `\`${maxWarnings}\` Allowed`, inline: true },
                    { name: '⏱️ Duration Total Limit', value: shiftHours > 0 ? `\`${shiftHours} Hrs\`` : '`Off`', inline: true },
                    { name: '🏅 Achievement Gates', value: achievements > 0 ? `\`${achievements}\` Nodes` : '`Off`', inline: true },
                    { name: '🌟 Server Reputation', value: reputation > 0 ? `\`${reputation}\` Minimum` : '`Off`', inline: true }
                ]
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Premium Requirements Set Error:', error);
            const errEmbed = createErrorEmbed('A database backend error occurred mapping custom advanced vector targets.');
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [errEmbed] });
            } else {
                await interaction.reply({ embeds: [errEmbed], ephemeral: true });
            }
        }
    }
};
