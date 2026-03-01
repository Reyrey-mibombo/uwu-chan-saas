const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User, Activity, Shift } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('detailed_profile')
    .setDescription('View an authenticated detailed chronological profile map of a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to view profile for')
        .setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const guildId = interaction.guildId;

      // Sandboxed querying
      const user = await User.findOne({ userId: targetUser.id, guildId }).lean();

      if (!user || !user.staff) {
        return interaction.editReply({ embeds: [createErrorEmbed(`No staff records found for <@${targetUser.id}> in this server.`)] });
      }

      const activities = await Activity.find({ guildId, userId: targetUser.id })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentShifts = await Shift.find({
        guildId,
        userId: targetUser.id,
        startTime: { $gte: thirtyDaysAgo }
      }).lean();

      const totalShifts = recentShifts.length;
      const completedShifts = recentShifts.filter(s => s.endTime).length;
      const totalHours = recentShifts.reduce((acc, s) => acc + (s.duration || 0), 0) / 3600;

      const rank = user.staff.rank || 'member';
      const points = user.staff.points || 0;
      const warnings = user.staff.warnings || 0;
      const consistency = user.staff.consistency || 100;
      const reputation = user.staff.reputation || 0;
      const level = user.staff.level || 1;
      const accomplishments = user.staff.achievements?.length || 0;

      const embed = await createCustomEmbed(interaction, {
        title: `🗂️ Personnel Dossier: ${targetUser.username}`,
        thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
        description: `### 🛡️ Authorized Identity Verification\nMacroscopic identity credentials authenticated locally for sector **${interaction.guild.name}**. Cross-referencing V2 telemetry logs.`,
        fields: [
          { name: '🏆 Operational Rank', value: `\`${rank.toUpperCase()}\``, inline: true },
          { name: '✨ Level Clearance', value: `\`LVL ${level}\``, inline: true },
          { name: '💫 Honor Rating', value: `\`${reputation}\``, inline: true },
          { name: '⭐ Aggregate Points', value: `\`${points.toLocaleString()}\``, inline: true },
          { name: '📈 Consistency', value: `\`${consistency}%\``, inline: true },
          { name: '🏅 Active Merits', value: `\`${accomplishments}\` Records`, inline: true },
          { name: '🔄 30D Patrol Yield', value: `\`${completedShifts}/${totalShifts}\``, inline: true },
          { name: '⏱️ 30D Time Delta', value: `\`${totalHours.toFixed(1)}h\``, inline: true }
        ],
        footer: 'Dossier Access Logged • V3 Strategic Suite',
        color: 'enterprise'
      });

      if (activities.length > 0) {
        const recentActivity = activities.map(a => {
          const date = new Date(a.createdAt).toLocaleDateString();
          return `\`[${date}]\` **${a.type.toUpperCase()}** ➔ Authorized Linkage`;
        });
        embed.addFields({ name: '📜 High-Fidelity Ledger Events', value: recentActivity.join('\n') });
      } else {
        embed.addFields({ name: '📜 High-Fidelity Ledger Events', value: '*No logged footprint exists in the active registry.*' });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Detailed Profile Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Identity Retrieval failure: Unable to decode personnel dossier.')] });
    }
  }
};
