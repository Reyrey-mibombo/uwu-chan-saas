const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auto_rewards')
    .setDescription('Configure automatic rewards'),
  async execute(interaction, client) {
    const embed = new EmbedBuilder()
      .setTitle('🎁 Auto Rewards')
      .setColor(0xf1c40f)
      .setDescription('Configure automatic reward distribution')
      .addFields(
        { name: 'Daily Bonus', value: 'Enabled', inline: true },
        { name: 'Weekly Bonus', value: 'Enabled', inline: true },
        { name: 'Rank Rewards', value: 'Enabled', inline: true }
      );
    await interaction.reply({ embeds: [embed] });
  }
};
