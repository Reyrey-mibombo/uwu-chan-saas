const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('efficiency_chart')
    .setDescription('Visualize a performance efficiency scale.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to view efficiency for')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('period')
        .setDescription('Time period')
        .setRequired(false)
        .addChoices(
          { name: '7 Days', value: '7' },
          { name: '30 Days', value: '30' },
          { name: '90 Days', value: '90' }
        )),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const guildId = interaction.guildId;
      const period = parseInt(interaction.options.getString('period') || '30');

      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - period);

      const activities = await Activity.find({
        guildId,
        userId: targetUser.id,
        createdAt: { $gte: daysAgo }
      }).lean();

      const user = await User.findOne({ userId: targetUser.id, guildId }).lean();

      if (!user || !user.staff) {
        return interaction.editReply({ embeds: [createErrorEmbed(`No analytics found. <@${targetUser.id}> is unmapped in this server.`)] });
      }

      const staff = user.staff || {};

      const commands = activities.filter(a => a.type === 'command').length;
      const warnings = activities.filter(a => a.type === 'warning').length;
      const messages = activities.filter(a => a.type === 'message').length;

      const efficiencyScore = calculateEfficiency(commands, warnings, messages, staff.consistency || 100);
      const chart = generateEfficiencyChart(efficiencyScore);

      const embed = await createCustomEmbed(interaction, {
        title: `📊 Strategic Yield Analysis: ${targetUser.username}`,
        thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
        description: `### 🛡️ Performance Telemetry: Sector ${interaction.guild.name}\nAutomated diagnostic of personnel execution gathered over a **${period} Day** vector. Analysis based on behavioral consistency and interaction yields.`,
        fields: [
          { name: '⚖️ Efficiency Gradient', value: chart, inline: false },
          { name: '⚙️ Operational Constraints', value: 'Yield distribution across core interaction modules.', inline: false },
          { name: '✅ Command Module', value: `\`${commands}\` Pings`, inline: true },
          { name: '💬 Chat Intelligence', value: `\`${messages}\` Logs`, inline: true },
          { name: '⚠️ Security Warnings', value: `\`${warnings}\` Incidents`, inline: true },
          { name: '🛡️ Local Consistency', value: `\`${staff.consistency || 100}%\``, inline: true },
          { name: '💫 Reputation Yield', value: `\`${staff.reputation || 0}\``, inline: true },
          { name: '⭐ Lifetime Points', value: `\`${(staff.points || 0).toLocaleString()}\``, inline: true }
        ],
        footer: 'Predictive Spectral Analytics • V3 Strategic Suite',
        color: efficiencyScore >= 80 ? 'success' : 'premium'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Efficiency Chart Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Efficiency Analytics failure: Unable to establish behavioral telemetry.')] });
    }
  }
};

function calculateEfficiency(commands, warnings, messages, consistency) {
  const positiveActions = commands + messages;
  const totalActions = positiveActions + warnings;
  if (totalActions === 0) return 50;
  const actionScore = (positiveActions / Math.max(totalActions, 1)) * 70;
  const consistencyScore = (consistency / 100) * 30;
  return Math.min(100, Math.max(0, Math.round(actionScore + consistencyScore)));
}

function generateEfficiencyChart(score) {
  const bars = Math.round(score / 10);
  const barChar = '█';
  const emptyChar = '░';
  const visual = `\`${barChar.repeat(bars)}${emptyChar.repeat(10 - bars)}\` **${score}%**`;

  let grade = 'C';
  if (score >= 95) grade = 'S+ (Elite)';
  else if (score >= 85) grade = 'A (Exceptional)';
  else if (score >= 70) grade = 'B (Standard)';

  return `${visual}\n> **Calculated Grade:** \`Rank [${grade}]\``;
}
