const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createPremiumEmbed } = require('../../utils/embeds');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moderation_logs')
    .setDescription('View moderation logs')
    .addIntegerOption(option =>
      option.setName('limit')
        .setDescription('Number of logs to show')
        .setMinValue(5)
        .setMaxValue(50)
        .setRequired(false)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const limit = interaction.options.getInteger('limit') || 10;

    const logs = await Activity.find({ 
      guildId, 
      type: 'warning' 
    })
    .sort({ createdAt: -1 })
    .limit(limit);

    if (logs.length === 0) {
      return interaction.editReply({ content: 'No moderation logs found.', ephemeral: true });
    }

    const formatLog = (log) => {
      const user = `<@${log.userId}>`;
      const mod = `<@${log.data?.moderatorId || 'Unknown'}>`;
      const action = log.data?.action || 'warning';
      const reason = log.data?.reason || 'No reason';
      const time = log.createdAt.toLocaleString();
      return `**${action.toUpperCase()}** | ${user} | ${mod} | ${reason} | ${time}`;
    };

    const embed = createPremiumEmbed()
      .setTitle('?? Moderation Logs')
      
      .setDescription(logs.map(formatLog).join('\n'))
      
      ;

    await const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v4_moderation_logs').setLabel('ðŸ„ Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};




