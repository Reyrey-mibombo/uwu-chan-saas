const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role_efficiency')
    .setDescription('Analyze role-based efficiency')
    .addStringOption(opt => opt.setName('role').setDescription('Filter by role').addChoices(
      { name: 'Admin', value: 'admin' },
      { name: 'Moderator', value: 'moderator' },
      { name: 'Staff', value: 'staff' },
      { name: 'Member', value: 'member' }
    )),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const roleFilter = interaction.options.getString('role');
    
    const query = { 'guilds.guildId': guildId };
    if (roleFilter) {
      query['staff.rank'] = roleFilter;
    } else {
      query['staff.rank'] = { $ne: 'member' };
    }
    
    const users = await User.find(query);
    
    let totalConsistency = 0;
    let totalPoints = 0;
    let totalShiftTime = 0;
    let totalWarnings = 0;
    
    users.forEach(u => {
      if (u.staff) {
        totalConsistency += u.staff.consistency || 0;
        totalPoints += u.staff.points || 0;
        totalShiftTime += u.staff.shiftTime || 0;
        totalWarnings += u.staff.warnings || 0;
      }
    });
    
    const count = users.length || 1;
    const avgConsistency = totalConsistency / count;
    const avgPoints = totalPoints / count;
    const avgShift = totalShiftTime / count;
    
    const efficiency = Math.round(avgConsistency * 0.5 + Math.min(100, avgPoints / 5) * 0.3 + (100 - Math.min(100, totalWarnings / count * 10)) * 0.2);

    const embed = new EmbedBuilder()
      .setTitle('👥 Role Efficiency')
      .setColor(0x1abc9c)
      .addFields(
        { name: 'Efficiency Score', value: `${efficiency}/100`, inline: true },
        { name: 'Users Analyzed', value: count.toString(), inline: true },
        { name: 'Avg Consistency', value: `${avgConsistency.toFixed(1)}%`, inline: true },
        { name: 'Avg Points', value: avgPoints.toFixed(0), inline: true },
        { name: 'Avg Shift Time', value: `${Math.round(avgShift)}h`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
