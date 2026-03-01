const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed, createCustomEmbed } = require('../../utils/embeds');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set_requirements')
    .setDescription('[Free] Set promotion requirements for a rank')
    .addStringOption(opt => opt.setName('rank').setDescription('Which rank to configure').setRequired(true)
      .addChoices(
        { name: 'Staff', value: 'staff' },
        { name: 'Senior', value: 'senior' },
        { name: 'Manager', value: 'manager' },
        { name: 'Admin', value: 'admin' }
      ))
    .addIntegerOption(opt => opt.setName('points').setDescription('Min points needed').setRequired(true).setMinValue(0))
    .addIntegerOption(opt => opt.setName('shifts').setDescription('Min shifts completed').setRequired(true).setMinValue(0))
    .addIntegerOption(opt => opt.setName('consistency').setDescription('Min consistency % (0-100)').setRequired(true).setMinValue(0).setMaxValue(100))
    .addIntegerOption(opt => opt.setName('max_warnings').setDescription('Max warnings allowed').setRequired(false).setMinValue(0))
    .addIntegerOption(opt => opt.setName('shift_hours').setDescription('Min shift hours').setRequired(false).setMinValue(0))
    .addIntegerOption(opt => opt.setName('achievements').setDescription('Min achievements needed (Premium)').setRequired(false).setMinValue(0))
    .addIntegerOption(opt => opt.setName('reputation').setDescription('Min reputation points (Premium)').setRequired(false).setMinValue(0))
    .addIntegerOption(opt => opt.setName('days_in_server').setDescription('Min days in server (Enterprise)').setRequired(false).setMinValue(0))
    .addIntegerOption(opt => opt.setName('clean_record_days').setDescription('Min days with no warnings (Enterprise)').setRequired(false).setMinValue(0))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    try {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({ embeds: [createErrorEmbed('You need Manage Server permission!')], ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });
      const guildId = interaction.guildId;
      const rank = interaction.options.getString('rank');
      const points = interaction.options.getInteger('points');
      const shifts = interaction.options.getInteger('shifts');
      const consistency = interaction.options.getInteger('consistency');
      const maxWarnings = interaction.options.getInteger('max_warnings');
      const shiftHours = interaction.options.getInteger('shift_hours');
      const achievements = interaction.options.getInteger('achievements');
      const reputation = interaction.options.getInteger('reputation');
      const daysInServer = interaction.options.getInteger('days_in_server');
      const cleanRecordDays = interaction.options.getInteger('clean_record_days');

      let guildData = await Guild.findOne({ guildId });
      if (!guildData) {
        guildData = new Guild({ guildId, name: interaction.guild.name, ownerId: interaction.guild.ownerId });
      }

      if (!guildData.promotionRequirements) guildData.promotionRequirements = {};
      if (!guildData.promotionRequirements[rank]) guildData.promotionRequirements[rank] = {};

      guildData.promotionRequirements[rank].points = points;
      guildData.promotionRequirements[rank].shifts = shifts;
      guildData.promotionRequirements[rank].consistency = consistency;

      if (maxWarnings !== null) guildData.promotionRequirements[rank].maxWarnings = maxWarnings;
      if (shiftHours !== null) guildData.promotionRequirements[rank].shiftHours = shiftHours;
      if (achievements !== null) guildData.promotionRequirements[rank].achievements = achievements;
      if (reputation !== null) guildData.promotionRequirements[rank].reputation = reputation;
      if (daysInServer !== null) guildData.promotionRequirements[rank].daysInServer = daysInServer;
      if (cleanRecordDays !== null) guildData.promotionRequirements[rank].cleanRecordDays = cleanRecordDays;

      guildData.markModified('promotionRequirements');
      await guildData.save();

      const embed = await createCustomEmbed(interaction, {
        title: `⚙️ Protocol Update: ${rank.toUpperCase()}`,
        description: `Threshold parameters for the **${rank}** tier have been recalibrated.`,
        fields: [
          { name: '⭐ Min Points', value: `\`${points}\``, inline: true },
          { name: '🔄 Min Shifts', value: `\`${shifts}\``, inline: true },
          { name: '📈 Consistency', value: `\`${consistency}%\``, inline: true }
        ],
        color: 'success'
      });

      if (maxWarnings !== null) embed.addFields({ name: '⚠️ Max Warnings', value: `\`${maxWarnings}\``, inline: true });
      if (shiftHours !== null) embed.addFields({ name: '⏰ Min Hours', value: `\`${shiftHours}\``, inline: true });
      if (achievements !== null) embed.addFields({ name: '🏅 achievements', value: `\`${achievements}\``, inline: true });
      if (reputation !== null) embed.addFields({ name: '💫 Reputation', value: `\`${reputation}\``, inline: true });
      if (daysInServer !== null) embed.addFields({ name: '📅 Tenure (Days)', value: `\`${daysInServer}\``, inline: true });
      if (cleanRecordDays !== null) embed.addFields({ name: '✅ Record (Days)', value: `\`${cleanRecordDays}\``, inline: true });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const errEmbed = createErrorEmbed('An error occurred while saving the requirements.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
