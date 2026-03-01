const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Activity, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_behavior')
    .setDescription('Analyze staff behavior with predictive modeling')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member to analyze').setRequired(false))
    .addIntegerOption(opt => opt.setName('days').setDescription('Days to analyze').setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const guildId = interaction.guildId;
      const targetUser = interaction.options.getUser('user');
      const userId = targetUser?.id;
      const days = interaction.options.getInteger('days') || 30;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const query = { guildId, createdAt: { $gte: startDate } };
      if (userId) query.userId = userId;

      const activities = await Activity.find(query).lean();

      const warnings = activities.filter(a => a.type === 'warning').length;
      const shifts = activities.filter(a => a.type === 'shift').length;
      const commands = activities.filter(a => a.type === 'command').length;
      const promotions = activities.filter(a => a.type === 'promotion').length;

      // Behavioral Index Calculation
      const riskScore = (warnings * 20) - (shifts * 2) - (commands * 0.5);
      let rating = 'MARVELOUS';
      let statusColor = 'success';

      if (riskScore > 50) { critical: { rating = 'CRITICAL RISK'; statusColor = 'premium'; } }
      else if (riskScore > 20) { suspect: { rating = 'SUSPECT OBEDIENCE'; statusColor = 'primary'; } }
      else if (riskScore > 0) { nominal: { rating = 'NOMINAL'; statusColor = 'primary'; } }

      const embed = await createCustomEmbed(interaction, {
        title: `👀 Personnel Behavioral Matrix: ${targetUser?.username || 'Aggregated Sector'}`,
        thumbnail: targetUser?.displayAvatarURL({ dynamic: true }) || interaction.guild.iconURL({ dynamic: true }),
        description: `### 🛡️ Behavioral Intelligence Audit\nPersonnel audit conducted over a **${days}-day** vector in the **${interaction.guild.name}** sector. Analyzing risk factors and performance stability.`,
        fields: [
          { name: '⚠️ Disciplinary (Warn)', value: `\`${warnings}\``, inline: true },
          { name: '🔄 Operational (Shift)', value: `\`${shifts}\``, inline: true },
          { name: '✅ Technical (Cmd)', value: `\`${commands}\``, inline: true },
          { name: '🎖️ Hierarchy (Promo)', value: `\`${promotions}\``, inline: true },
          { name: '🧠 Behavioral Index', value: `**Rating: \`[ ${rating} ]\`**`, inline: false },
          { name: '⚖️ Reliability Metric', value: `\`Risk Factor: ${riskScore.toFixed(1)}\``, inline: true }
        ],
        footer: 'Predictive Personnel Modeling • V5 Executive Suite',
        color: statusColor
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Staff Behavior Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Behavioral Intelligence failure: Unable to decode personnel stability matrices.')] });
    }
  }
};
