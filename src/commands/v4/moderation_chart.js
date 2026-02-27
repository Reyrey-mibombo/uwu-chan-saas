const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moderation_chart')
    .setDescription('View moderation statistics chart')
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
    const period = interaction.options.getString('period') || 'week';
    const guildId = interaction.guildId;

    let startDate = new Date();
    if (period === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    const actions = await Activity.aggregate([
      {
        $match: {
          guildId,
          type: { $in: ['warning', 'command'] },
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$data.action',
          count: { $sum: 1 }
        }
      }
    ]);

    if (actions.length === 0) {
      return interaction.reply({ content: 'No moderation data found for this period.', ephemeral: true });
    }

    const stats = {
      warn: 0,
      ban: 0,
      kick: 0,
      mute: 0,
      strike: 0
    };

    actions.forEach(a => {
      const key = a._id || 'other';
      if (stats.hasOwnProperty(key)) {
        stats[key] = a.count;
      }
    });

    const total = Object.values(stats).reduce((a, b) => a + b, 0);

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('📊 Moderation Statistics')
      
      .addFields(
        { name: 'Warnings', value: stats.warn.toString(), inline: true },
        { name: 'Bans', value: stats.ban.toString(), inline: true },
        { name: 'Kicks', value: stats.kick.toString(), inline: true },
        { name: 'Mutes', value: stats.mute.toString(), inline: true },
        { name: 'Strikes', value: stats.strike.toString(), inline: true },
        { name: 'Total', value: total.toString(), inline: true }
      )
      
      ;

    await interaction.reply({ embeds: [embed] });
  }
};
