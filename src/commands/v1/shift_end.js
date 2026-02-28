const { SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shift_end')
    .setDescription('End your work shift'),

  async execute(interaction, client) {
    const staffSystem = client.systems.staff;
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    
    const result = await staffSystem.endShift(userId, guildId);
    
    if (!result.success) {
      return interaction.reply({ content: '❌ You dont have an active shift!', ephemeral: true });
    }
    
    const embed = createCoolEmbed()
      .setTitle('✅ Shift Ended')
      .setDescription(`Your shift has ended!`)
      .addFields(
        { name: 'Duration', value: `${result.hours}h ${result.minutes}m`, inline: true },
        { name: 'Total Seconds', value: `${Math.round(result.duration)}s`, inline: true }
      )
      
      ;

    await interaction.reply({ embeds: [embed] });
  }
};



