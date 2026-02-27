const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

const RANK_THRESHOLDS = {
  trial: 0, staff: 100, senior: 300, manager: 600, admin: 1000
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auto_promotion')
    .setDescription('View auto-promotion settings and point thresholds')
    .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable auto-promotion').setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const enabledOpt = interaction.options.getBoolean('enabled');

    let guild = await Guild.findOne({ guildId });

    if (enabledOpt !== null) {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.editReply('❌ You need **Manage Server** permission to change this setting.');
      }
      if (!guild) guild = new Guild({ guildId, name: interaction.guild.name });
      guild.settings.modules.automation = enabledOpt;
      await guild.save();
    }

    const autoEnabled = guild?.settings?.modules?.automation ?? false;

    const thresholdTable = Object.entries(RANK_THRESHOLDS)
      .map(([rank, pts]) => `${rank.padEnd(10)} → **${pts}** points`)
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('⬆️ Auto-Promotion Settings')
      
      .addFields(
        { name: '⚙️ Status', value: autoEnabled ? '✅ Enabled' : '❌ Disabled', inline: true },
        { name: '📌 Trigger', value: 'Automatic on point milestones', inline: true },
        { name: '🔒 Requires', value: 'Manager approval + point threshold', inline: true },
        { name: '📊 Rank Point Thresholds', value: `\`\`\`${thresholdTable}\`\`\`` },
        { name: '💡 Tip', value: 'Use `/progress_tracker` to see who is close to promotion.' }
      )
      
      ;

    await interaction.editReply({ embeds: [embed] });
  }
};
