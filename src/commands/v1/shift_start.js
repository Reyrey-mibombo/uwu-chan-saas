const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shift_start')
    .setDescription('Start your work shift'),
  
  async execute(interaction) {
    const userId = interaction.user.id;
    const guildData = await Guild.findOne({ guildId: interaction.guild.id }) || new Guild({ guildId: interaction.guild.id });
    
    if (!guildData.shifts) guildData.shifts = [];
    
    const activeShift = guildData.shifts.find(s => s.userId === userId && !s.endTime);
    if (activeShift) {
      return interaction.reply({ content: '❌ You already have an active shift!', ephemeral: true });
    }
    
    guildData.shifts.push({ userId, startTime: new Date() });
    await guildData.save();
    
    const embed = new EmbedBuilder()
      .setTitle('✅ Shift Started')
      .setDescription(`Your shift has started!\nStarted at: <t:${Math.floor(Date.now() / 1000)}:T>`)
      .setColor('#2ecc71');
    
    await interaction.reply({ embeds: [embed] });
  }
};
