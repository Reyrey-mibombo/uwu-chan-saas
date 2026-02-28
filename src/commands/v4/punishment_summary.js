const { SlashCommandBuilder } = require('discord.js');
const { createPremiumEmbed } = require('../../utils/embeds');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('punishment_summary')
    .setDescription('View punishment summary')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Filter by user')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('period')
        .setDescription('Time period')
        .setRequired(false)
        .addChoices(
          { name: 'Today', value: 'today' },
          { name: 'This Week', value: 'week' },
          { name: 'This Month', value: 'month' }
        )),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const period = interaction.options.getString('period') || 'month';
    const guildId = interaction.guildId;

    let startDate = new Date();
    if (period === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    const query = {
      guildId,
      type: 'warning',
      createdAt: { $gte: startDate }
    };

    if (user) {
      query.userId = user.id;
    }

    const punishments = await Activity.find(query)
      .sort({ createdAt: -1 })
      .limit(20);

    const summary = await Activity.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$data.action',
          count: { $sum: 1 }
        }
      }
    ]);

    const stats = { strike: 0, warn: 0, mute: 0, kick: 0, ban: 0 };
    summary.forEach(s => {
      if (stats.hasOwnProperty(s._id)) stats[s._id] = s.count;
    });

    const total = Object.values(stats).reduce((a, b) => a + b, 0);

    const embed = createPremiumEmbed()
      .setTitle(`📊 Punishment Summary${user ? `: ${user.username}` : ''}`)
      
      .addFields(
        { name: 'Total', value: total.toString(), inline: true },
        { name: 'Strikes', value: stats.strike.toString(), inline: true },
        { name: 'Warns', value: stats.warn.toString(), inline: true },
        { name: 'Mutes', value: stats.mute.toString(), inline: true },
        { name: 'Kicks', value: stats.kick.toString(), inline: true },
        { name: 'Bans', value: stats.ban.toString(), inline: true }
      )
      
      ;

    await interaction.reply({ embeds: [embed] });
  }
};



