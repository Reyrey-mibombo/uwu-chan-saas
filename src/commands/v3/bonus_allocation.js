const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed, createErrorEmbed, createPremiumEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { User, Activity } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bonus_allocation')
    .setDescription('Algorithmic node granting bonus points to active profiles.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Operator target receiving allocation limits')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('points')
        .setDescription('Point threshold limit to inject')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(10000))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Contextual note mapping this allocation')
        .setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'premium');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }
      const targetUser = interaction.options.getUser('user');
      const points = interaction.options.getInteger('points');
      const reason = interaction.options.getString('reason') || 'Algorithmic Staff Grant';
      const guildId = interaction.guildId;
      const moderatorId = interaction.user.id;

      // Sandboxed querying forcing allocation to bound solely inside this specific interaction.guildId
      let user = await User.findOne({ userId: targetUser.id, guildId });
      if (!user) {
        user = new User({
          userId: targetUser.id,
          username: targetUser.username,
          guildId // Crucial Map!
        });
      }

      if (!user.staff) Object.assign(user, { staff: {} });
      user.staff.points = (user.staff.points || 0) + points;

      const logTrace = new Activity({
        guildId,
        userId: targetUser.id,
        type: 'command',
        data: {
          command: 'bonus_allocation',
          points,
          reason,
          moderatorId
        }
      });

      await Promise.all([user.save(), logTrace.save()]);

      const embed = await createCustomEmbed(interaction, {
        title: '?? Allocation Payload Executed',
        description: `A dynamic point insertion command resolved explicitly against **${targetUser.username}**.`,
        thumbnail: targetUser.displayAvatarURL(),
        fields: [
          { name: '?? Targeted Operator', value: `<@${targetUser.id}>`, inline: true },
          { name: '?? Allocation Value', value: `\`+${points}\` Pts`, inline: true },
          { name: '? Lifetime Nodes', value: `\`${user.staff.points}\` Total`, inline: true },
          { name: '?? Commanding Author', value: `<@${moderatorId}>`, inline: true },
          { name: '?? Context Execution', value: `\`${reason}\``, inline: false }
        ],
        footer: 'This execution metric was securely logged inside the database timeline.'
      });

      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v3_bonus_allocation').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });

    } catch (error) {
      console.error('Bonus Allocation Error:', error);
      const errEmbed = createErrorEmbed('A database tracking error abruptly halted executing the allocation logic.');
            if (interaction.deferred || interaction.replied) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v3_bonus_allocation').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            return await interaction.editReply({ embeds: [errEmbed], components: [row] });
      } else {
        await interaction.editReply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};


