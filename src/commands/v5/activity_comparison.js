const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity_comparison')
    .setDescription('Compare activity between two periods')
    .addStringOption(opt => opt.setName('period1').setDescription('First period (e.g., 7d, 30d)').setRequired(true))
    .addStringOption(opt => opt.setName('period2').setDescription('Second period (e.g., 7d, 30d)').setRequired(true)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const period1 = interaction.options.getString('period1');
    const period2 = interaction.options.getString('period2');

    const getDays = (p) => parseInt(p.replace('d', '')) || 7;

    const now = new Date();
    const p1Days = getDays(period1);
    const p2Days = getDays(period2);

    const p1Start = new Date(now - p1Days * 24 * 60 * 60 * 1000);
    const p2Start = new Date(now - p2Days * 24 * 60 * 60 * 1000);
    const p2End = p1Start;

    const [period1Data, period2Data] = await Promise.all([
      Activity.find({ guildId, createdAt: { $gte: p1Start } }),
      Activity.find({ guildId, createdAt: { $gte: p2Start, $lt: p2End } })
    ]);

    const p1Messages = period1Data.filter(a => a.type === 'message').length;
    const p2Messages = period2Data.filter(a => a.type === 'message').length;
    const p1Commands = period1Data.filter(a => a.type === 'command').length;
    const p2Commands = period2Data.filter(a => a.type === 'command').length;
    const p1Users = new Set(period1Data.map(a => a.userId)).size;
    const p2Users = new Set(period2Data.map(a => a.userId)).size;

    const calcChange = (curr, prev) => prev > 0 ? ((curr - prev) / prev * 100).toFixed(1) : (curr > 0 ? 100 : 0);

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('📊 Activity Comparison')
      
      .addFields(
        { name: 'Metric', value: 'Period 1', inline: true },
        { name: period1, value: `${p1Messages} msgs`, inline: true },
        { name: period2, value: `${p2Messages} msgs`, inline: true },
        { name: 'Messages', value: `${calcChange(p1Messages, p2Messages)}%`, inline: true },
        { name: 'Commands', value: `${calcChange(p1Commands, p2Commands)}%`, inline: true },
        { name: 'Active Users', value: `${calcChange(p1Users, p2Users)}%`, inline: true }
      )
      ;

    await interaction.reply({ embeds: [embed] });
  }
};
