const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reputation')
    .setDescription('Check your reputation score')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check')
        .setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;

    const user = await User.findOne({ userId: target.id });
    
    if (!user || !user.staff) {
      return interaction.reply({ 
        content: `${target.username} has no reputation yet.`,
        ephemeral: true 
      });
    }

    const reputation = user.staff.reputation || 0;
    const rank = reputation >= 1000 ? 'Legendary' :
                 reputation >= 500 ? 'Trusted' :
                 reputation >= 100 ? 'Known' : 'New';

    const embed = new EmbedBuilder()
      .setTitle(`⭐ Reputation: ${target.username}`)
      .setThumbnail(target.displayAvatarURL())
      .setColor(0xf1c40f)
      .addFields(
        { name: 'Score', value: reputation.toString(), inline: true },
        { name: 'Rank', value: rank, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
