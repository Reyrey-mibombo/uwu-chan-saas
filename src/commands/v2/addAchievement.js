const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createCustomEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');
const { User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add_achievement')
    .setDescription('[Premium] Award an authentic system achievement to a staff member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The staff member to award')
        .setRequired(true))
    .addStringOption(option =>
      option
        .setName('achievement')
        .setDescription('Specific achievement to award')
        .setRequired(true)
        .addChoices(
          { name: 'Staff of the Month', value: 'MONTHLY:Staff of the Month' },
          { name: 'Exemplary Moderator', value: 'MOD:Exemplary Moderator' },
          { name: 'Rule Enforcer Elite', value: 'MOD:Rule Enforcer Elite' },
          { name: 'Peacekeeper', value: 'MOD:Peacekeeper' },
          { name: 'Spam Slayer', value: 'MOD:Spam Slayer' },
          { name: 'Conflict Resolver', value: 'MOD:Conflict Resolver' },
          { name: 'Support Legend', value: 'SUPPORT:Support Legend' },
          { name: 'Ticket Master', value: 'SUPPORT:Ticket Master' },
          { name: 'Patience Champion', value: 'SUPPORT:Patience Champion' },
          { name: 'Welcome Wizard', value: 'SUPPORT:Welcome Wizard' },
          { name: 'Hyper Active Staff', value: 'ACTIVITY:Hyper Active Staff' },
          { name: 'Voice Chat Legend', value: 'ACTIVITY:Voice Chat Legend' },
          { name: 'Message Marathon', value: 'ACTIVITY:Message Marathon' },
          { name: 'Event Regular', value: 'ACTIVITY:Event Regular' }
        )),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser('user');
      const fullChoice = interaction.options.getString('achievement');
      const [category, title] = fullChoice.split(':', 2);
      const guildId = interaction.guildId;

      // Fetch User with strict Scoping
      let userData = await User.findOne({ userId: targetUser.id, guildId });

      if (!userData) {
        userData = new User({ userId: targetUser.id, guildId });
      }

      if (!userData.staff) userData.staff = {};
      if (!userData.staff.achievements) userData.staff.achievements = [];

      // Check for duplicates
      if (userData.staff.achievements.includes(title)) {
        return interaction.editReply({ embeds: [createErrorEmbed(`<@${targetUser.id}> already possesses the **${title}** achievement.`)] });
      }

      userData.staff.achievements.push(title);

      // Log the achievement activity
      const activity = new Activity({
        guildId,
        userId: targetUser.id,
        type: 'task',
        data: {
          taskName: 'Achievement Granted',
          award: title,
          managerId: interaction.user.id
        }
      });

      await Promise.all([userData.save(), activity.save()]);

      // V2 Expansion: Automated Milestone Broadcast
      const { broadcastMilestone } = require('../../utils/milestone_broadcast');
      await broadcastMilestone(interaction, 'ACHIEVEMENT', {
        userId: targetUser.id,
        achievement: title
      });

      const embed = await createCustomEmbed(interaction, {
        title: `🏆 Strategic Merit Authenticated`,
        description: `### 🛡️ Professional Achievement Awarded\nThe high-command has officially recognized <@${targetUser.id}> with the **${title}** classification for exemplary service.`,
        thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
        fields: [
          { name: '📋 Merit Category', value: `\`${category}\``, inline: true },
          { name: '🎖️ Registered By', value: `<@${interaction.user.id}>`, inline: true },
          { name: '🔢 Medal Inventory', value: `\`${userData.staff.achievements.length}\` Distinct Merits`, inline: true }
        ],
        footer: 'Achievements boost advancement eligibility during autonomous promotion scans.',
        color: 'success'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Add Achievement Error:', error);
      const errEmbed = createErrorEmbed('An error occurred while attempting to grant the achievement in the database.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
