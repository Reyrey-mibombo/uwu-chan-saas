const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank_predict')
    .setDescription('Predict rank progression')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check')
        .setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guildId;

    const user = await User.findOne({ userId: target.id });

    if (!user || !user.staff) {
      return interaction.reply({ 
        content: `${target.username} is not on the staff team yet.`,
        ephemeral: true 
      });
    }

    const currentRank = (user.staff.rank || 'member').toLowerCase();
    const points = user.staff.points || 0;
    const consistency = user.staff.consistency || 0;

    const ranks = [
      { name: 'member', points: 0, label: 'Member' },
      { name: 'trial', points: 100, label: 'Trial Staff' },
      { name: 'staff', points: 500, label: 'Staff' },
      { name: 'moderator', points: 1000, label: 'Moderator' },
      { name: 'admin', points: 2500, label: 'Admin' },
      { name: 'owner', points: 5000, label: 'Owner' }
    ];

    const currentIndex = ranks.findIndex(r => r.name === currentRank);
    const remainingRanks = ranks.slice(currentIndex + 1);

    if (remainingRanks.length === 0) {
      return interaction.reply({ 
        content: `${target.username} is already at the highest rank!`,
        ephemeral: true 
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(`📊 Rank Prediction: ${target.username}`)
      .setThumbnail(target.displayAvatarURL())
      .setColor(0x3498db)
      .addFields(
        { name: 'Current Rank', value: ranks[currentIndex].label, inline: true },
        { name: 'Current Points', value: points.toString(), inline: true },
        { name: 'Consistency', value: `${consistency}%`, inline: true }
      );

    const rankProgress = remainingRanks.map(r => {
      const pointsNeeded = r.points - points;
      const percent = pointsNeeded > 0 ? Math.min(100, Math.round((points / r.points) * 100)) : 100;
      return `• ${r.label}: ${pointsNeeded > 0 ? `${pointsNeeded} pts needed` : '✓ Achieved'} (${percent}%)`;
    });

    embed.addFields({ name: 'Rank Progression', value: rankProgress.join('\n'), inline: false });
    embed.setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
