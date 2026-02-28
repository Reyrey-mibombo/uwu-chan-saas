const { SlashCommandBuilder } = require('discord.js');
const { createPremiumEmbed } = require('../../utils/embeds');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('report_check')
    .setDescription('Check reports status')
    .addStringOption(option =>
      option.setName('status')
        .setDescription('Filter by status')
        .setRequired(false)
        .addChoices(
          { name: 'Pending', value: 'pending' },
          { name: 'Resolved', value: 'resolved' },
          { name: 'Rejected', value: 'rejected' }
        ))
    .addIntegerOption(option =>
      option.setName('limit')
        .setDescription('Number of reports')
        .setMinValue(5)
        .setMaxValue(25)
        .setRequired(false)),

  async execute(interaction) {
    const status = interaction.options.getString('status') || 'pending';
    const limit = interaction.options.getInteger('limit') || 10;
    const guildId = interaction.guildId;

    const reports = await Activity.find({
      guildId,
      'data.action': 'mod_report',
      'data.status': status
    })
      .sort({ createdAt: -1 })
      .limit(limit);

    if (reports.length === 0) {
      return interaction.reply({ content: `No ${status} reports found.`, ephemeral: true });
    }

    const formatReport = (r) => {
      const user = `<@${r.userId}>`;
      const reporter = r.data?.reportedBy ? `<@${r.data.reportedBy}>` : 'Unknown';
      const reason = r.data?.reason || 'No reason';
      const time = r.createdAt.toLocaleString();
      return `**${user}** reported by ${reporter}\n📋 ${reason}\n🕐 ${time}`;
    };

    const embed = createPremiumEmbed()
      .setTitle(`📨 Reports (${status})`)
      
      .setDescription(reports.map(formatReport).join('\n\n'))
      
      ;

    await interaction.reply({ embeds: [embed] });
  }
};



