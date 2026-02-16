const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auto_rewards')
    .setDescription('Configure automatic rewards')
    .addBooleanOption(option =>
      option.setName('enable')
        .setDescription('Enable automatic rewards')
        .setRequired(true)),

  async execute(interaction) {
    const enable = interaction.options.getBoolean('enable');
    const guildId = interaction.guildId;

    let guild = await Guild.findOne({ guildId });
    if (!guild) {
      guild = new Guild({ guildId, name: interaction.guild.name });
    }

    if (!guild.settings) guild.settings = {};
    guild.settings.autoRewards = enable;
    await guild.save();

    const embed = new EmbedBuilder()
      .setTitle('🎁 Auto Rewards')
      .setColor(enable ? 0x2ecc71 : 0xe74c3c)
      .setDescription(`Automatic rewards are now ${enable ? 'enabled' : 'disabled'}`);

    await interaction.reply({ embeds: [embed] });
  }
};
