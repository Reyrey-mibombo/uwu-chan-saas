const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');
const { User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('efficiency_chart')
    .setDescription('Zenith Apex: High-Fidelity Spectral Performance Analysis')
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
          { name: '30 Days', value: '30' }
        )),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      // Zenith License Guard
      const license = await validatePremiumLicense(interaction);
      if (!license.allowed) {
        return interaction.editReply({ embeds: [license.embed], components: license.components });
      }

      const targetUser = interaction.options.getUser('user') || interaction.user;
      const guildId = interaction.guildId;
      const period = parseInt(interaction.options.getString('period') || '30');

      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - period);

      const [activities, user] = await Promise.all([
        Activity.find({ guildId, userId: targetUser.id, createdAt: { $gte: daysAgo } }).lean(),
        User.findOne({ userId: targetUser.id, guildId }).lean()
      ]);

      if (!user || !user.staff) {
        return interaction.editReply({ embeds: [createErrorEmbed(`No analytics found. <@${targetUser.id}> is unmapped in this sector.`)] });
      }

      const staff = user.staff;
      const commands = activities.filter(a => a.type === 'command').length;
      const warnings = activities.filter(a => a.type === 'warning').length;
      const messages = activities.filter(a => a.type === 'message').length;

      const efficiencyScore = calculateEfficiency(commands, warnings, messages, staff.consistency || 100);
      const spectralGauge = generateSpectralGauge(efficiencyScore);

      const embed = await createCustomEmbed(interaction, {
        title: `📊 Zenith Spectral Yield: ${targetUser.username}`,
        thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
        description: `### 🛡️ Apex Performance Audit\nMacroscopic trace of personnel execution gathered over a **${period}-day** trajectory. High-fidelity spectral visualization of behavioral metabolism.\n\n**💎 ZENITH APEX EXCLUSIVE**`,
        fields: [
          { name: '✨ Spectral Efficiency Ribbon', value: spectralGauge, inline: false },
          { name: '✅ Command Module', value: `\`${commands}\` Pings`, inline: true },
          { name: '💬 Chat Intelligence', value: `\`${messages}\` Logs`, inline: true },
          { name: '⚠️ Security Warnings', value: `\`${warnings}\` Flags`, inline: true },
          { name: '📈 Reliability Factor', value: `\`${staff.consistency || 100}%\``, inline: true },
          { name: '💫 Honorific Rating', value: `\`Rank [${getGrade(efficiencyScore)}]\``, inline: true },
          { name: '⚖️ Intelligence Tier', value: '`PLATINUM (APEX)`', inline: true }
        ],
        footer: 'Spectral Yield Visualization • V3 Strategic Apex Suite',
        color: efficiencyScore >= 80 ? 'success' : 'premium'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Zenith Efficiency Chart Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Efficiency Analytics failure: Unable to synchronize spectral ribbons.')] });
    }
  }
};

function calculateEfficiency(commands, warnings, messages, consistency) {
  const positiveActions = commands + messages;
  const totalActions = positiveActions + (warnings * 5); // Warnings have higher negative weight in Apex
  if (totalActions === 0) return 50;
  const actionScore = (positiveActions / Math.max(totalActions, 1)) * 70;
  const consistencyScore = (consistency / 100) * 30;
  return Math.min(100, Math.max(0, Math.round(actionScore + consistencyScore)));
}

function generateSpectralGauge(score) {
  const length = 15;
  const filledLength = Math.round((score / 100) * length);
  const filled = '█'.repeat(filledLength);
  const pattern = '▒'.repeat(Math.max(0, length - filledLength));
  return `\`[${filled}${pattern}]\` **${score}% VELOCITY**`;
}

function getGrade(score) {
  if (score >= 95) return 'S+ OVERLORD';
  if (score >= 85) return 'A+ ELITE';
  if (score >= 70) return 'B STABLE';
  if (score >= 50) return 'C NOMINAL';
  return 'F CRITICAL';
}
