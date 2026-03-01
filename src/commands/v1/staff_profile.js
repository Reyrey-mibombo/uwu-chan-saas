const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCoolEmbed, createErrorEmbed, createCustomEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_profile')
    .setDescription('View staff member profile and export tools')
    .addUserOption(opt => opt.setName('user').setDescription('The staff member').setRequired(false)),

  async execute(interaction, client) {
    try {
      await interaction.deferReply();
      const user = interaction.options.getUser('user') || interaction.user;
      const member = interaction.guild.members.cache.get(user.id) || await interaction.guild.members.fetch(user.id).catch(() => null);
      const staffSystem = client.systems.staff;

      if (!staffSystem) {
        return interaction.editReply({ embeds: [createErrorEmbed('Staff system is currently offline.')] });
      }

      const points = await staffSystem.getPoints(user.id, interaction.guildId);
      const rank = await staffSystem.getRank(user.id, interaction.guildId);
      const score = await staffSystem.calculateStaffScore(user.id, interaction.guildId);
      const warnings = await staffSystem.getUserWarnings(user.id, interaction.guildId);

      const { User } = require('../../database/mongo');
      const { createRadarChart } = require('../../utils/charts');

      const dbUser = await User.findOne({ userId: user.id, 'guilds.guildId': interaction.guildId }) || {};
      const xp = dbUser.stats?.xp || 0;
      const level = dbUser.stats?.level || 1;

      const xpPercent = Math.min(100, Math.floor((xp / 1000) * 100));
      const barLength = 15;
      const filled = '█'.repeat(Math.round((xpPercent / 100) * barLength));
      const empty = '░'.repeat(barLength - filled.length);
      const resonanceRibbon = `\`[${filled}${empty}]\` **LVL ${level}**`;

      const meritDensity = (points / Math.max(1, level)).toFixed(1);

      const trophies = dbUser.staff?.trophies || [];
      const trophyDisplay = trophies.length > 0 ? trophies.map(t => `🏆 ${t}`).join('\n') : 'No Trophies Yet';

      const warningPenalty = Math.max(0, 100 - ((warnings?.total || 0) * 20));
      const activityScore = Math.min(100, points > 0 ? (points / 50) * 100 : 0);
      const xpScore = Math.min(100, (level / 10) * 100);

      const chartUrl = createRadarChart(
        ['Overall Score', 'Shift Activity', 'Behavior', 'Engagement'],
        [score || 0, activityScore, warningPenalty, xpScore],
        'Staff Skills'
      );

      const embed = await createCustomEmbed(interaction, {
        title: `👤 Zenith Hyper-Apex: Staff Dossier`,
        thumbnail: user.displayAvatarURL({ dynamic: true }),
        image: chartUrl,
        description: `### 🛡️ Macroscopic Personnel Registry\nAuthenticated signal dossier for **${user.username}**. Resonance synchronization active.\n\n**💎 ZENITH HYPER-APEX EXCLUSIVE**`,
        fields: [
          { name: '📛 Identity', value: `**Tag:** ${user.tag}\n**Nick:** ${member?.nickname || 'None'}`, inline: true },
          { name: '✨ Resonance Ribbon', value: resonanceRibbon, inline: false },
          { name: '🏆 Authority', value: `Rank: \`${rank.toUpperCase()}\` (${points} pts)`, inline: true },
          { name: '📊 Merit Density', value: `\`${meritDensity}\` yield/lvl`, inline: true },
          { name: '📉 Risk Rating', value: `\`${warnings?.total || 0}\` alerts`, inline: true },
          { name: '🎖️ Achievements', value: trophyDisplay || 'None', inline: false },
          { name: '🔄 Omni-Bridge', value: '`SYNCHRONIZED`', inline: true }
        ],
        footer: 'Blockchain-verified Operational Identity • V1 Foundation Hyper-Apex',
        color: 'premium'
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`export_stats_${user.id}`)
          .setLabel('📥 Export System Record')
          .setStyle(ButtonStyle.Secondary)
      );

      await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (error) {
      console.error(error);
      const errEmbed = createErrorEmbed('An error occurred while fetching the staff profile.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  },

  async handleExportStats(interaction, client) {
    try {
      await interaction.deferReply({ ephemeral: true });
      const requestedUserId = interaction.customId.replace('export_stats_', '');

      if (interaction.user.id !== requestedUserId && !interaction.member.permissions.has('ModerateMembers') && !interaction.member.permissions.has('ManageGuild')) {
        return interaction.editReply({ content: '❌ You don\'t have permission to export this user\'s stats.' });
      }

      const staffSystem = client.systems.staff;
      const points = await staffSystem.getPoints(requestedUserId, interaction.guildId);
      const warnings = await staffSystem.getUserWarnings(requestedUserId, interaction.guildId);

      const { Shift } = require('../../database/mongo');
      const shifts = await Shift.find({ userId: requestedUserId, guildId: interaction.guildId }).lean();

      let csvContent = `Data Export for User: ${requestedUserId}\n\n[OVERVIEW]\nPoints,${points}\nWarnings,${warnings?.total || 0}\n\n[SHIFTS]\nStart Time,End Time,Duration (Seconds)\n`;

      shifts.forEach(s => {
        csvContent += `${s.startTime || 'Unknown'},${s.endTime || 'Ongoing'},${s.duration || 0}\n`;
      });

      const buffer = Buffer.from(csvContent, 'utf-8');
      const { AttachmentBuilder } = require('discord.js');
      const attachment = new AttachmentBuilder(buffer, { name: `staff_export_${requestedUserId}.csv` });

      await interaction.editReply({ content: '📥 System Record Dump:', files: [attachment] });
    } catch (error) {
      console.error('Error handling export:', error);
      await interaction.editReply({ content: '❌ An error occurred exporting the CSV.' });
    }
  }
};
