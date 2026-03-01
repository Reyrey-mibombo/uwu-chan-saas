const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('growth_tracking')
    .setDescription('Zenith Apex: Macroscopic Growth Trajectory & AI Forecasting'),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      // Zenith License Guard
      const license = await validatePremiumLicense(interaction);
      if (!license.allowed) {
        return interaction.editReply({ embeds: [license.embed], components: license.components });
      }

      const guildId = interaction.guildId;
      const guild = interaction.guild;

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

      const [thisWeek, lastWeek] = await Promise.all([
        Activity.find({ guildId, createdAt: { $gte: weekAgo } }).lean(),
        Activity.find({ guildId, createdAt: { $gte: twoWeeksAgo, $lt: weekAgo } }).lean()
      ]);

      const thisWeekMessages = thisWeek.filter(a => a.type === 'message').length;
      const lastWeekMessages = lastWeek.filter(a => a.type === 'message').length;

      const newMembers = guild.members.cache.filter(m => m.joinedAt && m.joinedAt >= weekAgo).size;
      const activeUsers = new Set(thisWeek.map(a => a.userId)).size;

      const growth = lastWeekMessages > 0
        ? ((thisWeekMessages - lastWeekMessages) / lastWeekMessages * 100).toFixed(1)
        : (thisWeekMessages > 0 ? 100 : 0);

      // 1. Generate Trajectory Ribbon (ASCII bar)
      const barLength = 15;
      const normalizedGrowth = Math.min(100, Math.max(-100, parseFloat(growth)));
      const filledLength = Math.round(((normalizedGrowth + 100) / 200) * barLength);
      const filled = '█'.repeat(filledLength);
      const empty = '░'.repeat(barLength - filledLength);
      const trajectoryRibbon = `\`[${filled}${empty}]\` **${growth}%**`;

      const embed = await createCustomEmbed(interaction, {
        title: '📊 Zenith Executive: Growth Trajectory Matrix',
        thumbnail: guild.iconURL({ dynamic: true }),
        description: `### 🔮 Predictive Expansion Intelligence\nRefining macroscopic growth vectors for the **${guild.name}** sector. Analyzing 7-day metabolic signal density.\n\n**💎 ZENITH APEX EXCLUSIVE**`,
        fields: [
          { name: '📈 Trajectory Ribbon (7D Pulse)', value: trajectoryRibbon, inline: false },
          { name: '👥 Workforce Expansion', value: `\`+${newMembers}\` New Nodes`, inline: true },
          { name: '📡 Signal Throughput', value: `\`${thisWeekMessages.toLocaleString()}\` Signals`, inline: true },
          { name: '🌐 Active Operatives', value: `\`${activeUsers}\` Registered`, inline: true },
          { name: '⚖️ Intelligence Tier', value: '`PLATINUM (APEX)`', inline: true },
          { name: '🛡️ Status', value: growth > 0 ? '`OPTIMIZED`' : '`NOMINAL`', inline: true }
        ],
        footer: 'Executive Intelligence Ribbons • V5 Executive Apex Suite',
        color: growth > 0 ? 'success' : 'premium'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Zenith Growth Tracking Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Growth Intelligence failure: Unable to establish trajectory ribbons.')] });
    }
  }
};
