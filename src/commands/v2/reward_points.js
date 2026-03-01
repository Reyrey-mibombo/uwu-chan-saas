const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reward_points')
    .setDescription('View authentic reward points available to a staff member')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser('user') || interaction.user;

      const userDoc = await User.findOne({ userId: targetUser.id, guildId: interaction.guildId }).lean();

      if (!userDoc || !userDoc.staff) {
        return interaction.editReply({ embeds: [createErrorEmbed(`No staff record found for <@${targetUser.id}> in this server.`)] });
      }

      const available = userDoc.staff.points || 0;
      // We calculate lifetime by aggregating all shifts this user has worked in this guild
      const shifts = await require('../../database/mongo').Shift.find({ userId: targetUser.id, guildId: interaction.guildId }).lean();

      const lifetimeHours = Math.floor(shifts.reduce((acc, s) => acc + (s.duration || 0), 0) / 3600);
      const totalShifts = shifts.length;

      const embed = await createCustomEmbed(interaction, {
        title: `🎁 Reward Profile: ${targetUser.username}`,
        thumbnail: targetUser.displayAvatarURL(),
        description: `Here are the authentic rewards metrics for <@${targetUser.id}>.`,
        fields: [
          { name: '✨ Available Points', value: `\`${available}\``, inline: true },
          { name: '⏱️ Lifetime Logged', value: `\`${lifetimeHours}\` Hours`, inline: true },
          { name: '📅 Total Shifts', value: `\`${totalShifts}\` Shifts`, inline: true }
        ],
        footer: 'Authentic Data • Non-Estimations'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Reward Points Error:', error);
      const errEmbed = createErrorEmbed('An error occurred while fetching reward point algorithms.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
