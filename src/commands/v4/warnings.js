const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createPremiumEmbed } = require('../../utils/embeds');
const { Warning } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View warnings for a user')
    .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(false)),

  async execute(interaction, client) {
    const user = interaction.options.getUser('user') || interaction.user;
    const warnings = await Warning.find({ userId: user.id, guildId: interaction.guildId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    if (!warnings.length) {
      return interaction.editReply({ content: '? No warnings found!', ephemeral: true });
    }

    const list = warnings.map(w => {
      const emoji = w.severity === 'high' ? '??' : w.severity === 'medium' ? '??' : '??';
      return `${emoji} **${w.reason}** - <t:${Math.floor(new Date(w.createdAt).getTime()/1000)}:R>`;
    }).join('\n');

    const embed = createPremiumEmbed()
      .setTitle(`?? Warnings - ${user.username}`)
      .setDescription(list)
      
      ;

    await const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v4_warnings').setLabel('ðŸ„ Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};




