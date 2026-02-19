const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mod_notes')
    .setDescription('Add or view moderation notes for users')
    .addSubcommand(sub => sub.setName('add').setDescription('Add a note').addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)).addStringOption(opt => opt.setName('note').setDescription('Note').setRequired(true)))
    .addSubcommand(sub => sub.setName('view').setDescription('View notes').addUserOption(opt => opt.setName('user').setDescription('User').setRequired(false))),
  
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'add') {
      const user = interaction.options.getUser('user');
      const note = interaction.options.getString('note');
      
      const guildData = await Guild.findOne({ guildId: interaction.guild.id }) || new Guild({ guildId: interaction.guild.id });
      if (!guildData.notes) guildData.notes = [];
      guildData.notes.push({ userId: user.id, note, addedBy: interaction.user.id, timestamp: new Date() });
      await guildData.save();
      
      return interaction.reply({ content: `✅ Note added for ${user.tag}`, ephemeral: true });
    }
    
    if (subcommand === 'view') {
      const user = interaction.options.getUser('user');
      const guildData = await Guild.findOne({ guildId: interaction.guild.id });
      
      if (!guildData?.notes) {
        return interaction.reply({ content: 'No notes found', ephemeral: true });
      }
      
      const userNotes = guildData.notes.filter(n => n.userId === (user?.id || interaction.user.id));
      
      if (userNotes.length === 0) {
        return interaction.reply({ content: 'No notes found for this user', ephemeral: true });
      }
      
      const embed = new EmbedBuilder()
        .setTitle('📝 Moderation Notes')
        .setDescription(userNotes.map(n => `📝 ${n.note}\n*By: <@${n.addedBy}> - <t:${Math.floor(n.timestamp / 1000)}:R>*`).join('\n\n'))
        .setColor('#3498db');
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};
