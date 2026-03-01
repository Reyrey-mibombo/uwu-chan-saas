const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { Guild } = require('../../database/mongo'); // Adjust path if needed

module.exports = {
    data: new SlashCommandBuilder()
        .setName('activity_alert')
        .setDescription('Configure activity alerts for your server.')
        .addBooleanOption(option =>
            option.setName('enable')
                .setDescription('Enable or disable alerts (leave empty to keep current)')
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
        )
        .addBooleanOption(option =>
            option.setName('view')
                .setDescription('Just view current settings without changing anything')
                .setRequired(false)
        ),

    async execute(interaction) {
        // Require MANAGE_GUILD permission
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#f04747')
                        .setDescription('❌ You need **Manage Server** permission to use this command.')
                ],
                ephemeral: true
            });
        }

        await interaction.deferReply();

        const guildId = interaction.guildId;
        const enable = interaction.options.getBoolean('enable');
        const channel = interaction.options.getChannel('channel');
        const role = interaction.options.getRole('role');
        const threshold = interaction.options.getInteger('threshold');
        const viewOnly = interaction.options.getBoolean('view') || false;

        // Fetch guild settings from DB
        let guildDoc = await Guild.findOne({ guildId });
        if (!guildDoc) {
            // Create a new guild document with defaults
            guildDoc = new Guild({
                guildId,
                name: interaction.guild.name,
                ownerId: interaction.guild.ownerId,
                iconURL: interaction.guild.iconURL(),
                settings: {
                    alerts: {
                        enabled: false,
                        channelId: null,
                        roleId: null,
                        threshold: 50
                    }
                }
            });
        }

        // Ensure the alerts object exists in settings
        if (!guildDoc.settings.alerts) {
            guildDoc.settings.alerts = {
                enabled: false,
                channelId: null,
                roleId: null,
                threshold: 50
            };
        }

        const alerts = guildDoc.settings.alerts;

        // If viewOnly or no options provided, just show current settings
        if (viewOnly || (enable === null && !channel && !role && !threshold)) {
            const statusEmbed = new EmbedBuilder()
                .setColor('#5865F2')
                .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
                .setTitle('📊 Activity Alert Configuration')
                .setDescription(
                    'Alerts notify staff when server activity drops below the threshold.\n' +
                    'Use the command options to update settings.'
                )
                .addFields(
                    { name: '🔔 Status', value: alerts.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                    { name: '📢 Channel', value: alerts.channelId ? `<#${alerts.channelId}>` : '`Not set`', inline: true },
                    { name: '👥 Role', value: alerts.roleId ? `<@&${alerts.roleId}>` : '`None`', inline: true },
                    { name: '⚙️ Threshold', value: `**${alerts.threshold}** messages/day`, inline: true }
                )
                .setFooter({ text: 'Last updated', iconURL: interaction.client.user.displayAvatarURL() })
                .setTimestamp();

            return interaction.editReply({ embeds: [statusEmbed] });
        }

        // Apply changes
        let changed = false;

        if (enable !== null) {
            alerts.enabled = enable;
            changed = true;
        }

        if (channel) {
            alerts.channelId = channel.id;
            changed = true;
        }

        if (role) {
            alerts.roleId = role.id;
            changed = true;
        }

        if (threshold) {
            alerts.threshold = threshold;
            changed = true;
        }

        // Validate required fields if enabling
        if (alerts.enabled && (!alerts.channelId || !alerts.threshold)) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#f04747')
                        .setDescription('❌ Cannot enable alerts without a **channel** and a **threshold**. Please set them first.')
                ]
            });
        }

        if (changed) {
            await guildDoc.save();
        }

        // Build confirmation embed
        const confirmEmbed = new EmbedBuilder()
            .setColor('#57F287')
            .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
            .setTitle('✅ Activity Alerts Updated')
            .addFields(
                { name: '🔔 Status', value: alerts.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                { name: '📢 Channel', value: alerts.channelId ? `<#${alerts.channelId}>` : '`Not set`', inline: true },
                { name: '👥 Role', value: alerts.roleId ? `<@&${alerts.roleId}>` : '`None`', inline: true },
                { name: '⚙️ Threshold', value: `**${alerts.threshold}** messages/day`, inline: true }
            )
            .setFooter({ text: 'Changes saved', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.editReply({ embeds: [confirmEmbed] });

        // Optional: Send a test alert if enabled and channel is set
        if (alerts.enabled && alerts.channelId && changed) {
            const testChannel = interaction.guild.channels.cache.get(alerts.channelId);
            if (testChannel) {
                const testEmbed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('🧪 Test Alert')
                    .setDescription('This is a test alert to confirm your configuration works.\nNo action needed.')
                    .setFooter({ text: 'Activity Alert System' })
                    .setTimestamp();
                testChannel.send({ embeds: [testEmbed] }).catch(() => null);
            }
        }
    }
};