const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank_display')
    .setDescription('Display your current rank and progress')
    .addUserOption(opt => opt.setName('user').setDescription('User to display rank for')),
  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const user = await User.findOne({ userId: target.id });
    
    if (!user || !user.staff) {
      return interaction.reply({ content: `${target.tag} has no rank data yet.`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`Rank: ${user.staff.rank}`)
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: 'Points', value: `${user.staff.points}`, inline: true },
        { name: 'Reputation', value: `${user.staff.reputation}`, inline: true },
        { name: 'Consistency', value: `${user.staff.consistency}%`, inline: true },
        { name: 'Shift Time', value: `${user.staff.shiftTime} hours`, inline: true },
        { name: 'Warnings', value: `${user.staff.warnings}`, inline: true },
        { name: 'Achievements', value: `${user.staff.achievements?.length || 0}`, inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  }
};
