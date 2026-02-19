const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('notes')
    .setDescription('View or add staff notes')
    .addStringOption(option => 
      option.setName('action')
        .setDescription('View or add notes')
        .addChoices(
          { name: 'View', value: 'view' },
          { name: 'Add', value: 'add' }
        )
        .setRequired(true))
    .addStringOption(option => 
      option.setName('content')
        .setDescription('Note content (if adding)')
        .setRequired(false)),

  async execute(interaction, client) {
    const action = interaction.options.getString('action');
    const content = interaction.options.getString('content');
    const userId = interaction.user.id;
    const guildId = interaction.guildId;

    if (action === 'add' && content) {
      await Activity.create({
        guildId,
        userId,
        type: 'command',
        data: { action: 'note', content }
      });

      const embed = new EmbedBuilder()
        .setTitle('📝 Note Added')
        .setColor(0x2ecc71)
        .setDescription(`Note saved: ${content}`)
        .setFooter({ text: `By ${interaction.user.username}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } else {
      const notes = await Activity.find({
        guildId,
        'data.action': 'note'
      }).sort({ createdAt: -1 }).limit(10);

      if (notes.length === 0) {
        return interaction.reply({ 
          content: 'No notes yet. Use `/notes add` to add a note.',
          ephemeral: true 
        });
      }

      const embed = new EmbedBuilder()
        .setTitle('📝 Staff Notes')
        .setColor(0x3498db)
        .setDescription(notes.map(n => `• ${n.data.content} - <@${n.userId}> (${formatDate(n.createdAt)})`).join('\n'))
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  }
};

function formatDate(date) {
  return date.toLocaleDateString();
}
