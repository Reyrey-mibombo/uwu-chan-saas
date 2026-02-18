const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available commands'),

  async execute(interaction, client) {
    const embed = new EmbedBuilder()
      .setTitle('🤖 Uwu-chan Bot Commands')
      .setColor(0x3498db)
      .setDescription('Use `&` prefix to run commands (e.g., `&help`)')
      .addFields(
        { 
          name: '🔹 v1 Commands (FREE)', 
          value: '`&help`, `&ping`, `&server_info`, `&invite_link`, `&leaderboard`, `&staff_stats`, `&check_logs`, `&warn`, `&notes`, `&roles_list` + more',
          inline: false 
        },
        { 
          name: '🔹 v2 Commands (FREE)', 
          value: '`&activity_chart`, `&activity_log`, `&check_activity`, `&check_permissions`, `&daily_summary`, `&feedback`, `&mod_notes`, `&monthly_summary`, `&report_issue`, `&server_rules` + more', 
          inline: false 
        },
        { 
          name: '💎 v3-v5 Commands (Premium)', 
          value: '🔒 Locked - Use `/premium` to unlock!',
          inline: false 
        },
        { 
          name: '🌟 v6-v8 Commands (Enterprise)', 
          value: '🔒 Locked - Use `/premium` to upgrade to Enterprise!',
          inline: false 
        },
        {
          name: '💎 Premium Slash Commands',
          value: '`/premium` - View plans\n`/buy` - Purchase\n`/activate` - Activate\n`/help` - This help',
          inline: false
        }
      )
      .setFooter({ text: 'Uwu-chan Bot - v1 & v2 are always free!' });

    await interaction.reply({ embeds: [embed] });
  }
};
