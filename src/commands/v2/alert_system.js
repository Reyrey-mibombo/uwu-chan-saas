const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('alert_system')
    .setDescription('Configure custom alert rules mapped to this server')
    .addSubcommand(sub => sub.setName('add').setDescription('Add an alert')
      .addStringOption(opt => opt.setName('name').setDescription('Alert name').setRequired(true))
      .addStringOption(opt => opt.setName('condition').setDescription('Alert condition').setRequired(true)))
    .addSubcommand(sub => sub.setName('list').setDescription('List all alerts'))
    .addSubcommand(sub => sub.setName('remove').setDescription('Remove an alert')
      .addStringOption(opt => opt.setName('name').setDescription('Alert name').setRequired(true))),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });
      const subcommand = interaction.options.getSubcommand();

      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.editReply({ embeds: [createErrorEmbed('You do not have the required `Manage Server` permission.')] });
      }

      const guildId = interaction.guildId;
      let guildData = await Guild.findOne({ guildId });
      if (!guildData) {
        guildData = new Guild({ guildId, name: interaction.guild.name, ownerId: interaction.guild.ownerId });
      }

      if (!guildData.alerts) guildData.alerts = [];

      if (subcommand === 'add') {
        const name = interaction.options.getString('name');
        const condition = interaction.options.getString('condition');

        if (guildData.alerts.length >= 10) {
          return interaction.editReply({ embeds: [createErrorEmbed('Maximum operational alert capacity (10) has been reached for this sector.')] });
        }

        guildData.alerts.push({ name, condition, createdBy: interaction.user.id });
        await guildData.save();

        const embed = await createCustomEmbed(interaction, {
          title: '✅ Alert Protocol Synchronized',
          description: `Successfully registered a new tactical listener rule within the **${interaction.guild.name}** monitoring grid.`,
          fields: [
            { name: '📡 Rule Designation', value: `\`${name.toUpperCase()}\``, inline: true },
            { name: '⚙️ Logic Condition', value: `\`${condition}\``, inline: true }
          ],
          color: 'success'
        });

        return interaction.editReply({ embeds: [embed] });
      }

      if (subcommand === 'list') {
        const list = guildData.alerts.map((a, i) => `> **${i + 1}.** \`${a.name}\` ➔ \`${a.condition}\``).join('\n');

        const embed = await createCustomEmbed(interaction, {
          title: '🔔 Active Operational Alerts',
          thumbnail: interaction.guild.iconURL({ dynamic: true }),
          description: guildData.alerts.length > 0
            ? `### 🛡️ Monitoring Grid Status: ONLINE\nThe following listener rules are active in the **${interaction.guild.name}** sector:\n\n${list}`
            : '*No active alert protocols detected in the current sector.*',
          color: 'premium'
        });

        return interaction.editReply({ embeds: [embed] });
      }

      if (subcommand === 'remove') {
        const name = interaction.options.getString('name');
        const originalLength = guildData.alerts.length;

        guildData.alerts = guildData.alerts.filter(a => a.name !== name);

        if (guildData.alerts.length === originalLength) {
          return interaction.editReply({ embeds: [createErrorEmbed(`Search failed: No alert rule designated **${name}** exists.`)] });
        }

        await guildData.save();

        const embed = await createCustomEmbed(interaction, {
          title: '🗑️ Alert Protocol Terminated',
          description: `Successfully decommissioned the listener rule **${name}** from the operational grid.`,
          color: 'error'
        });

        return interaction.editReply({ embeds: [embed] });
      }

    } catch (error) {
      console.error('Alert System Error:', error);
      const errEmbed = createErrorEmbed('A database error occurred while modifying the alert configuration matrix.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
