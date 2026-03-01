const { SlashCommandBuilder } = require('discord.js');
const { Guild, Activity, User } = require('../../database/mongo');
const { createCustomEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('interactive_dashboard')
    .setDescription('Zenith Hyper-Apex: Full Divine Interactive Sector Dashboard'),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      // Zenith Hyper-Apex License Guard
      const license = await validatePremiumLicense(interaction);
      if (!license.allowed) {
        return interaction.editReply({ embeds: [license.embed], components: license.components });
      }

      const guildId = interaction.guildId;
      const now = new Date();
      const sevenDaysAgo = new Date(now - 7 * 86400000);

      const [guild, weekActs, stats] = await Promise.all([
        Guild.findOne({ guildId }).lean(),
        Activity.find({ guildId, createdAt: { $gte: sevenDaysAgo } }).lean(),
        Promise.resolve(license.guildData?.stats || {})
      ]);

      const memberCount = interaction.guild.memberCount;
      const activeUsers = [...new Set(weekActs.map(a => a.userId))].length;
      const engRate = Math.round((activeUsers / Math.max(memberCount, 1)) * 100);
      const uptime = process.uptime();
      const uptimeStr = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`;

      const engBar = '█'.repeat(Math.round(engRate / 10)) + '░'.repeat(10 - Math.round(engRate / 10));

      const embed = await createCustomEmbed(interaction, {
        title: '💎 Zenith Divine Identity: Interactive Dashboard',
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        description: `### 🛡️ Divine Sector Orchestration\nMacroscopic administrative portal for **${interaction.guild.name}**. Real-time metabolic ROI and pulse synchronization active.\n\n**💎 ZENITH HYPER-APEX EXCLUSIVE**`,
        fields: [
          { name: '👥 Personnel Nodes', value: `\`${memberCount}\` units`, inline: true },
          { name: '✅ Active Resonance', value: `\`${activeUsers}\` nodes (7d)`, inline: true },
          { name: '📊 Metabolic ROI', value: `\`${engBar}\` **+${engRate}%**`, inline: false },
          { name: '⚡ Pulse Signals', value: `\`${(stats.commandsUsed || 0).toLocaleString()}\` cmd`, inline: true },
          { name: '⚠️ Risk Fragments', value: `\`${stats.warnings || 0}\` alert`, inline: true },
          { name: '🤖 System Uptime', value: `\`${uptimeStr}\``, inline: true },
          { name: '🌐 Global Benchmark', value: '`🟢 ELITE PERFORMANCE`', inline: true },
          { name: '✨ Visual Tier', value: '`DIVINE [HYPER-APEX]`', inline: true },
          { name: '🔄 Omni- ब्रिज', value: '`SYNCHRONIZED`', inline: true }
        ],
        footer: 'Divine Identity Dashboard • V8 Identity Matrix Suite',
        color: 'premium'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Interactive Dashboard Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Nexus failure: Unable to synchronize Divine Identity Dashboard.')] });
    }
  }
};
