const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('visual_feedback')
    .setDescription('Submit or view visual feedback about the bot')
    .addStringOption(opt => opt.setName('message').setDescription('Your feedback (optional)').setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply();
    const { Guild } = require('../../database/mongo');
    const guildId = interaction.guildId;
    const guild = await Guild.findOne({ guildId }).lean();
    const feedback = interaction.options.getString('message');
    const tier = guild?.premium?.tier || 'free';
    const cmds = guild?.stats?.commandsUsed || 0;

    const ratingBar = (v, max) => '▓'.repeat(Math.round(v / max * 5)) + '░'.repeat(5 - Math.round(v / max * 5));

    const embed = new EmbedBuilder()
      .setTitle('💬 Visual Feedback')
      .setColor(0x3498db)
      .addFields(
        { name: '⭐ Bot Rating', value: `\`${ratingBar(cmds, 1000)}⭐\` Based on usage` },
        { name: '🎖️ Your Tier', value: tier.toUpperCase(), inline: true },
        { name: '⚡ Commands Used', value: cmds.toString(), inline: true }
      )
      .setFooter({ text: `${interaction.guild.name} • Visual Feedback` })
      .setTimestamp();

    if (feedback) embed.setDescription(`📝 **Your Feedback:** ${feedback}\n\nThank you! This helps us improve the bot.`);
    else embed.setDescription('Use `/visual_feedback message:Your feedback here` to submit feedback.');

    await interaction.editReply({ embeds: [embed] });
  }
};
