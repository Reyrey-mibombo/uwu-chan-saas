const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Activity, Shift } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_score')
    .setDescription('View staff performance score')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check')
        .setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guildId;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const user = await User.findOne({ userId: target.id });

    if (!user || !user.staff) {
      return interaction.reply({ 
        content: `${target.username} has no staff score yet.`,
        ephemeral: true 
      });
    }

    const points = user.staff.points || 0;
    const consistency = user.staff.consistency || 0;
    const reputation = user.staff.reputation || 0;
    const shiftTime = user.staff.shiftTime || 0;

    const weeklyShifts = await Shift.countDocuments({
      guildId,
      userId: target.id,
      startTime: { $gte: weekAgo }
    });

    const weeklyCommands = await Activity.countDocuments({
      guildId,
      userId: target.id,
      type: 'command',
      createdAt: { $gte: weekAgo }
    });

    const score = Math.round(
      (Math.min(points / 100, 30)) +
      (consistency * 0.3) +
      (Math.min(reputation / 50, 20)) +
      (Math.min(weeklyShifts * 2, 10)) +
      (Math.min(weeklyCommands * 0.5, 10))
    );

    const maxScore = 100;
    const grade = score >= 90 ? 'A+' :
                  score >= 80 ? 'A' :
                  score >= 70 ? 'B' :
                  score >= 60 ? 'C' :
                  score >= 50 ? 'D' : 'F';

    const color = score >= 80 ? 0x2ecc71 : score >= 60 ? 0xf39c12 : 0xe74c3c;

    const embed = new EmbedBuilder()
      .setTitle(`📊 Staff Score: ${target.username}`)
      .setThumbnail(target.displayAvatarURL())
      .setColor(color)
      .addFields(
        { name: 'Score', value: `${score}/${maxScore} (${grade})`, inline: true },
        { name: 'Points', value: points.toString(), inline: true },
        { name: 'Consistency', value: `${consistency}%`, inline: true },
        { name: 'Reputation', value: reputation.toString(), inline: true },
        { name: 'Shifts (7d)', value: weeklyShifts.toString(), inline: true },
        { name: 'Commands (7d)', value: weeklyCommands.toString(), inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
