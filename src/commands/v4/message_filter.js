const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('message_filter')
    .setDescription('Configure message filter settings')
    .addBooleanOption(option =>
      option.setName('enabled')
        .setDescription('Enable message filter')
        .setRequired(true))
    .addBooleanOption(option =>
      option.setName('bad_words')
        .setDescription('Filter bad words')
        .setRequired(false))
    .addBooleanOption(option =>
      option.setName('caps_filter')
        .setDescription('Filter excessive caps')
        .setRequired(false))
    .addBooleanOption(option =>
      option.setName('spam_filter')
        .setDescription('Filter spam')
        .setRequired(false)),

  async execute(interaction) {
    const enabled = interaction.options.getBoolean('enabled');
    const badWords = interaction.options.getBoolean('bad_words') || false;
    const capsFilter = interaction.options.getBoolean('caps_filter') || false;
    const spamFilter = interaction.options.getBoolean('spam_filter') || false;
    const guildId = interaction.guildId;

    let guild = await Guild.findOne({ guildId });
    if (!guild) {
      guild = new Guild({ guildId, name: interaction.guild.name });
    }

    if (!guild.settings) guild.settings = {};
    guild.settings.messageFilter = {
      enabled,
      badWords,
      capsFilter,
      spamFilter
    };
    await guild.save();

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('💬 Message Filter Settings')
      
      .addFields(
        { name: 'Status', value: enabled ? 'Enabled' : 'Disabled', inline: true },
        { name: 'Bad Words', value: badWords ? 'On' : 'Off', inline: true },
        { name: 'Caps Filter', value: capsFilter ? 'On' : 'Off', inline: true },
        { name: 'Spam Filter', value: spamFilter ? 'On' : 'Off', inline: true }
      )
      ;

    await interaction.reply({ embeds: [embed] });
  }
};
