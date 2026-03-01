const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Guild } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('activity_alert')
        .setDescription('Configure continuous activity drop alerts for your server')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addBooleanOption(option =>
            option.setName('enable')
                .setDescription('Enable or disable alerts')
                .setRequired(false)
        )
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel where alerts will be sent')
                .setRequired(false)
        )
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Role to ping when an alert triggers (optional)')
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option.setName('threshold')
                .setDescription('Minimum daily messages to avoid low‑activity alert')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(10000)
        ),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            const guildId = interaction.guildId;
            const enable = interaction.options.getBoolean('enable');
            const channel = interaction.options.getChannel('channel');
            const role = interaction.options.getRole('role');
            const threshold = interaction.options.getInteger('threshold');

            // Fetch guild settings from DB
            let guildDoc = await Guild.findOne({ guildId });
            if (!guildDoc) {
                guildDoc = new Guild({ guildId, name: interaction.guild.name, ownerId: interaction.guild.ownerId });
            }

            if (!guildDoc.settings) guildDoc.settings = {};
            if (!guildDoc.settings.alerts) {
                guildDoc.settings.alerts = { enabled: false, channelId: null, roleId: null, threshold: 50 };
            }

            const alerts = guildDoc.settings.alerts;

            // Apply changes
            let changed = false;

            if (enable !== null) { alerts.enabled = enable; changed = true; }
            if (channel) { alerts.channelId = channel.id; changed = true; }
            if (role) { alerts.roleId = role.id; changed = true; }
            if (threshold) { alerts.threshold = threshold; changed = true; }

            // Validate logic
            if (alerts.enabled && (!alerts.channelId || !alerts.threshold)) {
                return interaction.editReply({ embeds: [createErrorEmbed('You cannot enable activity alerts without binding an alert channel and defining a traffic threshold first.')] });
            }

            if (changed) {
                guildDoc.markModified('settings.alerts');
                await guildDoc.save();
            }

            const embed = await createCustomEmbed(interaction, {
                title: changed ? '✅ Activity Alerts Updated' : '📊 Activity Alert Configuration',
                description: 'Background process that listens for sudden drops in general server chat traffic over a set threshold.',
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                fields: [
                    { name: '🔔 Engine Status', value: alerts.enabled ? '✅ `Enabled`' : '❌ `Disabled`', inline: true },
                    { name: '📢 Output Channel', value: alerts.channelId ? `<#${alerts.channelId}>` : '`Not Set`', inline: true },
                    { name: '👥 Target Role', value: alerts.roleId ? `<@&${alerts.roleId}>` : '`None`', inline: true },
                    { name: '⚙️ Warning Threshold', value: `**${alerts.threshold}** Messages/Day`, inline: false }
                ],
                footer: 'Alert system monitors global server traffic volume'
            });

            await interaction.editReply({ embeds: [embed] });

            if (alerts.enabled && alerts.channelId && changed) {
                const testChannel = interaction.guild.channels.cache.get(alerts.channelId);
                if (testChannel) {
                    const testEmbed = await createCustomEmbed(interaction, {
                        title: '🧪 Activity Alert Configured',
                        description: 'This is a test broadcast simulating an alert payload.\nTraffic dropping beneath the registered threshold will trigger this event.'
                    });
                    testChannel.send({ embeds: [testEmbed] }).catch(() => null);
                }
            }

        } catch (error) {
            console.error('Activity Alert Error:', error);
            const errEmbed = createErrorEmbed('A database error occurred while modifying the alert payload.');
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [errEmbed] });
            } else {
                await interaction.reply({ embeds: [errEmbed], ephemeral: true });
            }
        }
    }
};