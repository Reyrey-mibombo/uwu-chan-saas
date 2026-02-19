const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reward_display')
    .setDescription('Display your rewards')
    .addUserOption(opt => opt.setName('user').setDescription('User to display rewards for')),
  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const rewards = await Activity.find({ 
      userId: target.id, 
      type: 'promotion' 
    }).sort({ createdAt: -1 }).limit(10);

    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle(`Rewards for ${target.tag}`)
      .setDescription(rewards.length ? '' : 'No rewards yet.')
      .setThumbnail(target.displayAvatarURL());

    if (rewards.length) {
      embed.addFields({
        name: 'Recent Rewards',
        value: rewards.map(r => `${r.data?.to || 'Promotion'} - <t:${Math.floor(r.createdAt.getTime()/1000)}:R>`).join('\n')
      });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
