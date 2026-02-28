const { SlashCommandBuilder } = require('discord.js');
const { createEnterpriseEmbed } = require('../../utils/embeds');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank_display')
    .setDescription('Display your current rank with visual styling')
    .addUserOption(opt => opt.setName('user').setDescription('User to display').setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply();
    const target = interaction.options.getUser('user') || interaction.user;
    const user = await User.findOne({ userId: target.id }).lean();
    const pts = user?.staff?.points || 0;
    const rank = user?.staff?.rank || 'member';
    const consistency = user?.staff?.consistency || 100;
    const rankEmojis = { owner: '👑', admin: '💜', manager: '💎', senior: '🌟', staff: '⭐', trial: '🔰', member: '👤' };
    const colors = { owner: 0xffd700, admin: 0x9b59b6, manager: 0x00bfff, senior: 0x2ecc71, staff: 0x3498db, trial: 0x95a5a6, member: 0x7f8c8d };
    const embed = createEnterpriseEmbed()
      .setTitle(`${rankEmojis[rank] || '👤'} Rank Display — ${target.username}`)
      
      .setThumbnail(target.displayAvatarURL({ size: 256 }))
      .setDescription(`**${rankEmojis[rank] || ''} ${rank.toUpperCase()}**`)
      .addFields(
        { name: '⭐ Points', value: pts.toString(), inline: true },
        { name: '📈 Consistency', value: `${consistency}%`, inline: true },
        { name: '🏅 Achievements', value: (user?.staff?.achievements?.length || 0).toString(), inline: true }
      )
      
      ;
    await interaction.editReply({ embeds: [embed] });
  }
};



