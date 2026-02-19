const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('elite_showcase')
    .setDescription('Showcase elite members'),

  async execute(interaction) {
    const guildId = interaction.guildId;

    const topUsers = await User.find({ 'guilds.guildId': guildId, 'staff.points': { $gt: 1000 } })
      .sort({ 'staff.points': -1 })
      .limit(10);

    const embed = new EmbedBuilder()
      .setTitle('👑 Elite Showcase')
      .setColor(0xffd700)
      .setDescription(topUsers.map((u, i) => `${i+1}. <@${u.userId}> - ${u.staff.points} pts`).join('\n') || 'No elite members yet')
      .setFooter({ text: 'Top performers with 1000+ points' });

    await interaction.reply({ embeds: [embed] });
  }
};
