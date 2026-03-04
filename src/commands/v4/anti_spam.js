const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { createCustomEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('anti_spam')
    .setDescription('🛡️ Enterprise Global Threat Intelligence & Anti-Spam Control')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction, client) {
    try {
      if (!interaction.deferred && !interaction.replied) await interaction.deferReply();

      const license = await validatePremiumLicense(interaction, 'premium');
      if (!license.allowed) {
        return await interaction.editReply({ embeds: [license.embed], components: license.components });
      }

      await this.renderSpamNexus(interaction);
    } catch (error) {
      console.error('Enterprise Anti-Spam Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Guardian Intelligence failure: Unable to synchronize threat matrices.')] });
    }
  },

  async renderSpamNexus(interaction) {
    const guildId = interaction.guildId;
    let guild = await Guild.findOne({ guildId });
    if (!guild) guild = new Guild({ guildId, name: interaction.guild.name });

    const config = guild.settings?.antispam || { enabled: false, sensitivity: 'Standard' };
    const status = config.enabled ? '🟢 OPTIMIZED' : '🔴 DEACTIVATED';
    const intensity = config.sensitivity || 'Standard';

    const embed = await createCustomEmbed(interaction, {
      title: '🛰️ Enterprise Guardian: Anti-Spam Nexus',
      thumbnail: interaction.guild.iconURL({ dynamic: true }),
      description: `### 🛡️ Global Intelligence Pulse\nMacroscopic security telemetry for sector **${interaction.guild.name}**. Monitoring cross-sector behavioral signals.\n\n**💎 Enterprise HYPER-APEX EXCLUSIVE**`,
      fields: [
        { name: '🛡️ Defense Status', value: `\`${status}\``, inline: true },
        { name: '⚖️ Sensitivity', value: `\`${intensity}\``, inline: true },
        { name: '🧱 Active Registry', value: `\`${config.enabled ? '100% Locked' : 'Unlocked'}\``, inline: true },
        { name: '📡 Global Sync', value: '`REAL-TIME`', inline: true },
        { name: '⚡ Deterrence Pulse', value: `\`${config.enabled ? '4.8 GHz' : '0.0 GHz'}\``, inline: true },
        { name: '✨ System Pulsar', value: '`RESONATING`', inline: true }
      ],
      footer: 'Anti-Spam Intelligence Nexus • V4 Security Suite',
      color: config.enabled ? 'premium' : 'error'
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`spam_toggle_${config.enabled ? 'off' : 'on'}`)
        .setLabel(config.enabled ? 'Disable Deterrence' : 'Enable Deterrence')
        .setStyle(config.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
        .setEmoji(config.enabled ? '🔒' : '🔓'),
      new ButtonBuilder()
        .setCustomId(`spam_sense_${intensity === 'Standard' ? 'Maximal' : 'Standard'}`)
        .setLabel(intensity === 'Standard' ? 'Set Maximal' : 'Set Standard')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('⚡'),
      new ButtonBuilder()
        .setCustomId('auto_v4_anti_spam')
        .setLabel('Sync Nexus')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔄')
    );

    await interaction.editReply({ embeds: [embed], components: [row] });
  },

  async handleSpamButtons(interaction, client) {
    const { customId, member, guildId } = interaction;
    if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: '❌ Authority level insufficient for Security Nexus control.', ephemeral: true });
    }

    await interaction.deferUpdate();
    const parts = customId.split('_');
    const action = parts[1];
    const value = parts[2];

    let guild = await Guild.findOne({ guildId });
    if (!guild) guild = new Guild({ guildId, name: interaction.guild.name });
    if (!guild.settings) guild.settings = {};
    if (!guild.settings.antispam) guild.settings.antispam = {};

    if (action === 'toggle') {
      guild.settings.antispam.enabled = (value === 'on');
    } else if (action === 'sense') {
      guild.settings.antispam.sensitivity = value;
    }

    await guild.save();
    await this.renderSpamNexus(interaction);
  }
};
