const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed, createErrorEmbed, createPremiumEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { User } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('performance_stats')
    .setDescription('View high-fidelity personnel yield matrices')
    .addUserOption(opt => opt.setName('user').setDescription('User to view stats for').setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'premium');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }
      const guildId = interaction.guildId;
      const targetUser = interaction.options.getUser('user');
      const userId = targetUser?.id;

      if (userId) {
        const user = await User.findOne({ userId, guildId }).lean();
        if (!user) {
          const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v5_performance_stats').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed(`No performance logs retrieved. <@${targetUser.id}> isn't mapped inside this server.`)], components: [row] });
        }

        const staff = user.staff || {};

        const embed = await createCustomEmbed(interaction, {
          title: `?? Personnel Yield Matrix: ${targetUser.username}`,
          thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
          description: `### ??? Operational Performance Audit\nMacroscopic trace of authenticated contributions and behavioral consistency within the **${interaction.guild.name}** sector.`,
          fields: [
            { name: '? Experience Level', value: `\`LVL ${staff.level || 1}\``, inline: true },
            { name: '?? Accumulated Merit', value: `\`${staff.points || 0}\` Points`, inline: true },
            { name: '?? Disciplinary Trace', value: `\`${staff.warnings || 0}\` Signals`, inline: true },
            { name: '?? Operational Volume', value: `\`${Math.round((staff.shiftTime || 0) / 60)}h\` Total`, inline: true },
            { name: '?? Yield Consistency', value: `\`${staff.consistency || 100}%\``, inline: true },
            { name: '??? Hierarchy Rank', value: `\`${(staff.rank || 'MEMBER').toUpperCase()}\``, inline: true },
            { name: '?? Peer Honor', value: `\`${staff.reputation || 0}\` Comms`, inline: true },
            { name: '?? Integrity Rating', value: '`?? OPTIMIZED` | `Executive V5 Standard`', inline: true }
          ],
          footer: 'Personnel Yield Modeling � V5 Executive Suite',
          color: 'premium'
        });

        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v5_performance_stats').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
      } else {
        const users = await User.find({ guildId, 'staff.points': { $exists: true } }).lean();

        const totalPoints = users.reduce((sum, u) => sum + (u.staff?.points || 0), 0);
        const totalWarnings = users.reduce((sum, u) => sum + (u.staff?.warnings || 0), 0);
        const totalShiftTime = users.reduce((sum, u) => sum + (u.staff?.shiftTime || 0), 0);
        const avgConsistency = users.length > 0
          ? users.reduce((sum, u) => sum + (u.staff?.consistency || 100), 0) / users.length
          : 100;

        const embed = await createCustomEmbed(interaction, {
          title: '?? Macroscopic Sector Yield Stats',
          thumbnail: interaction.guild.iconURL({ dynamic: true }),
          description: `### ??? Aggregated Performance Metrics\nMacroscopic overview of the entire workforce capacity and output yields for the **${interaction.guild.name}** sector.`,
          fields: [
            { name: '?? Node Density', value: `\`${users.length}\` Operatives`, inline: true },
            { name: '?? Aggregate Merit', value: `\`${totalPoints.toLocaleString()}\` Points`, inline: true },
            { name: '?? Aggregate Risks', value: `\`${totalWarnings}\` Signals`, inline: true },
            { name: '?? Total Shift Volume', value: `\`${Math.round(totalShiftTime / 60)}h\``, inline: true },
            { name: '?? Mean Yield Consistency', value: `\`${avgConsistency.toFixed(1)}%\``, inline: true },
            { name: '?? Sector Tier', value: '`V5 EXECUTIVE (PLATINUM)`', inline: true }
          ],
          footer: 'Macroscopic Sector Modeling � V5 Executive Suite',
          color: 'enterprise'
        });

        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v5_performance_stats').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
      }
    } catch (error) {
      console.error('Performance Stats Error:', error);
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v5_performance_stats').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed('Yield Intelligence failure: Unable to decode personnel efficiency matrices.')], components: [row] });
    }
  }
};


