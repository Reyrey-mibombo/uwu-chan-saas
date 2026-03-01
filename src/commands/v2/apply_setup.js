const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { ApplicationConfig } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('apply_setup')
        .setDescription('⚙️ Configure the interactive application panel for your server')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(opt =>
            opt.setName('apply_channel')
                .setDescription('The text channel where the spawning /apply_panel should live')
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
        try {
            await interaction.deferReply({ ephemeral: true });

            const applyChannel = interaction.options.getChannel('apply_channel');
            const reviewChannel = interaction.options.getChannel('review_channel');
            const reviewerRole = interaction.options.getRole('reviewer_role');

            let config = await ApplicationConfig.findOne({ guildId: interaction.guildId });
            if (!config) {
                config = new ApplicationConfig({ guildId: interaction.guildId });
            }

            // Map strict ID values
            config.applyChannelId = applyChannel.id;
            config.reviewChannelId = reviewChannel.id;
            if (reviewerRole) {
                config.reviewerRoleId = reviewerRole.id;
            } else {
                config.reviewerRoleId = null;
            }
            config.enabled = true;

            await config.save();

            const embed = await createCustomEmbed(interaction, {
                title: '✨ Application Pipeline Deployed',
                description: `Your custom application listener is now successfully linked to your server channels in **${interaction.guild.name}**!`,
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                fields: [
                    { name: '📝 Panel Channel', value: `<#${applyChannel.id}>`, inline: true },
                    { name: '🕵️ Review Channel', value: `<#${reviewChannel.id}>`, inline: true },
                    { name: '🔔 Reviewer Ping', value: reviewerRole ? `<@&${reviewerRole.id}>` : '*None*', inline: true }
                ],
                footer: 'Execute /apply_panel in the intended channel to spawn the UI menu.'
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Apply Setup Error:', error);
            const errEmbed = createErrorEmbed('A database error occurred while trying to configure the application system.');
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [errEmbed] });
            } else {
                await interaction.reply({ embeds: [errEmbed], ephemeral: true });
            }
        }
    }
};
