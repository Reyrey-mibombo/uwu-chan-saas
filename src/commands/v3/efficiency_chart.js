const { SlashCommandBuilder } = require('discord.js');
const { createPremiumEmbed } = require('../../utils/embeds');
const { User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('efficiency_chart')
    .setDescription('View efficiency chart')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to view efficiency for')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('period')
        .setDescription('Time period')
        .setRequired(false)
        .addChoices(
          { name: '7 Days', value: '7' },
          { name: '30 Days', value: '30' },
          { name: '90 Days', value: '90' }
        )),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guildId;
    const period = parseInt(interaction.options.getString('period') || '30');

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - period);

    const activities = await Activity.find({
      guildId,
      userId: targetUser.id,
      createdAt: { $gte: daysAgo }
    }).lean();

    const user = await User.findOne({ userId: targetUser.id });
    const staff = user?.staff || {};

    const commands = activities.filter(a => a.type === 'command').length;
    const warnings = activities.filter(a => a.type === 'warning').length;
    const messages = activities.filter(a => a.type === 'message').length;

    const efficiencyScore = calculateEfficiency(commands, warnings, messages, staff.consistency || 100);

    const embed = createPremiumEmbed()
      .setTitle(`📈 Efficiency Chart - ${targetUser.username}`)
      
      .setThumbnail(targetUser.displayAvatarURL());

    embed.addFields(
      { name: 'Period', value: `${period} Days`, inline: true },
      { name: 'Efficiency Score', value: `${efficiencyScore}%`, inline: true }
    );

    embed.addFields(
      { name: 'Commands', value: commands.toString(), inline: true },
      { name: 'Warnings', value: warnings.toString(), inline: true },
      { name: 'Messages', value: messages.toString(), inline: true }
    );

    embed.addFields(
      { name: 'Consistency', value: `${staff.consistency || 100}%`, inline: true },
      { name: 'Reputation', value: (staff.reputation || 0).toString(), inline: true },
      { name: 'Total Points', value: (staff.points || 0).toString(), inline: true }
    );

    const chart = generateEfficiencyChart(efficiencyScore);
    embed.addFields({ name: 'Efficiency', value: chart, inline: false });

    await interaction.reply({ embeds: [embed] });
  }
};

function calculateEfficiency(commands, warnings, messages, consistency) {
  const positiveActions = commands + messages;
  const totalActions = positiveActions + warnings;
  
  if (totalActions === 0) return 50;
  
  const actionScore = (positiveActions / Math.max(totalActions, 1)) * 70;
  const consistencyScore = (consistency / 100) * 30;
  
  return Math.min(100, Math.max(0, Math.round(actionScore + consistencyScore)));
}

function generateEfficiencyChart(score) {
  const bars = Math.round(score / 10);
  let chart = '';
  for (let i = 0; i < 10; i++) {
    if (i < bars) {
      chart += i < 6 ? '🟢' : i < 8 ? '🟡' : '🔴';
    } else {
      chart += '⬜';
    }
  }
  return chart + ` ${score}%`;
}



