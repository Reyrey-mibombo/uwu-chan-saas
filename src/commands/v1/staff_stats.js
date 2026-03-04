const { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/enhancedEmbeds');
const { User, Shift } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_stats')
    .setDescription('View detailed staff statistics with performance metrics')
    .addUserOption(opt => opt.setName('user').setDescription('Personnel to audit (Optional)').setRequired(false)),

  async execute(interaction, client) {
    try {
      await interaction.deferReply();
      const user = interaction.options.getUser('user') || interaction.user;
      const staffSystem = client.systems.staff;

      if (!staffSystem) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v1_staff_stats').setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary));
        return await interaction.editReply({ embeds: [createErrorEmbed('Staff system is currently offline.')], components: [row] });
      }

      const points = await staffSystem.getPoints(user.id, interaction.guildId);
      const warnings = await staffSystem.getUserWarnings(user.id, interaction.guildId);
      const rank = await staffSystem.getRank(user.id, interaction.guildId);
      const score = await staffSystem.calculateStaffScore(user.id, interaction.guildId);

      const shifts = await Shift.find({ userId: user.id, guildId: interaction.guildId }).lean();
      const totalShiftTime = shifts.reduce((acc, s) => acc + (s.duration || 0), 0);
      const hours = Math.floor(totalShiftTime / 3600);
      const minutes = Math.floor((totalShiftTime % 3600) / 60);
      const completedShifts = shifts.filter(s => s.endTime).length;

      const guildUsers = await User.countDocuments({ 'guilds.guildId': interaction.guildId, 'staff.points': { $gt: 0 } });
      const rankPosition = await User.countDocuments({
        'guilds.guildId': interaction.guildId,
        'staff.points': { $gt: points }
      }) + 1;

      const velocity = Math.min(100, Math.round(score || 0));
      const filled = '█'.repeat(Math.round((velocity / 100) * 12));
      const empty = '░'.repeat(12 - filled.length);
      const velocityRibbon = `\`[${filled}${empty}]\` **${velocity}%**`;

      const efficiency = completedShifts > 0 ? (points / completedShifts).toFixed(1) : 0;
      const effFilled = Math.min(10, Math.round(efficiency));
      const efficiencyRibbon = `\`[${'█'.repeat(effFilled)}${'░'.repeat(10 - effFilled)}]\` \`${efficiency}\` pts/shift`;

      const tierColor = points > 1000 ? '🔴' : points > 500 ? '🟡' : '🟢';
      const tierName = points > 1000 ? 'ELITE' : points > 500 ? 'PRO' : points > 100 ? 'REGULAR' : 'NEWCOMER';

      const embed = await createCustomEmbed(interaction, {
        title: `📊 Staff Statistics: ${user.username}`,
        thumbnail: user.displayAvatarURL({ dynamic: true }),
        description: `**Tier:** ${tierColor} \`${tierName}\` | **Position:** #${rankPosition} of ${guildUsers} staff`,
        fields: [
          { name: '⚡ Performance Score', value: velocityRibbon, inline: false },
          { name: '📈 Efficiency', value: efficiencyRibbon, inline: false },
          { name: '💰 Points', value: `\`${points.toLocaleString()}\``, inline: true },
          { name: '⭐ Rank', value: `\`${rank.toUpperCase()}\``, inline: true },
          { name: '🎯 Score', value: `\`${score || 0}/100\``, inline: true },
          { name: '⏱️ Total Time', value: `\`${hours}h ${minutes}m\``, inline: true },
          { name: '⚠️ Warnings', value: `\`${warnings?.total || 0}\``, inline: true },
          { name: '📋 Completed Shifts', value: `\`${completedShifts}\``, inline: true },
          { name: '🔥 Streak', value: `\`${shifts.length > 0 ? 'Active' : 'None'}\``, inline: true }
        ],
        footer: 'uwu-chan • Real-time Staff Analytics',
        color: points > 500 ? 'premium' : 'primary'
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('stats_compare').setLabel('⚖️ Peer Comparison').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('stats_merits').setLabel('🏅 Merit Showcase').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setLabel('🏆 Leaderboard').setStyle(ButtonStyle.Link).setURL(`https://discord.com/channels/${interaction.guildId}`)
      );
      await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (error) {
      console.error('Staff Stats Error:', error);
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v1_staff_stats').setLabel('  Retry').setStyle(ButtonStyle.Secondary));
      await interaction.editReply({ embeds: [createErrorEmbed('Failed to fetch staff statistics.')], components: [row] });
    }
  },

  async handleStatsButtons(interaction, client) {
    const { customId, guildId, user: requester } = interaction;
    const staffSystem = client.systems.staff;
    const targetUserId = interaction.message.embeds[0].title.split(': ').pop();
    // Simplified lookup from current embed title if possible, else use requester

    if (customId === 'stats_compare') {
      await interaction.deferReply({ ephemeral: true });
      const allUsers = await User.find({ 'guilds.guildId': guildId }).lean();
      const staffUsers = allUsers.filter(u => {
        const g = u.guilds.find(guild => guild.guildId === guildId);
        return g && g.staff && g.staff.points > 0;
      });

      const totalPoints = staffUsers.reduce((sum, u) => sum + (u.guilds.find(g => g.guildId === guildId).staff.points || 0), 0);
      const avgPoints = staffUsers.length > 0 ? totalPoints / staffUsers.length : 0;

      const dbUser = await User.findOne({ userId: requester.id });
      const myPoints = dbUser?.guilds?.find(g => g.guildId === guildId)?.staff?.points || 0;
      const variance = myPoints - avgPoints;

      const embed = await createCustomEmbed(interaction, {
        title: '⚖️ Peer Performance Variance',
        description: `Comparison of your performance against **${staffUsers.length}** active staff members.`,
        fields: [
          { name: '📊 Server Average', value: `\`${Math.round(avgPoints)} pts\``, inline: true },
          { name: '✨ Your Standing', value: `\`${myPoints} pts\``, inline: true },
          { name: '📈 Variance', value: `\`${variance > 0 ? '+' : ''}${Math.round(variance)} pts\` (${variance >= 0 ? 'Above' : 'Below'} Global Avg)`, inline: false }
        ],
        color: variance >= 0 ? 'success' : 'warning'
      });
      await interaction.editReply({ embeds: [embed] });
    }
    else if (customId === 'stats_merits') {
      await interaction.deferReply({ ephemeral: true });
      const dbUser = await User.findOne({ userId: requester.id });
      const staffData = dbUser?.guilds?.find(g => g.guildId === guildId)?.staff || {};
      const trophies = staffData.trophies || [];

      const embed = await createCustomEmbed(interaction, {
        title: '🏅 Personnel Merit Showcase',
        description: trophies.length > 0 ? trophies.map(t => `🏆 **${t}**`).join('\n') : 'No official merits recorded for this user yet.',
        color: 'premium'
      });
      await interaction.editReply({ embeds: [embed] });
    }
  }
};

