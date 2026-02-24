const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_highlight')
    .setDescription('Highlight a staff member as top performer')
    .addUserOption(opt => opt.setName('user').setDescription('Staff to highlight').setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply();
    let target = interaction.options.getUser('user');
    let user;
    if (!target) {
      user = await User.findOne({ 'staff.points': { $gt: 0 } }).sort({ 'staff.points': -1 }).lean();
      if (!user) return interaction.editReply('📊 No staff data found yet.');
      target = await interaction.client.users.fetch(user.userId).catch(() => null);
      if (!target) return interaction.editReply('📊 Could not resolve top staff user.');
    } else {
      user = await User.findOne({ userId: target.id }).lean();
    }
    const pts = user?.staff?.points || 0;
    const rank = user?.staff?.rank || 'member';
    const consistency = user?.staff?.consistency || 100;
    const achievements = user?.staff?.achievements || [];
    const embed = new EmbedBuilder()
      .setTitle('⭐ Staff Highlight of the Week!')
      .setColor(0xf1c40f)
      .setThumbnail(target.displayAvatarURL({ size: 256 }))
      .setDescription(`🎉 Congratulations to **${target.username}** for this week's outstanding performance!`)
      .addFields(
        { name: '🎖️ Rank', value: rank.toUpperCase(), inline: true },
        { name: '⭐ Points', value: pts.toString(), inline: true },
        { name: '📈 Consistency', value: `${consistency}%`, inline: true },
        { name: '🏅 Achievements', value: achievements.length ? achievements.slice(0, 3).join(', ') : 'Working on it!' }
      )
      .setFooter({ text: `${interaction.guild.name} • Staff Spotlight` })
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  }
};
