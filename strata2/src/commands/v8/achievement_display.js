const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('achievement_display')
    .setDescription('Display your achievements')
    .addUserOption(opt => opt.setName('user').setDescription('User to view (optional)')),
  async execute(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const user = await User.findOne({ userId: targetUser.id });

    if (!user || !user.achievements || user.achievements.length === 0) {
      return interaction.reply({ 
        content: `No achievements found for ${targetUser.username}.`,
        ephemeral: true 
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(`🏆 Achievements - ${targetUser.username}`)
      .setColor(0xf1c40f)
      .setThumbnail(targetUser.displayAvatarURL());

    const achievementList = user.achievements.map(a => {
      const earned = a.earnedAt ? new Date(a.earnedAt).toLocaleDateString() : 'Unknown';
      return `**${a.name}**: ${a.description || ''} (${earned})`;
    }).join('\n');

    embed.addFields(
      { name: 'Total Achievements', value: `${user.achievements.length}`, inline: true },
      { name: 'Achievements', value: achievementList || 'None', inline: false }
    );

    await interaction.reply({ embeds: [embed] });
  }
};
