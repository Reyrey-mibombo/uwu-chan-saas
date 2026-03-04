const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { createCustomEmbed, createErrorEmbed, createPremiumEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('security_hub')
        .setDescription('🛡️ Enterprise Hyper-Apex: Guardian Strategic Security Control Portal')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        try {
            if (!interaction.deferred && !interaction.replied) await interaction.deferReply();

            // Enterprise License Guard
            const license = await validatePremiumLicense(interaction, 'premium');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: license.components });
            }

            const embed = await createCustomEmbed(interaction, {
                title: '🛡️ Enterprise Guardian Hyper-Apex: Security Nexus',
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                description: `### 🔒 Macroscopic Deterrence Control\nUnified security interface for the **${interaction.guild.name}** sector. Access predictive threat modeling, armor density audits, and macroscopic sentinel status.\n\n**💎 Enterprise HYPER-APEX EXCLUSIVE**`,
                fields: [
                    { name: '🔮 Forecast', value: 'Predictive Risk Trajectory', inline: true },
                    { name: '🧱 Armor Density', value: 'Layered Shield Integrity', inline: true },
                    { name: '🛰️ Sentinel Status', value: '`🟢 ACTIVE [SYNCHRONIZED]`', inline: true },
                    { name: '⚡ Deterrence Pulse', value: '`4.8 GHz [MAXIMAL]`', inline: true },
                    { name: '🌐 Global Grid', value: '`ENCRYPTED`', inline: true },
                    { name: '✨ Visual Tier', value: '`DIVINE [APEX]`', inline: true }
                ],
                footer: 'Enterprise Hyper-Apex Security Orchestration • V4 Guardian Suite',
                color: 'premium'
            });

            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('v4_forecast').setLabel('Threat Forecast').setStyle(ButtonStyle.Danger).setEmoji('🔮'),
                new ButtonBuilder().setCustomId('v4_shield').setLabel('Shield Status').setStyle(ButtonStyle.Primary).setEmoji('🛡️'),
                new ButtonBuilder().setCustomId('v4_logs').setLabel('Security Logs').setStyle(ButtonStyle.Secondary).setEmoji('📜')
            );

            await interaction.editReply({ embeds: [embed], components: [row1] });

        } catch (error) {
            console.error('Security Hub Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('Nexus failure: Unable to synchronize Guardian Command Portal.')] });
        }
    },

    async handleHubButtons(interaction, client) {
        const { customId, member } = interaction;

        if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({ content: '❌ Authority level insufficient for Security Nexus control.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            if (customId === 'v4_forecast') {
                const cmd = client.commands.get('threat_forecast');
                if (cmd) await cmd.execute(interaction, client);
                else await interaction.editReply({ content: '❌ Threat Forecast subsystem is offline.' });
            } else if (customId === 'v4_shield') {
                const cmd = client.commands.get('shield_status');
                if (cmd) await cmd.execute(interaction, client);
                else await interaction.editReply({ content: '❌ Shield Status subsystem is offline.' });
            } else if (customId === 'v4_logs') {
                const cmd = client.commands.get('moderation_logs');
                if (cmd) await cmd.execute(interaction, client);
                else await interaction.editReply({ content: '❌ Security Logs subsystem is offline.' });
            }
        } catch (err) {
            console.error('Hub Button Error:', err);
            await interaction.editReply({ content: '❌ Subsystem execution failure.' });
        }
    }
};
