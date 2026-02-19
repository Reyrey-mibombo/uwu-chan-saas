const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Shift, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shift_end')
    .setDescription('End your staff shift'),

  async execute(interaction, client) {
    const userId = interaction.user.id;
    const guildId = interaction.guildId;

    const activeShift = await Shift.findOne({ 
      guildId, 
      userId, 
      endTime: null 
    }).sort({ startTime: -1 });

    if (!activeShift) {
      return interaction.reply({ 
        content: 'You don\'t have an active shift! Use /shift_start to begin.',
        ephemeral: true 
      });
    }

    activeShift.endTime = new Date();
    activeShift.duration = (activeShift.endTime - activeShift.startTime) / 1000;
    await activeShift.save();

    const user = await User.findOne({ userId });
    if (user) {
      if (!user.staff) user.staff = {};
      user.staff.shiftTime = (user.staff.shiftTime || 0) + activeShift.duration;
      user.staff.lastShift = new Date();
      
      const hoursWorked = activeShift.duration / 3600;
      const pointsEarned = Math.floor(hoursWorked * 10);
      user.staff.points = (user.staff.points || 0) + pointsEarned;
      
      await user.save();
    }

    const hours = Math.floor(activeShift.duration / 3600);
    const minutes = Math.floor((activeShift.duration % 3600) / 60);

    const embed = new EmbedBuilder()
      .setTitle('🔴 Shift Ended')
      .setColor(0xe74c3c)
      .setDescription('Great work! Your shift has been logged.')
      .addFields(
        { name: '⏱️ Duration', value: `${hours}h ${minutes}m`, inline: true },
        { name: '⭐ Points Earned', value: `+${pointsEarned || 10} points`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    const staffChannel = interaction.guild.channels.cache.find(c => 
      c.name.includes('staff') || c.name.includes('duty')
    );
    if (staffChannel) {
      await staffChannel.send(`📢 ${interaction.user} has ended their shift! (${hours}h ${minutes}m)`);
    }
  }
};
