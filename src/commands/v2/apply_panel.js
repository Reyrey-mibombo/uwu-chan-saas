const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { ApplicationConfig } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('apply_panel')
        .setDescription('Spawn the interactive application UI panel in the current channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const config = await ApplicationConfig.findOne({ guildId: interaction.guildId }).lean();
            if (!config || !config.enabled) {
                return interaction.editReply({ embeds: [createErrorEmbed('The application system has not been configured yet. Please run `/apply_setup` first.')] });
            }

            if (!config.applyChannelId || !config.reviewChannelId) {
                return interaction.editReply({ embeds: [createErrorEmbed('The application or review channels are missing. Please re-run `/apply_setup`.')] });
            }

            if (!config.questions || config.questions.length === 0) {
                return interaction.editReply({ embeds: [createErrorEmbed('You must configure at least one question using `/apply_fields add` before spawning the panel.')] });
            }

            const panelEmbed = await createCustomEmbed(interaction, {
                title: config.panelTitle || '📋 Server Application',
                description: 'Click the button below to start your application!\n\n> Please answer all questions truthfully. Your application will be forwarded securely to our staff team for review.',
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                footer: `Powered by ${interaction.client.user.username} Recruitment`
            });

            const actionRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('start_application')
                    .setLabel('Start Application')
                    .setEmoji('📝')
                    .setStyle(ButtonStyle.Success)
            );

            // Fetch channel and send
            const applyChannel = await interaction.guild.channels.fetch(config.applyChannelId).catch(() => null);

            if (!applyChannel) {
                return interaction.editReply({ embeds: [createErrorEmbed(`Could not locate the configured channel <#${config.applyChannelId}>. Ensure the channel was not deleted.`)] });
            }

            await applyChannel.send({ embeds: [panelEmbed], components: [actionRow] });

            const success = await createCustomEmbed(interaction, {
                title: '✅ Deployment Successful',
                description: `Successfully spawned the interactive Application Modal in <#${config.applyChannelId}>.`
            });
            await interaction.editReply({ embeds: [success] });

        } catch (error) {
            console.error('Apply Panel Error:', error);
            const errEmbed = createErrorEmbed('A fatal error occurred while attempting to cast the panel. Please verify I have permissions to write in the target channel.');
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [errEmbed] });
            } else {
                await interaction.reply({ embeds: [errEmbed], ephemeral: true });
            }
        }
    }
};
