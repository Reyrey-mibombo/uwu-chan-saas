const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('season_rewards')
    .setDescription('View your season rewards')
    .addUserOption(opt => opt.setName('user').setDescription('User to check rewards for')),
  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const user = await User.findOne({ userId: target.id });

    if (!user) {
      return interaction.reply({ content: 'User not found.', ephemeral: true });
    }

    const promotions = await Activity.countDocuments({
      userId: target.id,
      type: 'promotion',
      createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
    });

    const tier = promotions >= 10 ? 'Diamond' : promotions >= 5 ? 'Gold' : promotions >= 2 ? 'Silver' : 'Bronze';
    const rewards = { Diamond: 5000, Gold: 2500, Silver: 1000, Bronze: 500 };

    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle(`Season Rewards - ${target.tag}`)
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: 'Tier', value: tier, inline: true },
        { name: 'Promotions (90d)', value: `${promotions}`, inline: true },
        { name: 'Points Earned', value: `${rewards[tier]}`, inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  }
};
