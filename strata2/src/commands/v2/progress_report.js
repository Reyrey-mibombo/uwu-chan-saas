const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('progress_report')
    .setDescription('View progress report')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check')
        .setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guildId;
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const user = await User.findOne({ userId: target.id });

    if (!user || !user.staff) {
      return interaction.reply({ 
        content: `${target.username} has no staff progress yet.`,
        ephemeral: true 
      });
    }

    const activities = await Activity.find({
      guildId,
      userId: target.id,
      createdAt: { $gte: monthAgo }
    });

    const messages = activities.filter(a => a.type === 'message').length;
    const commands = activities.filter(a => a.type === 'command').length;
    const shifts = activities.filter(a => a.type === 'shift').length;

    const currentPoints = user.staff.points || 0;
    const shiftTime = user.staff.shiftTime || 0;
    const consistency = user.staff.consistency || 0;
    const reputation = user.staff.reputation || 0;

    const embed = new EmbedBuilder()
      .setTitle(`📈 Progress Report: ${target.username}`)
      .setThumbnail(target.displayAvatarURL())
      .setColor(0x3498db)
      .addFields(
        { name: '⭐ Points', value: currentPoints.toString(), inline: true },
        { name: '⏱️ Shift Time (hrs)', value: Math.round(shiftTime / 60).toString(), inline: true },
        { name: '⚡ Consistency', value: `${consistency}%`, inline: true },
        { name: '⭐ Reputation', value: reputation.toString(), inline: true },
        { name: '💬 Messages (30d)', value: messages.toString(), inline: true },
        { name: '⚡ Commands (30d)', value: commands.toString(), inline: true },
        { name: '⏱️ Shifts (30d)', value: shifts.toString(), inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
