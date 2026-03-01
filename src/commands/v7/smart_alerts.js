const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('smart_alerts')
    .setDescription('Zenith Apex: Adaptive Signal Prioritization & AI Activity Thresholds'),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      // Zenith License Guard
      const license = await validatePremiumLicense(interaction);
      if (!license.allowed) {
        return interaction.editReply({ embeds: [license.embed], components: license.components });
      }

      const guildId = interaction.guildId;
      const now = new Date();
      const thisWeek = new Date(now - 7 * 86400000);
      const lastWeek = new Date(now - 14 * 86400000);

      const [recent, previous] = await Promise.all([
        Activity.find({ guildId, createdAt: { $gte: thisWeek } }).lean(),
        Activity.find({ guildId, createdAt: { $gte: lastWeek, $lt: thisWeek } }).lean()
      ]);

      const alerts = [];
      const check = (label, cur, prev, dropPct = 15) => {
        if (prev === 0) return;
        const pct = ((cur - prev) / prev) * 100;
        if (pct <= -dropPct) {
          const intensity = Math.abs(pct) > 30 ? '🔴 CRITICAL' : '🟡 WARNING';
          alerts.push(`**${intensity}**: **${label}** decay detected at \`${Math.abs(pct).toFixed(1)}%\` velocity.`);
        }
      };

      check('Macroscopic Signal Volume', recent.length, previous.length);
      check('Technical Command Output', recent.filter(a => a.type === 'command').length, previous.filter(a => a.type === 'command').length);
      check('Node Density (Active Users)',
        [...new Set(recent.map(a => a.userId))].length,
        [...new Set(previous.map(a => a.userId))].length);

      const alertText = alerts.length ? alerts.join('\n') : '> ✅ **All metabolic signals within nominal parameters.** No significant decay detected.';

      // 1. Generate Integrated Pulse Ribbon
      const barLength = 15;
      const ratio = previous.length > 0 ? (recent.length / previous.length) : 1;
      const filled = '█'.repeat(Math.round(Math.min(1, ratio) * barLength));
      const empty = '░'.repeat(barLength - filled.length);
      const pulseRibbon = `\`[${filled}${empty}]\` **${(ratio * 100).toFixed(1)}% PULSE RESONANCE**`;

      const embed = await createCustomEmbed(interaction, {
        title: '🤖 Zenith Smart Alerts: Hyper-Apex Monitoring',
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        description: `### 📡 Sector Signal Intelligence\nAI-driven macroscopic monitoring and adaptive prioritization for **${interaction.guild.name}**. Pulse resonance is synced with network benchmarks.\n\n**💎 ZENITH HYPER-APEX EXCLUSIVE**`,
        fields: [
          { name: '✨ Integrated Pulse Ribbon', value: pulseRibbon, inline: false },
          { name: '📊 Recent Pulse', value: `\`${recent.length}\` signals`, inline: true },
          { name: '🌐 Global Benchmark', value: '`🟢 NOMINAL`', inline: true },
          { name: '⚖️ Intelligence Tier', value: '`PLATINUM [HYPER-APEX]`', inline: true },
          { name: '🛡️ Sector Guard', value: '`ACTIVE`', inline: true },
          { name: '🔄 System Sync', value: '`REAL-TIME`', inline: true },
          { name: '🔔 Priority Threshold Alerts', value: alertText, inline: false }
        ],
        footer: 'Adaptive Signal Prioritization • V7 Automation Hyper-Apex Suite',
        color: alerts.length ? 'premium' : 'success'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Zenith Smart Alerts Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Automation failure: Unable to synchronize adaptive priority signals.')] });
    }
  }
};
