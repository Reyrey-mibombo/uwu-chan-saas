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

        // Check limits to prevent DB bloat
        if (guildData.alerts.length >= 10) {
          return interaction.editReply({ embeds: [createErrorEmbed('You have reached the maximum active alert limit of 10.')] });
        }

        guildData.alerts.push({ name, condition, createdBy: interaction.user.id });
        await guildData.save();

        const embed = await createCustomEmbed(interaction, {
          title: '✅ Alert System Online',
          description: `Successfully registered a custom listener rule named **${name}**.`,
          fields: [
            { name: '⚙️ Triggers When', value: `\`${condition}\``, inline: false }
          ]
        });

        return interaction.editReply({ embeds: [embed] });
      }

      if (subcommand === 'list') {
        const embed = await createCustomEmbed(interaction, {
          title: '🔔 Custom Alert Rules',
          thumbnail: interaction.guild.iconURL({ dynamic: true }),
          description: guildData.alerts.length > 0
            ? guildData.alerts.map((a, i) => `**${i + 1}.** \`${a.name}\` ➔ ${a.condition}`).join('\n')
            : '*No alerts currently configured for this server.*'
        });

        return interaction.editReply({ embeds: [embed] });
      }

      if (subcommand === 'remove') {
        const name = interaction.options.getString('name');
        const originalLength = guildData.alerts.length;

        guildData.alerts = guildData.alerts.filter(a => a.name !== name);

        if (guildData.alerts.length === originalLength) {
          return interaction.editReply({ embeds: [createErrorEmbed(`No alert named **${name}** could be found.`)] });
        }

        await guildData.save();

        const embed = await createCustomEmbed(interaction, {
          title: '🗑️ Alert Removed',
          description: `Successfully wiped the listener rule **${name}** from the database.`
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
