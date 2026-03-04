const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits } = require('discord.js');
const { createPremiumEmbed, createCustomEmbed, createSuccessEmbed, createErrorEmbed } = require('../../utils/enhancedEmbeds');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('link_blocker')
    .setDescription('🚫 Configure macroscopic link blocking and filtration settings')
    .addBooleanOption(option =>
      option.setName('enabled')
        .setDescription('Initial enable/disable state')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction, client) {
    try {
      if (!interaction.deferred && !interaction.replied) await interaction.deferReply();

      const manualEnable = interaction.options?.getBoolean('enabled');
      if (manualEnable !== null && manualEnable !== undefined) {
        const guildId = interaction.guildId;
        let guild = await Guild.findOne({ guildId });
        if (!guild) guild = new Guild({ guildId, name: interaction.guild.name });
        if (!guild.settings) guild.settings = {};
        if (!guild.settings.linkBlocker) guild.settings.linkBlocker = { enabled: false, whitelist: false, allowedLinks: [] };
        guild.settings.linkBlocker.enabled = manualEnable;
        await guild.save();
      }

      await this.renderLinkPortal(interaction);
    } catch (error) {
      console.error('[link_blocker] Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Filter Matrix failure: Unable to synchronize link blocking protocols.')] });
    }
  },

  async renderLinkPortal(interaction) {
    const guildId = interaction.guildId;
    let guild = await Guild.findOne({ guildId });
    if (!guild) guild = new Guild({ guildId, name: interaction.guild.name });

    const config = guild.settings?.linkBlocker || { enabled: false, whitelist: false, allowedLinks: [] };
    const status = config.enabled ? '🟢 SHIELD ACTIVE' : '🔴 SHIELD DEACTIVATED';
    const mode = config.whitelist ? '🛡️ Whitelist Mode' : '🚫 Blacklist Mode';

    const embed = await createCustomEmbed(interaction, {
      title: '🚫 Enterprise Guardian: Link Filtration',
      thumbnail: interaction.guild.iconURL({ dynamic: true }),
      description: `### 🔒 Macroscopic Perimeter Control\nConfiguring macroscopic link filtration for the **${interaction.guild.name}** sector. Neutralize unauthorized external vectors.\n\n**💎 Enterprise HYPER-APEX EXCLUSIVE**`,
      fields: [
        { name: '🛡️ Shield Status', value: `\`${status}\``, inline: true },
        { name: '⚖️ Active Mode', value: `\`${mode}\``, inline: true },
        { name: '🌐 Global Grid', value: '`ENCRYPTED`', inline: true },
        { name: '🔗 Whitelisted Domains', value: `\`${config.allowedLinks?.length || 0} Domains\``, inline: true },
        { name: '⚡ Filter Depth', value: '`DEEP-SCAN`', inline: true },
        { name: '✨ System Pulse', value: '`STABLE`', inline: true }
      ],
      footer: 'Link Filtration Portal • V4 Security Suite',
      color: config.enabled ? 'premium' : 'error'
    });

    if (config.allowedLinks?.length > 0) {
      embed.addFields({ name: '📜 Active Whitelist Snapshot', value: `\`${config.allowedLinks.slice(0, 5).join(', ')}${config.allowedLinks.length > 5 ? '...' : ''}\``, inline: false });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`link_toggle_${config.enabled ? 'off' : 'on'}`)
        .setLabel(config.enabled ? 'Disable Shield' : 'Enable Shield')
        .setStyle(config.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
        .setEmoji(config.enabled ? '🔒' : '🔓'),
      new ButtonBuilder()
        .setCustomId('link_whitelist_add')
        .setLabel('Manage Whitelist')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔗'),
      new ButtonBuilder()
        .setCustomId('auto_v4_link_blocker')
        .setLabel('Relay Sync')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔄')
    );

    await interaction.editReply({ embeds: [embed], components: [row] });
  },

  async handleLinkButtons(interaction, client) {
    const { customId, member, guildId } = interaction;
    if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: '❌ Authority level insufficient for Security Nexus control.', ephemeral: true });
    }

    if (customId === 'link_whitelist_add') {
      const modal = new ModalBuilder()
        .setCustomId('link_whitelist_modal')
        .setTitle('Whitelist Management');

      const linkInput = new TextInputBuilder()
        .setCustomId('link_input')
        .setLabel('Domains to whitelist (comma separated)')
        .setPlaceholder('google.com, discord.com, youtube.com')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(linkInput));
      return await interaction.showModal(modal);
    }

    await interaction.deferUpdate();
    const parts = customId.split('_');
    const action = parts[1];
    const value = parts[2];

    let guild = await Guild.findOne({ guildId });
    if (!guild) guild = new Guild({ guildId, name: interaction.guild.name });
    if (!guild.settings) guild.settings = {};
    if (!guild.settings.linkBlocker) guild.settings.linkBlocker = {};

    if (action === 'toggle') {
      guild.settings.linkBlocker.enabled = (value === 'on');
    }

    await guild.save();
    await this.renderLinkPortal(interaction);
  },

  async handleLinkModal(interaction, client) {
    const { guildId } = interaction;
    const links = interaction.fields.getTextInputValue('link_input');
    const domains = links.split(',').map(l => l.trim().toLowerCase()).filter(l => l);

    await interaction.deferReply({ ephemeral: true });

    let guild = await Guild.findOne({ guildId });
    if (!guild) guild = new Guild({ guildId, name: interaction.guild.name });
    if (!guild.settings) guild.settings = {};
    if (!guild.settings.linkBlocker) guild.settings.linkBlocker = { enabled: true, whitelist: true, allowedLinks: [] };

    guild.settings.linkBlocker.allowedLinks = domains;
    guild.settings.linkBlocker.whitelist = true;
    await guild.save();

    await interaction.editReply({ embeds: [createSuccessEmbed('🔗 Whitelist Synchronized', `Successfully updated the perimeter whitelist with **${domains.length}** authorized domains.`)] });
  }
};
