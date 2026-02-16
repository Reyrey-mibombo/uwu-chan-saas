const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reward_logs')
    .setDescription('View reward history')
    .addIntegerOption(opt => opt.setName('limit').setDescription('Number of logs (max 25)'))
    .addUserOption(opt => opt.setName('user').setDescription('Filter by user')),
  async execute(interaction, client) {
    const limit = Math.min(interaction.options.getInteger('limit') || 10, 25);
    const targetUser = interaction.options.getUser('user');

    const query = {
      guildId: interaction.guild.id,
      type: 'reward'
    };
    if (targetUser) query.userId = targetUser.id;

    const rewards = await Activity.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);

    const embed = new EmbedBuilder()
      .setTitle('🎁 Reward Logs')
      .setColor(0xf1c40f);

    if (rewards.length === 0) {
      embed.setDescription('No rewards found.');
    } else {
      const totalPoints = rewards.reduce((sum, r) => sum + (r.data?.points || 0), 0);
      embed.setDescription(rewards.map(r => 
        `• +${r.data?.points || 0} pts: ${r.data?.description || r.data?.bonusType || 'Reward'} - ${new Date(r.createdAt).toLocaleDateString()}`
      ).join('\n'));
      embed.addFields(
        { name: 'Total Rewards', value: `${rewards.length}`, inline: true },
        { name: 'Total Points', value: `${totalPoints}`, inline: true }
      );
    }

    await interaction.reply({ embeds: [embed] });
  }
};
