const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
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
      return interaction.reply({ content: '✅ No warnings found!', ephemeral: true });
    }

    const list = warnings.map(w => {
      const emoji = w.severity === 'high' ? '🔴' : w.severity === 'medium' ? '🟡' : '🟢';
      return `${emoji} **${w.reason}** - <t:${Math.floor(new Date(w.createdAt).getTime()/1000)}:R>`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle(`⚠️ Warnings - ${user.username}`)
      .setDescription(list)
      
      ;

    await interaction.reply({ embeds: [embed] });
  }
};
