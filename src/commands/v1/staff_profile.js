const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Shift, Warning } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_profile')
    .setDescription('View detailed staff profile')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('Staff member')
        .setRequired(false)),

  async execute(interaction, client) {
    const target = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guildId;

    const user = await User.findOne({ userId: target.id });

    if (!user || !user.staff) {
      return interaction.reply({ 
        content: `${target.username} is not a staff member. Use /shift_start to begin!`,
        ephemeral: true 
      });
    }

    const points = user.staff.points || 0;
    const warnings = user.staff.warnings || 0;
    const shiftTime = user.staff.shiftTime || 0;
    const rank = user.staff.rank || 'member';
    const consistency = user.staff.consistency || 100;
    const reputation = user.staff.reputation || 0;

    const hours = Math.floor(shiftTime / 3600);
    
    const totalShifts = await Shift.countDocuments({ guildId, userId: target.id, endTime: { $ne: null } });
    const userWarnings = await Warning.find({ guildId, userId: target.id }).sort({ createdAt: -1 }).limit(5);

    const rankEmoji = {
      'member': '🆕',
      'trial': '⭐',
      'staff': '🔰',
      'moderator': '🛡️',
      'admin': '⚡',
      'owner': '👑'
    };

    const embed = new EmbedBuilder()
      .setTitle(`${rankEmoji[rank] || ''} Staff Profile: ${target.username}`)
      .setThumbnail(target.displayAvatarURL())
      .setColor(0x9b59b6)
      .addFields(
        { name: '🏆 Rank', value: rank.charAt(0).toUpperCase() + rank.slice(1), inline: true },
        { name: '⭐ Points', value: points.toString(), inline: true },
        { name: '⚠️ Warnings', value: warnings.toString(), inline: true },
        { name: '⏱️ Total Hours', value: `${hours} hours`, inline: true },
        { name: '🔄 Total Shifts', value: totalShifts.toString(), inline: true },
        { name: '⚡ Consistency', value: `${consistency}%`, inline: true },
        { name: '💫 Reputation', value: reputation.toString(), inline: true }
      );

    if (userWarnings.length > 0) {
      const warningList = userWarnings.map(w => `• ${w.reason} (${w.severity})`).join('\n');
      embed.addFields({ name: '📝 Recent Warnings', value: warningList, inline: false });
    }

    embed.setFooter({ text: '💎 Premium users get detailed analytics and historical data!' })
         .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
