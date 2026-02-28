const { SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed } = require('../../utils/embeds');
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

    const rate = total > 0 ? Math.round((accepted / total) * 100) : 0;

    // Create a progress bar: [██████░░░░] rate%
    const filledBar = '█'.repeat(Math.round(rate / 10));
    const emptyBar = '░'.repeat(10 - Math.round(rate / 10));
    const progressBar = `\`[${filledBar}${emptyBar}]\` **${rate}%**`;

    const embed = createCoolEmbed()
      .setTitle(`📊 ${type === 'all' ? 'Overall' : type.charAt(0).toUpperCase() + type.slice(1)} Application Statistics`)
      .setDescription(`Current statistics for **${interaction.guild.name}** applications.`)
      .addFields(
        { name: '📝 Total Applications', value: `\`${total}\``, inline: true },
        { name: '⏳ Pending Review', value: `\`${pending}\``, inline: true },
        { name: '\u200B', value: '\u200B', inline: true }, // Spacer
        { name: '✅ Accepted', value: `\`${accepted}\``, inline: true },
        { name: '❌ Denied', value: `\`${denied}\``, inline: true },
        { name: '📈 Acceptance Rate', value: progressBar, inline: false }
      )
      
      .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
       })
      ;

    if (type === 'all') {
      embed.addFields(
        { name: '👮 Staff Apps', value: `\`${staffCount}\``, inline: true },
        { name: '🌟 Helper Apps', value: `\`${helperCount}\``, inline: true }
      );
    }

    await interaction.editReply({ embeds: [embed] });
  }
};


