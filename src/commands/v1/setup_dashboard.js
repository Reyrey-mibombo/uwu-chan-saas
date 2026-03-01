const { SlashCommandBuilder, ActionRowBuilder, ChannelSelectMenuBuilder, RoleSelectMenuBuilder, ChannelType } = require('discord.js');
const { createCoolEmbed, createErrorEmbed, createCustomEmbed } = require('../../utils/embeds');
const { Guild } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup_dashboard')
        .setDescription('Open the interactive server configuration dashboard')
        .setDefaultMemberPermissions(8), // Administrator only

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            let guildData = await Guild.findOne({ guildId: interaction.guildId });
            if (!guildData) {
                guildData = new Guild({ guildId: interaction.guildId, name: interaction.guild.name });
                await guildData.save();
            }

            const embed = await createCustomEmbed(interaction, {
                title: '⚙️ Systems Configuration Dashboard',
                description: 'Interactive node management interface. Map operational vectors and authorization roles via the matrices below.',
                fields: [
                    { name: '📊 Logging Vector', value: guildData.settings.logChannel ? `<#${guildData.settings.logChannel}>` : '`UNMAPPED`', inline: true },
                    { name: '👋 Entrance Vector', value: guildData.settings.welcomeChannel ? `<#${guildData.settings.welcomeChannel}>` : '`UNMAPPED`', inline: true },
                    { name: '⚖️ Oversight Vector', value: guildData.settings.modChannel ? `<#${guildData.settings.modChannel}>` : '`UNMAPPED`', inline: true },
                    { name: '🛡️ Active Duty Role', value: guildData.settings.onDutyRole ? `<@&${guildData.settings.onDutyRole}>` : '`UNMAPPED`', inline: true }
                ],
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                color: 'enterprise'
            });

            const logSelect = new ActionRowBuilder().addComponents(
                new ChannelSelectMenuBuilder()
                    .setCustomId('config_log_channel')
                    .setPlaceholder('Select Logging Channel')
                    .addChannelTypes(ChannelType.GuildText)
            );

            const welcomeSelect = new ActionRowBuilder().addComponents(
                new ChannelSelectMenuBuilder()
                    .setCustomId('config_welcome_channel')
                    .setPlaceholder('Select Welcome Channel')
                    .addChannelTypes(ChannelType.GuildText)
            );

            const modSelect = new ActionRowBuilder().addComponents(
                new ChannelSelectMenuBuilder()
                    .setCustomId('config_mod_channel')
                    .setPlaceholder('Select Moderation Channel')
                    .addChannelTypes(ChannelType.GuildText)
            );

            const dutySelect = new ActionRowBuilder().addComponents(
                new RoleSelectMenuBuilder()
                    .setCustomId('config_duty_role')
                    .setPlaceholder('Select "On Duty" Role')
            );

            await interaction.editReply({
                embeds: [embed],
                components: [logSelect, welcomeSelect, modSelect, dutySelect]
            });

        } catch (error) {
            console.error(error);
            const errEmbed = createErrorEmbed('An error occurred while opening the dashboard.');
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [errEmbed] });
            } else {
                await interaction.reply({ embeds: [errEmbed], ephemeral: true });
            }
        }
    },

    async handleChannelSelect(interaction) {
        try {
            if (!interaction.member.permissions.has('Administrator')) return;
            const channelId = interaction.values[0];
            const type = interaction.customId.replace('config_', '');

            let updateQuery = {};
            let settingName = '';

            if (type === 'log_channel') {
                updateQuery = { 'settings.logChannel': channelId };
                settingName = 'Logging Channel';
            } else if (type === 'welcome_channel') {
                updateQuery = { 'settings.welcomeChannel': channelId };
                settingName = 'Welcome Channel';
            } else if (type === 'mod_channel') {
                updateQuery = { 'settings.modChannel': channelId };
                settingName = 'Moderation Channel';
            }

            await Guild.findOneAndUpdate({ guildId: interaction.guildId }, { $set: updateQuery }, { upsert: true });

            const { createSuccessEmbed } = require('../../utils/embeds');
            await interaction.reply({ embeds: [createSuccessEmbed('Configuration Updated', `✅ Successfully mapped **${settingName}** to <#${channelId}>.`)], ephemeral: true });
        } catch (error) {
            console.error('Config Menu Error:', error);
            await interaction.reply({ content: '❌ Failed to save configuration.', ephemeral: true });
        }
    },

    async handleRoleSelect(interaction) {
        try {
            if (!interaction.member.permissions.has('Administrator')) return;
            const roleId = interaction.values[0];
            const type = interaction.customId.replace('config_', '');

            if (type === 'duty_role') {
                await Guild.findOneAndUpdate({ guildId: interaction.guildId }, { $set: { 'settings.onDutyRole': roleId } }, { upsert: true });

                const { createSuccessEmbed } = require('../../utils/embeds');
                await interaction.reply({ embeds: [createSuccessEmbed('Configuration Updated', `✅ Successfully mapped **On Duty Role** to <@&${roleId}>.`)], ephemeral: true });
            }
        } catch (error) {
            console.error('Config Menu Error:', error);
            await interaction.reply({ content: '❌ Failed to save role configuration.', ephemeral: true });
        }
    }
};
