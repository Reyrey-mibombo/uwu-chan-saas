const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shift_start')
    .setDescription('Start your work shift'),

  async execute(interaction, client) {
    const staffSystem = client.systems.staff;
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    
    const existingShift = await require('../../database/mongo').Shift.findOne({
      userId,
      guildId,
      endTime: null
    });
    
    if (existingShift) {
      return interaction.reply({ content: '❌ You already have an active shift!', ephemeral: true });
    }
    
    const result = await staffSystem.startShift(userId, guildId);
    
    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('✅ Shift Started')
      .setDescription(`Your shift has started!\nStarted at: <t:${Math.floor(Date.now() / 1000)}:T>`)
      .addFields(
        { name: 'Shift ID', value: result.shiftId.toString(), inline: true }
      )
      
      ;

    await interaction.reply({ embeds: [embed] });
  }
};
