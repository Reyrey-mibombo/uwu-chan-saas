const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('apply_stats')
    .setDescription('View application statistics')
    .addStringOption(opt => 
      opt.setName('type')
        .setDescription('Filter by type')
        .setRequired(false)
        .addChoices(
          { name: '👮 Staff', value: 'staff' },
          { name: '🌟 Helper', value: 'helper' },
          { name: '📊 All', value: 'all' }
        )),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const type = interaction.options.getString('type') || 'all';
    const users = await User.find({ 'applications.guildId': interaction.guildId });
    
    let total = 0, pending = 0, accepted = 0, denied = 0;
    let staffCount = 0, helperCount = 0;
    
    users.forEach(user => {
      user.applications.filter(app => app.guildId === interaction.guildId).forEach(app => {
        if (type !== 'all' && app.type !== type) return;
        
        total++;
        if (app.type === 'staff') staffCount++;
        if (app.type === 'helper') helperCount++;
        if (app.status === 'pending') pending++;
        if (app.status === 'accepted') accepted++;
        if (app.status === 'denied') denied++;
      });
    });
    
    const embed = new EmbedBuilder()
      .setTitle(`📊 ${type === 'all' ? 'All' : type.toUpperCase()} Application Statistics`)
      .addFields(
        { name: '📝 Total', value: total.toString(), inline: true },
        { name: '⏳ Pending', value: pending.toString(), inline: true },
        { name: '✅ Accepted', value: accepted.toString(), inline: true },
        { name: '❌ Denied', value: denied.toString(), inline: true },
        { name: '📈 Rate', value: total > 0 ? Math.round((accepted/total)*100) + '%' : '0%', inline: true }
      )
      .setColor(0x5865f2)
      .setTimestamp();
    
    if (type === 'all') {
      embed.addFields(
        { name: '👮 Staff Apps', value: staffCount.toString(), inline: true },
        { name: '🌟 Helper Apps', value: helperCount.toString(), inline: true }
      );
    }
      
    await interaction.editReply({ embeds: [embed] });
  }
};