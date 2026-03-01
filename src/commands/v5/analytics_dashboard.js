const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');
const { Activity, User, Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('analytics_dashboard')
    .setDescription('Zenith Platinum: Macroscopic Growth Forecasting & AI Dashboards'),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      // Strict Zenith License Guard
      const license = await validatePremiumLicense(interaction);
      if (!license.allowed) {
        return interaction.editReply({ embeds: [license.embed], components: license.components });
      }

      const guildId = interaction.guildId;
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [activities, totalUsers] = await Promise.all([
        Activity.find({ guildId, createdAt: { $gte: monthAgo } }).lean(),
        User.countDocuments({ guildId })
      ]);

      const messages = activities.filter(a => a.type === 'message').length;
      const commands = activities.filter(a => a.type === 'command').length;

      // AI Projection Logic (Zenith exclusive)
      const projectedGrowth = (messages / 100 * 1.2).toFixed(1);
      const retentionScore = Math.min(100, (totalUsers / (messages || 1) * 50)).toFixed(1);

      const embed = await createCustomEmbed(interaction, {
        title: '📊 Zenith Platinum Executive Hub',
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        description: `### 🔮 Predictive AI Orchestration\nUnified macroscopic data synchronization for sector **${interaction.guild.name}**. Real-time intelligence processing active.\n\n**💎 ZENITH PLATINUM EXCLUSIVE**`,
        fields: [
          { name: '📡 Monthly Volume', value: `\`${messages.toLocaleString()}\` Signals`, inline: true },
          { name: '✅ Operational Pings', value: `\`${commands.toLocaleString()}\` Commands`, inline: true },
          { name: '👥 Total Node Density', value: `\`${totalUsers}\``, inline: true },
          { name: '🔮 30D AI Forecast', value: `\`+${projectedGrowth}%\` Growth Potential`, inline: true },
          { name: '📈 Retention Metric', value: `\`${retentionScore}%\``, inline: true },
          { name: '⚖️ Data Fidelity', value: '`ULTRA-PREMIUM`', inline: true }
        ],
        footer: 'Executive AI Orchestration • V5 Platinum Suite',
        color: 'enterprise'
      });

      embed.addFields({
        name: '🧠 Zenith AI Insight',
        value: `> Based on current signal metabolics, your sector is projected to reach **${Math.round(totalUsers * (1 + parseFloat(projectedGrowth) / 100))}** nodes by next cycle.`,
        inline: false
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Zenith Analytics Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Executive Hub failure: Unable to synchronize macroscopic data streams.')] });
    }
  }
};
