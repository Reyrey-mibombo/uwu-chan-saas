const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User, Activity } = require('../../database/mongo');

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
        title: '💰 Allocation Payload Executed',
        description: `A dynamic point insertion command resolved explicitly against **${targetUser.username}**.`,
        thumbnail: targetUser.displayAvatarURL(),
        fields: [
          { name: '👤 Targeted Operator', value: `<@${targetUser.id}>`, inline: true },
          { name: '📈 Allocation Value', value: `\`+${points}\` Pts`, inline: true },
          { name: '⭐ Lifetime Nodes', value: `\`${user.staff.points}\` Total`, inline: true },
          { name: '⚙️ Commanding Author', value: `<@${moderatorId}>`, inline: true },
          { name: '📝 Context Execution', value: `\`${reason}\``, inline: false }
        ],
        footer: 'This execution metric was securely logged inside the database timeline.'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Bonus Allocation Error:', error);
      const errEmbed = createErrorEmbed('A database tracking error abruptly halted executing the allocation logic.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
