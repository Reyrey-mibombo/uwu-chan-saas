const { SlashCommandBuilder } = require('discord.js');
const { createPremiumEmbed } = require('../../utils/embeds');
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

    const embed = await createCustomEmbed(interaction, {
      title: '📊 Secure Sector Analytics',
      thumbnail: interaction.guild.iconURL({ dynamic: true }),
      description: `### 🛡️ Macroscopic Incident Report\nAnalysis of security interventions and disciplinary actions gathered over the **${period}** vector in the **${interaction.guild.name}** sector.`,
      fields: [
        { name: '⚠️ Disciplinary (Warn)', value: `\`${stats.warn}\``, inline: true },
        { name: '🚫 Neutralization (Ban)', value: `\`${stats.ban}\``, inline: true },
        { name: '👢 Extraction (Kick)', value: `\`${stats.kick}\``, inline: true },
        { name: '🔇 Silencing (Mute)', value: `\`${stats.mute}\``, inline: true },
        { name: '⚔️ Infractions (Strike)', value: `\`${stats.strike}\``, inline: true },
        { name: '🌐 Aggregate Payload', value: `\`${total}\` Total`, inline: true }
      ],
      footer: 'Guardian Operational Intelligence • V4 Guardian Suite',
      color: total > 20 ? 'premium' : 'primary'
    });

    await interaction.reply({ embeds: [embed] });
  }

