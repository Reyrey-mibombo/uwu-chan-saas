const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');
const { Activity, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_behavior')
    .setDescription('Zenith Apex: AI Reliability Scoring & Personnel Stability Matrix')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member to analyze').setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      // Zenith License Guard
      const license = await validatePremiumLicense(interaction);
      if (!license.allowed) {
        return interaction.editReply({ embeds: [license.embed], components: license.components });
      }

      const guildId = interaction.guildId;
      const targetUser = interaction.options.getUser('user') || interaction.user;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const [activities, user] = await Promise.all([
        Activity.find({ guildId, userId: targetUser.id, createdAt: { $gte: startDate } }).lean(),
        User.findOne({ userId: targetUser.id, guildId }).lean()
      ]);

      if (!user || !user.staff) {
        return interaction.editReply({ embeds: [createErrorEmbed(`No behavioral trace found. <@${targetUser.id}> is unmapped.`)] });
      }

      const warnings = activities.filter(a => a.type === 'warning').length;
      const shifts = activities.filter(a => a.type === 'shift').length;
      const commands = activities.filter(a => a.type === 'command').length;

      // Zenith AI Reliability Logic
      const baseReliability = 100;
      const penalty = (warnings * 15);
      const bonus = Math.min(20, (shifts * 2) + (commands * 0.1));
      const reliabilityScore = Math.min(100, Math.max(0, baseReliability - penalty + bonus));

      // Reliability Bar
      const barLength = 15;
      const filled = '█'.repeat(Math.round((reliabilityScore / 100) * barLength));
      const empty = '░'.repeat(barLength - filled.length);
      const reliabilityViz = `\`[${filled}${empty}]\` **${reliabilityScore.toFixed(1)}% STABILITY**`;

      const embed = await createCustomEmbed(interaction, {
        title: `🧠 Zenith AI Behavioral Audit: ${targetUser.username}`,
        thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
        description: `### 🛡️ Personnel Stability Orchestration\nMacroscopic behavioral analysis conducted over a **30-day** period in sector **${interaction.guild.name}**. Cross-referencing risk factors vs performance metabolism.\n\n**💎 ZENITH APEX EXCLUSIVE**`,
        fields: [
          { name: '⚖️ AI Reliability Score', value: reliabilityViz, inline: false },
          { name: '⚠️ Security Incidents', value: `\`${warnings}\` Flags`, inline: true },
          { name: '🔄 Operational Shifting', value: `\`${shifts}\` Cycles`, inline: true },
          { name: '✅ Command Precision', value: `\`${commands}\` Pings`, inline: true },
          { name: '🛡️ Status Rating', value: reliabilityScore > 80 ? '`S-RANK STABLE`' : (reliabilityScore > 50 ? '`B-RANK NOMINAL`' : '`F-RANK CRITICAL`'), inline: true },
          { name: '📈 Trajectory', value: reliabilityScore > 70 ? '`UPWARD`' : '`DECAYING`', inline: true }
        ],
        footer: 'AI Behavioral Modeling • V5 Executive Apex Suite',
        color: reliabilityScore > 75 ? 'success' : 'premium'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Zenith Staff Behavior Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Behavioral Intelligence failure: Unable to compute reliability matrices.')] });
    }
  }
};
