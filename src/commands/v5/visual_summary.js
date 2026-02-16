const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('visual_summary')
    .setDescription('View visual summary')
    .addIntegerOption(opt => opt.setName('days').setDescription('Number of days').setRequired(false)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const days = interaction.options.getInteger('days') || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [activities, users] = await Promise.all([
      Activity.find({ guildId, createdAt: { $gte: startDate } }),
      User.countDocuments({ 'guilds.guildId': guildId })
    ]);

    const typeData = { message: 0, command: 0, shift: 0, warning: 0, promotion: 0 };
    activities.forEach(a => {
      if (typeData[a.type] !== undefined) typeData[a.type]++;
    });

    const total = activities.length;
    const maxType = Object.entries(typeData).sort((a, b) => b[1] - a[1])[0];

    const bars = Object.entries(typeData).map(([type, count]) => {
      const pct = total > 0 ? (count / total * 100).toFixed(1) : 0;
      const barLen = Math.min(15, Math.floor((count / (maxType[1] || 1)) * 15));
      const bar = '█'.repeat(barLen) + '░'.repeat(15 - barLen);
      return `${type}: ${bar} ${pct}%`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setTitle('📊 Visual Summary')
      .setColor(0x8e44ad)
      .setDescription(bars)
      .addFields(
        { name: 'Total Activities', value: total.toString(), inline: true },
        { name: 'Tracked Users', value: users.toString(), inline: true },
        { name: 'Period', value: `${days} days`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
