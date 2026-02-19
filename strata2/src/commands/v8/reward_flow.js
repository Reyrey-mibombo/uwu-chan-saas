const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reward_flow')
    .setDescription('View reward activity flow')
    .addStringOption(opt => opt.setName('type').setDescription('Filter by type')
      .addChoices({ name: 'All', value: 'all' }, { name: 'Promotions', value: 'promotion' }, { name: 'Commands', value: 'command' })),
  async execute(interaction) {
    const filterType = interaction.options.getString('type') || 'all';
    const query = { guildId: interaction.guildId };
    if (filterType !== 'all') query.type = filterType;

    const activities = await Activity.find(query).sort({ createdAt: -1 }).limit(20);

    const embed = new EmbedBuilder()
      .setColor(0x00CED1)
      .setTitle('Reward Flow')
      .setDescription(activities.length ? '' : 'No activity found.')
      .setTimestamp();

    if (activities.length) {
      embed.addFields({
        name: 'Recent Activity',
        value: activities.map(a => `**${a.type}** - <t:${Math.floor(a.createdAt.getTime()/1000)}:R>`).join('\n')
      });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
