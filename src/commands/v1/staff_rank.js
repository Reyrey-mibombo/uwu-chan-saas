const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_rank')
    .setDescription('View staff rank and progression')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(false)),
  
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const guildData = await Guild.findOne({ guildId: interaction.guild.id });
    const points = guildData?.staffPoints?.[user.id] || 0;
    
    let rank = 'Newcomer';
    if (points >= 500) rank = 'Legend';
    else if (points >= 300) rank = 'Veteran';
    else if (points >= 150) rank = 'Experienced';
    else if (points >= 50) rank = 'Active';
    
    const embed = new EmbedBuilder()
      .setTitle(`🏆 ${user.username}'s Rank`)
      .addFields(
        { name: 'Rank', value: rank, inline: true },
        { name: 'Points', value: `${points}`, inline: true }
      )
      .setColor('#f1c40f')
      .setThumbnail(user.displayAvatarURL());
    
    await interaction.reply({ embeds: [embed] });
  }
};
