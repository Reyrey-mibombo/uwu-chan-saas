const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promotion_status')
    .setDescription('Check your promotion status')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check')
        .setRequired(false)),

  async execute(interaction, client) {
    const target = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guildId;

    const user = await User.findOne({ userId: target.id });

    if (!user || !user.staff) {
      return interaction.reply({ 
        content: `${target.username} is not on the staff team yet.`,
        ephemeral: true 
      });
    }

    const currentRank = user.staff.rank || 'member';
    const points = user.staff.points || 0;
    const consistency = user.staff.consistency || 100;

    const ranks = {
      'member': { required: 0, next: 'Trial Staff' },
      'trial': { required: 100, next: 'Staff' },
      'staff': { required: 500, next: 'Moderator' },
      'moderator': { required: 1000, next: 'Admin' },
      'admin': { required: 2500, next: 'Owner' }
    };

    const currentReq = ranks[currentRank] || ranks['member'];
    const progress = Math.min(100, Math.round((points / currentReq.required) * 100));
    const progressBar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));

    const embed = new EmbedBuilder()
      .setTitle(`📈 Promotion Status: ${target.username}`)
      .setThumbnail(target.displayAvatarURL())
      .setColor(0x9b59b6)
      .addFields(
        { name: '👤 Current Rank', value: currentRank.charAt(0).toUpperCase() + currentRank.slice(1), inline: true },
        { name: '⭐ Points', value: points.toString(), inline: true },
        { name: '📋 Next Rank', value: currentReq.next, inline: true },
        { name: '🎯 Required Points', value: currentReq.required.toString(), inline: true },
        { name: '⚡ Consistency', value: `${consistency}%`, inline: true },
        { name: '📊 Progress', value: `${progressBar} ${progress}%`, inline: false }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
