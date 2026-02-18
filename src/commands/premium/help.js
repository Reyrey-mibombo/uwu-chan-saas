const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available commands'),

  async execute(interaction, client) {
    const embed = new EmbedBuilder()
      .setTitle('🤖 Bot Commands')
      .setColor(0x3498db)
      .setDescription('Here are all available commands:')
      .addFields(
        { name: 'Prefix Commands (v1-v8)', value: 'Use `&` before commands\n\n**v1-v8 Commands:**\n&help - Show this message\n&ping - Check bot latency\n&server_info - Server information\n&invite_link - Get bot invite\n&leaderboard - Points leaderboard\n&staff_stats - Staff statistics\n&check_logs - View server logs\n&warn - Warn a user\n&notes - Manage notes\n&roles_list - List server roles\n\nAnd more...', inline: true },
        { name: 'Premium Commands', value: 'Use `/` before commands\n\n**Premium Commands:**\n/premium - View premium plans\n/buy - Purchase premium\n/activate - Activate license\n\nPremium unlocks v3-v8 commands!', inline: true },
        { name: 'How to Use', value: '**Free:**\nType `&command` to use v1-v8\n\n**Premium:**\nUse `/premium` to buy\nThen access v3-v8 with `&`', inline: false }
      )
      .setFooter({ text: 'Uwu-chan Bot' });

    await interaction.reply({ embeds: [embed] });
  }
};
