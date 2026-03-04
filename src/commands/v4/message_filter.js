const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { createCustomEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('message_filter')
    .setDescription('⚙️ Macroscopic Message Filtration & Content Guard Grid')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction, client) {
    try {
      if (!interaction.deferred && !interaction.replied) await interaction.deferReply();

      const license = await validatePremiumLicense(interaction, 'premium');
      if (!license.allowed) {
        return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
      }

      await this.renderFilterNexus(interaction);

    } catch (error) {
      console.error('[message_filter] Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Filter Matrix failure: Unable to synchronize content guard settings.')] });
    }
  },

  async renderFilterNexus(interaction) {
    const guildId = interaction.guildId;
    let guild = await Guild.findOne({ guildId });
    if (!guild) guild = new Guild({ guildId, name: interaction.guild.name });

    const config = guild.settings?.messageFilter || { enabled: false, badWords: false, capsFilter: false, spamFilter: false };

    const embed = await createCustomEmbed(interaction, {
      title: '⚙️ Enterprise Guardian: Message Filter Nexus',
      thumbnail: interaction.guild.iconURL({ dynamic: true }),
      description: `### 🛡️ Macroscopic Content Surveillance\nConfiguring the content filtration matrix for sector **${interaction.guild.name}**. Real-time behavioral scanning is currently **${config.enabled ? 'OPTIMIZED' : 'DEACTIVATED'}**.\n\n**💎 Enterprise HYPER-FORGE EXCLUSIVE**`,
      fields: [
        { name: '🛡️ Shield Master', value: config.enabled ? '`🟢 ACTIVE`' : '`🔴 DISABLED`', inline: true },
        { name: '🤬 Profanity Guard', value: config.badWords ? '`🟢 ON`' : '`🔴 OFF`', inline: true },
        { name: '🔠 Caps Filtration', value: config.capsFilter ? '`🟢 ON`' : '`🔴 OFF`', inline: true },
        { name: '📡 Spam Mitigation', value: config.spamFilter ? '`🟢 ON`' : '`🔴 OFF`', inline: true },
        { name: '⚡ Scan Velocity', value: '`DEEP-PULSE`', inline: true },
        { name: '✨ System Status', value: '`STABLE`', inline: true }
      ],
      footer: 'Content Filtration Nexus • V4 Security Suite',
      color: config.enabled ? 'premium' : 'error'
    });

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`filter_toggle_master_${config.enabled ? 'off' : 'on'}`)
        .setLabel(config.enabled ? 'Master Shutdown' : 'Master Startup')
        .setStyle(config.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
        .setEmoji(config.enabled ? '🔒' : '🔓'),
      new ButtonBuilder()
        .setCustomId(`filter_toggle_badWords_${config.badWords ? 'off' : 'on'}`)
        .setLabel('Profanity')
        .setStyle(config.badWords ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setEmoji('🤬'),
      new ButtonBuilder()
        .setCustomId(`filter_toggle_capsFilter_${config.capsFilter ? 'off' : 'on'}`)
        .setLabel('Caps Filter')
        .setStyle(config.capsFilter ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setEmoji('🔠'),
      new ButtonBuilder()
        .setCustomId(`filter_toggle_spamFilter_${config.spamFilter ? 'off' : 'on'}`)
        .setLabel('Spam Guard')
        .setStyle(config.spamFilter ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setEmoji('📡')
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('auto_v4_message_filter')
        .setLabel('Sync Nexus')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔄')
    );

    await interaction.editReply({ embeds: [embed], components: [row1, row2] });
  },

  async handleFilterButtons(interaction, client) {
    const { customId, member, guildId } = interaction;
    if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: '❌ Authority level insufficient for sector filtration control.', ephemeral: true });
    }

    await interaction.deferUpdate();
    const parts = customId.split('_');
    const action = parts[1];
    const type = parts[2];
    const targetValue = (parts[3] === 'on');

    let guild = await Guild.findOne({ guildId });
    if (!guild) guild = new Guild({ guildId, name: interaction.guild.name });
    if (!guild.settings) guild.settings = {};
    if (!guild.settings.messageFilter) guild.settings.messageFilter = {};

    if (type === 'master') {
      guild.settings.messageFilter.enabled = targetValue;
    } else {
      guild.settings.messageFilter[type] = targetValue;
    }

    await guild.save();
    await this.renderFilterNexus(interaction);
  }
};
