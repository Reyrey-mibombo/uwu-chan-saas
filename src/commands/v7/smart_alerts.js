const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('smart_alerts')
    .setDescription('Zenith Hyper-Apex: Macroscopic Vector Neutralisation & High-Fidelity Tactical Alerts'),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      // Zenith License Guard
      const license = await validatePremiumLicense(interaction);
      if (!license.allowed) {
        return interaction.editReply({ embeds: [license.embed], components: license.components });
      }

      const guildId = interaction.guildId;
      const alerts = await Activity.find({ guildId, type: 'warning' }).sort({ createdAt: -1 }).limit(3).lean();

      // 1. Vector Neutralisation Frame (ASCII)
      const generateFrame = (content) => {
        const line = '═'.repeat(content.length + 2);
        return `╔${line}╗\n║ ${content} ║\n╚${line}╝`;
      };

      const alertLines = alerts.length > 0 ? alerts.map(a => {
        const type = (a.data?.reason || 'NOMINAL').toUpperCase();
        const user = a.userId.slice(-5);
        return `\`[${user}]\` ➔ \`${type}\``;
      }).join('\n') : '`🟢 NO ACTIVE THREAT VECTORS DETECTED`';

      // 2. Alert Integrity Ribbon
      const barLength = 12;
      const status = alerts.length > 2 ? 'RED' : (alerts.length > 0 ? 'YELLOW' : 'GREEN');
      const filled = status === 'RED' ? '█' : (status === 'YELLOW' ? '▓' : '░');
      const ribbon = `\`[${filled.repeat(barLength)}]\` **${status} STATUS**`;

      const embed = await createCustomEmbed(interaction, {
        title: '📡 Zenith Hyper-Apex: Smart Tactical Alerts',
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        description: `### 🛡️ Macroscopic Threat Neutralisation\nMonitoring active behavioral vectors and network anomalies for sector **${interaction.guild.name}**.\n\n**🎯 ACTIVE VECTORS**\n${alertLines}\n\n**💎 ZENITH HYPER-APEX EXCLUSIVE**`,
        fields: [
          { name: '⚖️ Vector Integrity Ribbon', value: ribbon, inline: false },
          { name: '🛰️ Signal Audit', value: '`FORENSIC-SYNC ACTIVE`', inline: true },
          { name: '🛡️ Neutraliser', value: '`ZENITH-SHIELD-V7`', inline: true },
          { name: '🌐 Network Sync', value: '`SYNCHRONIZED`', inline: true },
          { name: '✨ Intelligence', value: '`DIVINE [APEX]`', inline: true }
        ],
        footer: 'Smart Alert Orchestration • V7 Automation Hyper-Apex Suite',
        color: status === 'RED' ? 'danger' : (status === 'YELLOW' ? 'premium' : 'success')
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Zenith Smart Alerts Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Tactical Intelligence failure: Unable to decode neutralisation frames.')] });
    }
  }
};
