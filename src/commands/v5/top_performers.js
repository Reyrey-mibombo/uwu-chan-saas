const { SlashCommandBuilder } = require('discord.js');
const { createPremiumEmbed } = require('../../utils/embeds');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('top_performers')
    .setDescription('View top performers')
    .addIntegerOption(opt => opt.setName('limit').setDescription('Number of performers').setRequired(false)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const limit = interaction.options.getInteger('limit') || 10;

    const users = await User.find({
      'guilds.guildId': guildId,
      'staff.points': { $exists: true, $gt: 0 }
    })
      .sort({ 'staff.points': -1 })
      .limit(limit)
      .lean();

    if (users.length === 0) {
      await interaction.reply({ content: 'No performer data found.' });
      return;
    }

    const embed = createPremiumEmbed()
      .setTitle('⭐ Top Performers')
      
      .setDescription(
        users.map((u, i) => {
          const guildData = u.guilds?.find(g => g.guildId === guildId);
          const name = guildData?.nickname || u.username || `User ${u.userId}`;
          const pts = u.staff?.points || 0;
          const consistency = u.staff?.consistency || 100;
          const badge = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
          return `${badge} ${name} - ${pts} pts (${consistency}%)`;
        }).join('\n')
      )
      ;

    await interaction.reply({ embeds: [embed] });
  }
};



