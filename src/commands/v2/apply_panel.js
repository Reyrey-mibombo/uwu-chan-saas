const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCoolEmbed, createErrorEmbed } = require('../../utils/embeds');
const { ApplicationConfig } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('apply_panel')
        .setDescription('Spawn the interactive application panel in the current channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const config = await ApplicationConfig.findOne({ guildId: interaction.guildId });
        if (!config || !config.enabled) {
            return interaction.editReply({ embeds: [createErrorEmbed('The application system has not been configured yet. Please run `/apply_setup`.')] });
        }

        if (!config.applyChannelId || !config.reviewChannelId) {
            return interaction.editReply({ embeds: [createErrorEmbed('The application or review channels are missing. Please re-run `/apply_setup`.')] });
        }

        if (!config.questions || config.questions.length === 0) {
            return interaction.editReply({ embeds: [createErrorEmbed('You must configure at least one question using `/apply_fields add` first.')] });
        }

        const panelEmbed = createCoolEmbed({
            title: config.panelTitle || '📋 Server Application',
            description: 'Click the button below to start your application!\n\nPlease answer all questions truthfully. Your application will be sent to our staff team for review.',
            color: 'primary',
            author: {
                name: interaction.guild.name,
                iconURL: interaction.guild.iconURL({ dynamic: true }) || null
            }
        });

        const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('start_application')
                .setLabel('Start Application')
                .setEmoji('📝')
                .setStyle(ButtonStyle.Success)
        );

        try {
            const applyChannel = await interaction.guild.channels.fetch(config.applyChannelId);
            await applyChannel.send({ embeds: [panelEmbed], components: [actionRow] });
            await interaction.editReply({ content: `✅ Application panel successfully spawned in <#${config.applyChannelId}>!` });
        } catch (error) {
            console.error('Apply Panel Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed(`Failed to send the panel to <#${config.applyChannelId}>. Make sure the bot has permissions there.`)] });
        }
    }
};
