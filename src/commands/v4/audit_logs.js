const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('audit_logs')
    .setDescription('Zenith Apex: High-Fidelity Guardian Security Ledger'),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      // Zenith License Guard
      const license = await validatePremiumLicense(interaction);
      if (!license.allowed) {
        return interaction.editReply({ embeds: [license.embed], components: license.components });
      }

      const guildId = interaction.guildId;
      const logs = await Activity.find({ guildId })
        .sort({ createdAt: -1 })
        .limit(8);

      if (logs.length === 0) {
        return interaction.editReply({ embeds: [createErrorEmbed('No audit log signals found in the active telemetry registry.')] });
      }

      const formatLog = (log) => {
        const time = new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const action = log.type?.toUpperCase() || 'SIGNAL';
        const user = log.userId ? `<@${log.userId}>` : '`Unknown`';
        return `\`[${time}]\` **${action}** ░ ${user}`;
      };

      const embed = await createCustomEmbed(interaction, {
        title: '📋 Zenith Guardian Security Ledger',
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        description: `### 🛡️ Operational Audit Node\nChronological forensic trace of security interventions and system metabolic events in the **${interaction.guild.name}** sector.\n\n**💎 ZENITH APEX EXCLUSIVE**`,
        fields: [
          { name: '📑 High-Fidelity Ledger Output', value: logs.map(formatLog).join('\n') || '*Active registry empty.*', inline: false },
          { name: '⚖️ Data Fidelity', value: '`ULTRA-PREMIUM`', inline: true },
          { name: '🛰️ Monitor Cache', value: '`ENCRYPTED`', inline: true },
          { name: '🛡️ Auth Node', value: '`ZENITH-01`', inline: true }
        ],
        footer: 'Authenticated Security Ledger • V4 Guardian Apex Suite',
        color: 'premium'
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Zenith Audit Logs Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Guardian Ledger failure: Unable to decode encrypted signals.')] });
    }
  }
};
