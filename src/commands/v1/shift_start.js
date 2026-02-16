const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Shift } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shift_start')
    .setDescription('Start your staff shift'),

  async execute(interaction, client) {
    const userId = interaction.user.id;
    const guildId = interaction.guildId;

    const activeShift = await Shift.findOne({ 
      guildId, 
      userId, 
      endTime: null 
    });

    if (activeShift) {
      return interaction.reply({ 
        content: 'You already have an active shift! Use /shift_end to end it.',
        ephemeral: true 
      });
    }

    const shift = new Shift({
      guildId,
      userId,
      startTime: new Date()
    });
    await shift.save();

    const staffSystem = client.systems.staffSystem;
    await staffSystem.updateConsistency(userId, guildId);

    const embed = new EmbedBuilder()
      .setTitle('🟢 Shift Started')
      .setColor(0x2ecc71)
      .setDescription(`Your shift has started! Make the most of it!`)
      .addFields(
        { name: '⏰ Start Time', value: shift.startTime.toLocaleString(), inline: true },
        { name: '💡 Tip', value: 'Use /shift_end when you\'re done to log your hours', inline: false }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    const staffChannel = interaction.guild.channels.cache.find(c => 
      c.name.includes('staff') || c.name.includes('duty')
    );
    if (staffChannel) {
      await staffChannel.send(`📢 ${interaction.user} has started their shift!`);
    }
  }
};
