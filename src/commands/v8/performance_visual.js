const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('performance_visual')
    .setDescription('Visual performance breakdown for a staff member')
    .addUserOption(opt => opt.setName('user').setDescription('User to view').setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply();
    const target = interaction.options.getUser('user') || interaction.user;
    const user = await User.findOne({ userId: target.id }).lean();
    const pts = user?.staff?.points || 0;
    const consistency = user?.staff?.consistency || 100;
    const reputation = user?.staff?.reputation || 0;
    const rank = user?.staff?.rank || 'member';

    const score = Math.min(100, Math.round(Math.min(pts, 500) / 500 * 40 + consistency * 0.3 + Math.min(reputation, 50) / 50 * 30));
    const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : score >= 50 ? 'D' : 'F';
    const color = score >= 80 ? 0x2ecc71 : score >= 60 ? 0xf39c12 : 0xe74c3c;

    const bar = (v, max, len = 10) => '▓'.repeat(Math.round(Math.min(v, max) / max * len)) + '░'.repeat(len - Math.round(Math.min(v, max) / max * len));

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle(`📊 Performance Visual — ${target.username}`)
      
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: '📊 Score', value: `**${score}/100** (${grade})`, inline: true },
        { name: '🎖️ Rank', value: rank.toUpperCase(), inline: true },
        { name: '⭐ Points', value: `\`${bar(pts, 500)}\` ${pts}` },
        { name: '📈 Consistency', value: `\`${bar(consistency, 100)}\` ${consistency}%` },
        { name: '🌟 Reputation', value: `\`${bar(reputation, 100)}\` ${reputation}` }
      )
      
      ;
    await interaction.editReply({ embeds: [embed] });
  }
};
