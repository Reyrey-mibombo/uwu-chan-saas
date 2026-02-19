const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bonus_points')
    .setDescription('Award bonus points to staff')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(true))
    .addIntegerOption(opt => opt.setName('amount').setDescription('Amount of points').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for bonus').setRequired(false)),
  
  async execute(interaction) {
    if (!interaction.member.permissions.has('ManageGuild')) {
      return interaction.reply({ content: '❌ You need Manage Server permission', ephemeral: true });
    }
    
    const user = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const reason = interaction.options.getString('reason') || 'Bonus';
    
    const guildData = await Guild.findOne({ guildId: interaction.guild.id }) || new Guild({ guildId: interaction.guild.id });
    if (!guildData.points) guildData.points = {};
    
    const userId = user.id;
    guildData.points[userId] = (guildData.points[userId] || 0) + amount;
    await guildData.save();
    
    const embed = new EmbedBuilder()
      .setTitle('✅ Bonus Points Awarded')
      .setDescription(`**${amount}** points given to ${user.tag}\nReason: ${reason}`)
      .setColor('#2ecc71');
    
    await interaction.reply({ embeds: [embed] });
  }
};
