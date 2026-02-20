const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('notes')
    .setDescription('View or add staff notes')
    .addStringOption(opt => opt.setName('note').setDescription('Add a note').setRequired(false)),

  async execute(interaction) {
    const note = interaction.options.getString('note');
    const guildData = await Guild.findOne({ guildId: interaction.guildId }) || new Guild({ guildId: interaction.guildId });
    
    if (!guildData.staffNotes) guildData.staffNotes = [];
    
    if (note) {
      guildData.staffNotes.push({ 
        userId: interaction.user.id, 
        note, 
        timestamp: new Date() 
      });
      await guildData.save();
      return interaction.reply({ content: `✅ Note added: "${note}"` });
    }
    
    const notes = guildData.staffNotes.slice(-20);
    const embed = new EmbedBuilder()
      .setTitle('📝 Staff Notes')
      .setDescription(notes.length > 0 ? notes.map(n => `• ${n.note} - <@${n.userId}> (<t:${Math.floor(n.timestamp.getTime()/1000)}:R>)`).join('\n') : 'No notes yet')
      .setColor('#f39c12');
    await interaction.reply({ embeds: [embed] });
  }
};
