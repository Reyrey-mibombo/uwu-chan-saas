const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bonus_tracker')
    .setDescription('Visual bonus points tracker for a staff member')
    .addUserOption(opt => opt.setName('user').setDescription('User to track').setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply();
    const target = interaction.options.getUser('user') || interaction.user;
    const user = await User.findOne({ userId: target.id }).lean();
    const points = user?.staff?.points || 0;
    const TIERS = [50, 150, 300, 500, 1000];

    const nextTier = TIERS.find(t => points < t) || TIERS[TIERS.length - 1];
    const prevTier = TIERS.filter(t => points >= t).pop() || 0;
    const progress = Math.min(100, Math.round(((points - prevTier) / (nextTier - prevTier)) * 100));
    const bar = '▓'.repeat(Math.round(progress / 10)) + '░'.repeat(10 - Math.round(progress / 10));

    const tiersDisplay = TIERS.map(t => `${points >= t ? '✅' : '🔒'} **${t} pts**`).join('  →  ');

    const embed = new EmbedBuilder()
      .setTitle(`🎯 Bonus Tracker — ${target.username}`)
      .setColor(0xf39c12)
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: '⭐ Current Points', value: points.toString(), inline: true },
        { name: '🎯 Next Tier', value: points >= 1000 ? '👑 MAX' : nextTier.toString(), inline: true },
        { name: '📊 Progress', value: `\`${bar}\` **${progress}%**` },
        { name: '🏆 Tier Progress', value: tiersDisplay }
      )
      .setFooter({ text: `${interaction.guild.name} • Bonus Tracker` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
