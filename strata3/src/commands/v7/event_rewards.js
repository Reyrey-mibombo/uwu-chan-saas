const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('event_rewards')
    .setDescription('View active event rewards')
    .addStringOption(opt => opt.setName('status').setDescription('Filter by status').addChoices(
      { name: 'Active', value: 'active' },
      { name: 'Ended', value: 'ended' },
      { name: 'Upcoming', value: 'upcoming' }
    )),
  async execute(interaction, client) {
    const status = interaction.options.getString('status') || 'active';
    const now = new Date();

    const events = await Activity.find({
      guildId: interaction.guild.id,
      type: 'reward',
      'data.isEvent': true
    }).sort({ createdAt: -1 }).limit(10);

    const embed = new EmbedBuilder()
      .setTitle('🎉 Event Rewards')
      .setColor(0xe91e63);

    if (events.length === 0) {
      embed.setDescription('No active events at the moment.\nCheck back later!');
      embed.addFields({ name: 'Status', value: 'No events', inline: true });
    } else {
      const eventList = events.map((e, i) => {
        return `${i + 1}. ${e.data?.eventName || 'Event'} - ${e.data?.points || 0} pts`;
      });
      embed.setDescription(eventList.join('\n'));
      embed.addFields(
        { name: 'Active Events', value: `${events.length}`, inline: true },
        { name: 'Total Rewards Given', value: `${events.reduce((s, e) => s + (e.data?.points || 0), 0)}`, inline: true }
      );
    }

    await interaction.reply({ embeds: [embed] });
  }
};
