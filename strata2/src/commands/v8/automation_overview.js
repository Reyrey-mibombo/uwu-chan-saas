const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automation_overview')
    .setDescription('View automation overview for the server'),
  async execute(interaction) {
    let guild = await Guild.findOne({ guildId: interaction.guild.id });
    if (!guild) {
      guild = new Guild({ guildId: interaction.guild.id, name: interaction.guild.name });
      await guild.save();
    }

    const settings = guild.settings || {};
    const automations = [
      { name: 'Automation', key: 'automationEnabled', label: 'Master Switch' },
      { name: 'Auto Promotion', key: 'autoPromotionEnabled', label: 'Auto Promotion' },
      { name: 'Auto Task', key: 'autoTaskEnabled', label: 'Auto Task' },
      { name: 'Auto Assign', key: 'autoAssignEnabled', label: 'Auto Assign' },
      { name: 'Welcome Messages', key: 'welcomeEnabled', label: 'Welcome' },
      { name: 'Level Up', key: 'levelUpEnabled', label: 'Level Up' }
    ];

    const activeCount = automations.filter(a => settings[a.key]).length;

    const embed = new EmbedBuilder()
      .setTitle('⚙️ Automation Overview')
      .setColor(0x3498db)
      .addFields(
        { name: 'Active Automations', value: `${activeCount}`, inline: true },
        { name: 'Total Automations', value: `${automations.length}`, inline: true }
      );

    const statusList = automations.map(a => 
      `${settings[a.key] ? '✅' : '❌'} ${a.label}`
    ).join('\n');

    embed.addFields({ name: 'Automation Status', value: statusList, inline: false });

    await interaction.reply({ embeds: [embed] });
  }
};
