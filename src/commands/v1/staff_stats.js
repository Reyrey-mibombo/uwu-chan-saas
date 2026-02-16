const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Shift } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_stats')
    .setDescription('View staff activity statistics')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('Staff member to check')
        .setRequired(false)),

  async execute(interaction, client) {
    const target = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guildId;
    
    const user = await User.findOne({ userId: target.id });
    
    if (!user || !user.staff) {
      return interaction.reply({ 
        content: `${target.username} is not a staff member yet. Start with /shift_start to begin!`,
        ephemeral: true 
      });
    }

    const activeShift = await Shift.findOne({ 
      guildId, 
      userId: target.id, 
      endTime: null 
    });

    const points = user.staff.points || 0;
    const warnings = user.staff.warnings || 0;
    const shiftTime = user.staff.shiftTime || 0;
    const hours = Math.floor(shiftTime / 3600);
    const rank = user.staff.rank || 'member';

    const embed = new EmbedBuilder()
      .setTitle(`📊 Staff Statistics: ${target.username}`)
      .setThumbnail(target.displayAvatarURL())
      .setColor(0x3498db)
      .addFields(
        { name: '⭐ Points', value: points.toString(), inline: true },
        { name: '⚠️ Warnings', value: warnings.toString(), inline: true },
        { name: '👤 Rank', value: rank.charAt(0).toUpperCase() + rank.slice(1), inline: true },
        { name: '⏱️ Total Shift Time', value: `${hours} hours`, inline: true },
        { name: '📡 Status', value: activeShift ? '🟢 On Shift' : '⚪ Off Duty', inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
