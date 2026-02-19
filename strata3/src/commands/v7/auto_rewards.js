const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auto_rewards')
    .setDescription('Configure automatic rewards')
    .addBooleanOption(opt => opt.setName('daily').setDescription('Enable daily bonus'))
    .addBooleanOption(opt => opt.setName('weekly').setDescription('Enable weekly bonus'))
    .addBooleanOption(opt => opt.setName('rank').setDescription('Enable rank rewards'))
    .addIntegerOption(opt => opt.setName('bonus_multiplier').setDescription('Bonus multiplier (1-3)')),
  async execute(interaction, client) {
    const daily = interaction.options.getBoolean('daily');
    const weekly = interaction.options.getBoolean('weekly');
    const rank = interaction.options.getBoolean('rank');
    const multiplier = interaction.options.getInteger('bonus_multiplier');

    let guild = await Guild.findOne({ guildId: interaction.guild.id });
    if (!guild) {
      guild = new Guild({ guildId: interaction.guild.id, name: interaction.guild.name });
    }

    guild.settings = guild.settings || {};

    if (daily !== null) guild.settings.autoRewardDaily = daily;
    if (weekly !== null) guild.settings.autoRewardWeekly = weekly;
    if (rank !== null) guild.settings.autoRewardRank = rank;
    if (multiplier) guild.settings.bonusMultiplier = Math.min(3, Math.max(1, multiplier));

    await guild.save();

    const embed = new EmbedBuilder()
      .setTitle('🎁 Auto Rewards Configuration')
      .setColor(0xf1c40f)
      .addFields(
        { name: 'Daily Bonus', value: guild.settings.autoRewardDaily ? '✅ Enabled' : '❌ Disabled', inline: true },
        { name: 'Weekly Bonus', value: guild.settings.autoRewardWeekly ? '✅ Enabled' : '❌ Disabled', inline: true },
        { name: 'Rank Rewards', value: guild.settings.autoRewardRank ? '✅ Enabled' : '❌ Disabled', inline: true },
        { name: 'Bonus Multiplier', value: `${guild.settings.bonusMultiplier || 1}x`, inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  }
};
