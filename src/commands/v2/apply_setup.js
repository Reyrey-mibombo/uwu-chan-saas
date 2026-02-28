const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { ApplicationConfig } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('apply_setup')
        .setDescription('Configure the application system for your server')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(opt =>
            opt.setName('apply_channel')
                .setDescription('The channel where the application panel should be placed')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addChannelOption(opt =>
            opt.setName('review_channel')
                .setDescription('The hidden staff channel to send submitted applications for review')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addRoleOption(opt =>
            opt.setName('reviewer_role')
                .setDescription('The role pinged when a new application is submitted')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const applyChannel = interaction.options.getChannel('apply_channel');
        const reviewChannel = interaction.options.getChannel('review_channel');
        const reviewerRole = interaction.options.getRole('reviewer_role');

        try {
            let config = await ApplicationConfig.findOne({ guildId: interaction.guildId });

            if (!config) {
                config = new ApplicationConfig({ guildId: interaction.guildId });
            }

            config.applyChannelId = applyChannel.id;
            config.reviewChannelId = reviewChannel.id;
            if (reviewerRole) config.reviewerRoleId = reviewerRole.id;
            config.enabled = true;

            await config.save();

            const embed = createSuccessEmbed(
                '✨ Application System Configured',
                'Your custom application system is now successfully linked to your channels!'
            ).addFields(
                { name: '📝 Panel Channel', value: `<#${applyChannel.id}>`, inline: true },
                { name: '🕵️ Review Channel', value: `<#${reviewChannel.id}>`, inline: true },
                { name: '🔔 Ping Role', value: reviewerRole ? `<@&${reviewerRole.id}>` : 'None', inline: true }
            );

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Apply Setup Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('There was a database error while trying to configure the application system.')] });
        }
    }
};
