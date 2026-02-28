const { SlashCommandBuilder } = require('discord.js');
const { createPremiumEmbed } = require('../../utils/embeds');
const { User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity_report')
    .setDescription('[Analytics] Generate activity report'),

  async execute(interaction, client) {
    await interaction.deferReply();

    const activities = await Activity.find({ guildId: interaction.guildId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const typeCount = {};
    activities.forEach(a => {
      typeCount[a.type] = (typeCount[a.type] || 0) + 1;
    });

    const list = Object.entries(typeCount)
      .map(([type, count]) => `**${type}**: ${count}`)
      .join('\n');

    const embed = createPremiumEmbed()
      .setTitle('📈 Activity Report')
      .setDescription(list || 'No activity data')
      
      ;

    await interaction.editReply({ embeds: [embed] });
  }
};



