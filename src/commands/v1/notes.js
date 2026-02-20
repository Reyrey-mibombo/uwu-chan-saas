const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('notes')
    .setDescription('View or add staff notes')
    .addStringOption(opt => opt.setName('note').setDescription('Add a note').setRequired(false)),
  
  async execute(interaction) {
    const note = interaction.options.getString('note');
    const guildData = await Guild.findOne({ guildId: interaction.guild.id });
    
    if (note) {
      await interaction.reply(`✅ Note added: "${note}"`);
    } else {
      const notes = guildData?.notes || [];
      const embed = new EmbedBuilder()
        .setTitle('📝 Staff Notes')
        .setDescription(notes.length > 0 ? notes.join('\n') : 'No notes yet')
        .setColor('#f39c12');
      await interaction.reply({ embeds: [embed] });
    }
  }
};
