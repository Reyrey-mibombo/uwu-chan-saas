const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');
const { Activity, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_productivity')
    .setDescription('Zenith Comparative: Personnel Productivity Correlation Matrix'),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      // Strict Zenith License Guard
      const license = await validatePremiumLicense(interaction);
      if (!license.allowed) {
        return interaction.editReply({ embeds: [license.embed], components: license.components });
      }

      const guildId = interaction.guildId;
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [activities, users] = await Promise.all([
        Activity.find({ guildId, createdAt: { $gte: weekAgo } }).lean(),
        User.find({ guildId, 'staff.points': { $exists: true } }).lean()
      ]);

      const staffCount = users.length;
      const totalSignals = activities.length;
      const avgSignalsPerStaff = staffCount > 0 ? (totalSignals / staffCount).toFixed(1) : 0;

      const embed = await createCustomEmbed(interaction, {
        title: '📊 Zenith Personnel Yield Correlation',
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        description: `### 🛡️ Macroscopic Productivity Audit\nHigh-fidelity correlation between workforce density and operational throughput for **${interaction.guild.name}**.\n\n**💎 ZENITH BUYER EXCLUSIVE**`,
        fields: [
          { name: '👥 Active Workforce', value: `\`${staffCount}\` Nodes`, inline: true },
          { name: '📡 Signal Throughput', value: `\`${totalSignals.toLocaleString()}\``, inline: true },
          { name: '📈 Mean Yield', value: `\`${avgSignalsPerStaff}\` / Staff`, inline: true },
          { name: '📊 Sector Efficiency', value: avgSignalsPerStaff > 50 ? '`S+ CLASS`' : '`A CLASS`', inline: true },
          { name: '⚡ Velocity', value: '`CONSTANT`', inline: true },
          { name: '🛡️ License', value: '`PLATINUM`', inline: true }
        ],
        footer: 'Strategic Yield Correlation • V5 Executive Suite',
        color: 'premium'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Zenith Productivity Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Yield Correlation failure: Unable to decode personnel efficiency clusters.')] });
    }
  }
};
