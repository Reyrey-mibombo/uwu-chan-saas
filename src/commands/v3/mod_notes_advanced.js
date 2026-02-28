const { SlashCommandBuilder } = require('discord.js');
const { createPremiumEmbed } = require('../../utils/embeds');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mod_notes_advanced')
    .setDescription('View advanced mod notes')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Filter by user')
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('limit')
        .setDescription('Number of notes to show')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(50)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const targetUser = interaction.options.getUser('user');
    const limit = interaction.options.getInteger('limit') || 20;

    const query = { guildId, type: { $in: ['warning', 'command'] } };
    if (targetUser) query.userId = targetUser.id;

    const notes = await Activity.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    if (notes.length === 0) {
      return interaction.reply({ content: 'No mod notes found.', ephemeral: true });
    }

    const embed = createPremiumEmbed()
      .setTitle('📝 Advanced Mod Notes')
      
      .setDescription(targetUser ? `Notes for ${targetUser.username}` : `Recent ${limit} notes`);

    const noteEntries = await Promise.all(notes.map(async note => {
      const type = note.type === 'warning' ? '⚠️ Warning' : '🔧 Command';
      const date = new Date(note.createdAt).toLocaleString();
      const dataStr = note.data?.reason || note.data?.command || 'No details';
      return `**${type}** - ${date}\n${dataStr.substring(0, 100)}`;
    }));

    embed.addFields({ name: 'Recent Notes', value: noteEntries.join('\n\n') || 'No notes', inline: false });

    const totalWarnings = await Activity.countDocuments({ guildId, type: 'warning' });
    const totalCommands = await Activity.countDocuments({ guildId, type: 'command' });

    embed.addFields(
      { name: 'Total Warnings', value: totalWarnings.toString(), inline: true },
      { name: 'Total Commands', value: totalCommands.toString(), inline: true }
    );

    await interaction.reply({ embeds: [embed] });
  }
};



