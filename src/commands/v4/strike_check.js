const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('strike_check')
    .setDescription('Check user strikes')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check')
        .setRequired(true)),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const guildId = interaction.guildId;

    const strikes = await Activity.find({
      guildId,
      userId: target.id,
      'data.action': 'strike'
    }).sort({ createdAt: -1 });

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle(`⚡ Strike Check: ${target.username}`)
      
      .addFields(
        { name: 'Total Strikes', value: strikes.length.toString(), inline: true }
      );

    if (strikes.length > 0) {
      const recent = strikes.slice(0, 5).map((s, i) => 
        `${i+1}. ${s.data?.reason || 'No reason'} - ${s.createdAt.toLocaleDateString()}`
      ).join('\n');
      embed.addFields({ name: 'Recent Strikes', value: recent, inline: false });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
