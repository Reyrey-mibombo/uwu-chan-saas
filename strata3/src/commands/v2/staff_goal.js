const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_goal')
    .setDescription('Set or view staff goals')
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
        content: `${target.username} has no staff goals yet.`,
        ephemeral: true 
      });
    }

    const currentPoints = user.staff.points || 0;
    const consistency = user.staff.consistency || 0;

    const weeklyActivity = await Activity.countDocuments({
      guildId,
      userId: target.id,
      type: { $in: ['shift', 'command'] },
      createdAt: { $gte: weekAgo }
    });

    const defaultGoals = [
      { name: 'Weekly Points', current: currentPoints % 500, target: 500, period: 'weekly' },
      { name: 'Consistency', current: consistency, target: 100, period: 'always' },
      { name: 'Weekly Activity', current: weeklyActivity, target: 20, period: 'weekly' }
    ];

    const embed = new EmbedBuilder()
      .setTitle(`🎯 Staff Goals: ${target.username}`)
      .setThumbnail(target.displayAvatarURL())
      .setColor(0x2ecc71);

    defaultGoals.forEach(goal => {
      const progress = Math.min(100, Math.round((goal.current / goal.target) * 100));
      const bar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));
      embed.addFields({
        name: goal.name,
        value: `${bar} ${progress}% (${goal.current}/${goal.target})`,
        inline: false
      });
    });

    embed.setFooter({ text: 'Goals reset weekly • Use /shift_start to earn points!' });
    embed.setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
