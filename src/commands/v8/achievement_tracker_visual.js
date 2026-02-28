const { SlashCommandBuilder } = require('discord.js');
const { createEnterpriseEmbed } = require('../../utils/embeds');
const { User } = require('../../database/mongo');

const ALL_ACHIEVEMENTS = ['🔥 First Shift', '⭐ Point Collector', '💎 Elite Member', '🎯 Consistent', '🏆 Top Performer', '⚡ Power User'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('achievement_tracker_visual')
    .setDescription('Visual progress tracker for all achievements')
    .addUserOption(opt => opt.setName('user').setDescription('User to track').setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply();
    const target = interaction.options.getUser('user') || interaction.user;
    const user = await User.findOne({ userId: target.id }).lean();
    const earned = user?.staff?.achievements || [];
    const points = user?.staff?.points || 0;
    const consistency = user?.staff?.consistency || 100;

    const progress = ALL_ACHIEVEMENTS.map(a => {
      const done = earned.includes(a);
      return `${done ? '✅' : '🔲'} ${a}`;
    }).join('\n');

    const pct = Math.round((earned.length / ALL_ACHIEVEMENTS.length) * 100);
    const bar = '▓'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));

    const embed = createEnterpriseEmbed()
      .setTitle(`🎯 Achievement Tracker — ${target.username}`)
      
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: '📊 Completion', value: `\`${bar}\` **${pct}%** (${earned.length}/${ALL_ACHIEVEMENTS.length})` },
        { name: '⭐ Points', value: points.toString(), inline: true },
        { name: '📈 Consistency', value: `${consistency}%`, inline: true },
        { name: '🏅 Achievements', value: progress }
      )
      
      ;

    await interaction.editReply({ embeds: [embed] });
  }
};



