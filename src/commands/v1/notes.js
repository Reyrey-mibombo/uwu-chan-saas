const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

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

    if (action === 'add' && content) {
      const embed = new EmbedBuilder()
        .setTitle('📝 Note Added')
        .setColor(0x2ecc71)
        .setDescription(`Note added: ${content}`)
        .setFooter({ text: `By ${interaction.user.username}` });

      await interaction.reply({ embeds: [embed] });
    } else {
      const embed = new EmbedBuilder()
        .setTitle('📝 Staff Notes')
        .setColor(0x3498db)
        .setDescription('No notes available. Use `/notes add` to add a note.');

      await interaction.reply({ embeds: [embed] });
    }
  }
};
