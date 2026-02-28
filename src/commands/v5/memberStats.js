const { SlashCommandBuilder } = require('discord.js');
const { createPremiumEmbed } = require('../../utils/embeds');
const { User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('member_stats')
    .setDescription('[Analytics] View server member statistics')
    .addUserOption(opt => opt.setName('user').setDescription('Specific user').setRequired(false)),

  async execute(interaction, client) {
    const guild = interaction.guild;
    const memberCount = guild.memberCount;

    const users = await User.find({}).lean();
    const staffCount = users.filter(u => u.staff?.rank).length;
    const activeUsers = users.filter(u => u.staff?.points > 0).length;

    const embed = createPremiumEmbed()
      .setTitle(`📊 ${guild.name} - Member Stats`)
      
      .addFields(
        { name: '👥 Total Members', value: memberCount.toString(), inline: true },
        { name: '👨‍💼 Staff Members', value: staffCount.toString(), inline: true },
        { name: '⭐ Active Users', value: activeUsers.toString(), inline: true }
      )
      .setThumbnail(guild.iconURL())
      ;

    await interaction.reply({ embeds: [embed] });
  }
};



