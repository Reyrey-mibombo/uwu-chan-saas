const { SlashCommandBuilder } = require('discord.js');
const { createEnterpriseEmbed } = require('../../utils/embeds');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_recognition')
    .setDescription('Recognize a staff member for their contributions')
    .addUserOption(opt => opt.setName('user').setDescription('Staff to recognize').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for recognition').setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply();
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'Outstanding dedication and teamwork!';
    const user = await User.findOne({ userId: target.id }).lean();
    const pts = user?.staff?.points || 0;
    const rank = user?.staff?.rank || 'member';
    const embed = createEnterpriseEmbed()
      .setTitle('🌟 Staff Recognition')
      
      .setThumbnail(target.displayAvatarURL())
      .setDescription(`🎊 **${target.username}** is being recognized by <@${interaction.user.id}>!`)
      .addFields(
        { name: '🎖️ Rank', value: rank.toUpperCase(), inline: true },
        { name: '⭐ Points', value: pts.toString(), inline: true },
        { name: '💬 Recognition Reason', value: reason }
      )
      
      ;
    await interaction.editReply({ embeds: [embed] });
  }
};



