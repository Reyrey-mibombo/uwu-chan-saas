const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');
const { Guild, Shift, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server_health')
    .setDescription('Zenith Apex: Macroscopic Sector Health Audit & Risk Modeling'),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      // Zenith License Guard
      const license = await validatePremiumLicense(interaction);
      if (!license.allowed) {
        return interaction.editReply({ embeds: [license.embed], components: license.components });
      }

      const guildId = interaction.guildId;
      const oneDayAgo = new Date(Date.now() - 86400000);
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

      const [guild, todayActivity, weekActivity, activeShifts] = await Promise.all([
        Guild.findOne({ guildId }).lean(),
        Activity.countDocuments({ guildId, createdAt: { $gte: oneDayAgo } }),
        Activity.countDocuments({ guildId, createdAt: { $gte: sevenDaysAgo } }),
        Shift.countDocuments({ guildId, endTime: null })
      ]);

      const stats = guild?.stats || {};
      const memberCount = interaction.guild.memberCount;
      const score = Math.min(100, Math.round(
        (Math.min(todayActivity, 50) / 50 * 40) +
        (Math.min(memberCount, 100) / 100 * 30) +
        (activeShifts > 0 ? 20 : 10) +
        (guild?.premium?.isActive ? 10 : 0)
      ));

      const trend = todayActivity > (weekActivity / 7) ? '📈 EXPANDING' : '📉 DECAY';

      // 1. Generate Macroscopic Risk Curve (ASCII Pulse)
      const riskIntensity = 100 - score;
      const pulseSegments = 10;
      const filled = '█'.repeat(Math.round((riskIntensity / 100) * pulseSegments));
      const empty = '░'.repeat(pulseSegments - filled.length);
      const riskCurve = `\`[${filled}${empty}]\` **${riskIntensity > 40 ? '⚠️ ELEVATED RISK' : '✅ STABLE'}**`;

      // 2. Metabolic Heartbeat Ribbon
      const healthSegments = 15;
      const healthFilled = '█'.repeat(Math.round(score / 100 * healthSegments));
      const healthEmpty = '░'.repeat(healthSegments - healthFilled.length);
      const heartbeatRibbon = `\`[${healthFilled}${healthEmpty}]\` **${score}% METABOLISM**`;

      const embed = await createCustomEmbed(interaction, {
        title: '💊 Zenith Hyper-Apex: Sector Metabolic Audit',
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        description: `### 🛡️ Sector Health Diagnostic\nAutomated macroscopic audit for the **${interaction.guild.name}** sector. Current Stability Trend: **${trend}**.\n\n**💎 ZENITH HYPER-APEX EXCLUSIVE**`,
        fields: [
          { name: '✨ Metabolic Heartbeat Ribbon', value: heartbeatRibbon, inline: false },
          { name: '📈 Macroscopic Risk Pulse', value: riskCurve, inline: false },
          { name: '👥 Node Density', value: `\`${memberCount}\` units`, inline: true },
          { name: '⚡ 24h Signal Pulse', value: `\`${todayActivity}\` signals`, inline: true },
          { name: '📅 Stability Trend', value: `**${trend}**`, inline: true },
          { name: '🔄 Active Patrols', value: `\`${activeShifts}\``, inline: true },
          { name: '🎖️ Visual Tier', value: '`PLATINUM [HYPER-APEX]`', inline: true },
          { name: '⚠️ Risk Fragments', value: `\`${stats.warnings || 0}\``, inline: true }
        ],
        footer: 'Executive Metabolic Diagnostic • V6 Enterprise Hyper-Apex Suite',
        color: score >= 80 ? 'success' : 'premium'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Zenith Server Health Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Sector Audit failure: Unable to synchronize metabolic risk curves.')] });
    }
  }
};
