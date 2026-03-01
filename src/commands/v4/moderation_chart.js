const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moderation_chart')
    .setDescription('Zenith Apex: Macroscopic Threat Curves & Security Analytics')
    .addStringOption(option =>
      option.setName('period')
        .setDescription('Time period')
        .setRequired(false)
        .addChoices(
          { name: 'Last 24h', value: 'today' },
          { name: 'Last 7 Days', value: 'week' }
        )),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      // Zenith License Guard
      const license = await validatePremiumLicense(interaction);
      if (!license.allowed) {
        return interaction.editReply({ embeds: [license.embed], components: license.components });
      }

      const period = interaction.options.getString('period') || 'week';
      const guildId = interaction.guildId;

      let startDate = new Date();
      if (period === 'today') {
        startDate.setHours(startDate.getHours() - 24);
      } else {
        startDate.setDate(startDate.getDate() - 7);
      }

      const actions = await Activity.aggregate([
        {
          $match: {
            guildId,
            type: { $in: ['warning', 'command'] },
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$data.action',
            count: { $sum: 1 }
          }
        }
      ]);

      const stats = {
        warn: 0,
        ban: 0,
        kick: 0,
        mute: 0,
        strike: 0
      };

      actions.forEach(a => {
        const key = a._id || 'other';
        if (stats.hasOwnProperty(key)) {
          stats[key] = a.count;
        }
      });

      const total = Object.values(stats).reduce((a, b) => a + b, 0);

      // 1. Generate Macroscopic Threat Curve (ASCII-style pulse)
      const pulseSegments = 10;
      const threatDensity = Math.min(pulseSegments, Math.ceil((total / (period === 'today' ? 10 : 50)) * pulseSegments));
      const pulse = '█'.repeat(threatDensity) + '░'.repeat(pulseSegments - threatDensity);
      const threatCurve = `\`[${pulse}]\` **${total > 20 ? '🔥 HIGH PULSE' : '🟢 STABLE'}**`;

      const embed = await createCustomEmbed(interaction, {
        title: '📊 Zenith Guardian: Macroscopic Threat Curves',
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        description: `### 🛡️ Sector Incident Intelligence\nHigh-fidelity trace of security interventions and system events for **${interaction.guild.name}**. Monitoring metabolic threat vectors.\n\n**💎 ZENITH APEX EXCLUSIVE**`,
        fields: [
          { name: '🛰️ Macroscopic Threat Pulse', value: threatCurve, inline: false },
          { name: '⚠️ Disciplinary (Warn)', value: `\`${stats.warn}\``, inline: true },
          { name: '🚫 Neutralization (Ban)', value: `\`${stats.ban}\``, inline: true },
          { name: '👢 Extraction (Kick)', value: `\`${stats.kick}\``, inline: true },
          { name: '🔇 Silencing (Mute)', value: `\`${stats.mute}\``, inline: true },
          { name: '⚖️ Infractions', value: `\`${stats.strike}\``, inline: true },
          { name: '🛡️ Shield Status', value: '`ACTIVE`', inline: true }
        ],
        footer: 'Guardian Intelligence Pulse • V4 Guardian Apex Suite',
        color: total > 10 ? 'premium' : 'success'
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Zenith Moderation Chart Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Guardian Analytics failure: Unable to establish macroscopic threat curves.')] });
    }
  }
};
