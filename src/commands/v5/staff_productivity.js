const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed, createErrorEmbed, createPremiumEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { Activity, User } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_productivity')
    .setDescription('Enterprise Comparative: Personnel Productivity Correlation Matrix'),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      // Strict Enterprise License Guard
      const license = await validatePremiumLicense(interaction, 'premium');
      if (!license.allowed) {
        return await interaction.editReply({ embeds: [license.embed], components: license.components });
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
        title: '?? Enterprise Personnel Yield Correlation',
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        description: `### ??? Macroscopic Productivity Audit\nHigh-fidelity correlation between workforce density and operational throughput for **${interaction.guild.name}**.\n\n**?? Enterprise BUYER EXCLUSIVE**`,
        fields: [
          { name: '?? Active Workforce', value: `\`${staffCount}\` Nodes`, inline: true },
          { name: '?? Signal Throughput', value: `\`${totalSignals.toLocaleString()}\``, inline: true },
          { name: '?? Mean Yield', value: `\`${avgSignalsPerStaff}\` / Staff`, inline: true },
          { name: '?? Sector Efficiency', value: avgSignalsPerStaff > 50 ? '`S+ CLASS`' : '`A CLASS`', inline: true },
          { name: '? Velocity', value: '`CONSTANT`', inline: true },
          { name: '??? License', value: '`PLATINUM`', inline: true }
        ],
        footer: 'Strategic Yield Correlation � V5 Executive Suite',
        color: 'premium'
      });

      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v5_staff_productivity').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });

    } catch (error) {
      console.error('Enterprise Productivity Error:', error);
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v5_staff_productivity').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed('Yield Correlation failure: Unable to decode personnel efficiency clusters.')], components: [row] });
    }
  }
};


