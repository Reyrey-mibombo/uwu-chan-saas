const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

const AVAILABLE_ACHIEVEMENTS = [
  { name: '🔥 First Shift', desc: 'Complete your first shift', req: 'Complete 1 shift' },
  { name: '⭐ Point Collector', desc: 'Earn 100 points', req: '100 points' },
  { name: '💎 Elite Member', desc: 'Earn 500 points', req: '500 points' },
  { name: '🎯 Consistent', desc: 'Maintain 95%+ consistency for 30 days', req: '95% consistency' },
  { name: '🏆 Top Performer', desc: 'Reach #1 on the leaderboard', req: 'Rank #1' },
  { name: '⚡ Power User', desc: 'Use 500 commands', req: '500 commands' }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('achievement_rewards')
    .setDescription('View available achievements and your current progress')
    .addUserOption(opt => opt.setName('user').setDescription('Check another user\'s achievements').setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply();
    const target = interaction.options.getUser('user') || interaction.user;
    const user = await User.findOne({ userId: target.id }).lean();
    const earned = user?.staff?.achievements || [];
    const points = user?.staff?.points || 0;
    const consistency = user?.staff?.consistency || 100;

    const fields = AVAILABLE_ACHIEVEMENTS.map(a => ({
      name: earned.includes(a.name) ? `✅ ${a.name}` : `🔒 ${a.name}`,
      value: `${a.desc}\n*Requirement: ${a.req}*`,
      inline: true
    }));

    const embed = new EmbedBuilder()
      .setTitle(`🏅 Achievement Rewards — ${target.username}`)
      .setColor(0xf1c40f)
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: '🎖️ Earned', value: `${earned.length}/${AVAILABLE_ACHIEVEMENTS.length}`, inline: true },
        { name: '⭐ Points', value: points.toString(), inline: true },
        { name: '📊 Consistency', value: `${consistency}%`, inline: true },
        ...fields
      )
      .setFooter({ text: `${interaction.guild.name} • Achievement System` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
