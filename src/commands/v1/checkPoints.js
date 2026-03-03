const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCoolEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('check_points')
    .setDescription('Check your or another staff member\'s points')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member to check').setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const userData = await User.findOne({ userId: targetUser.id, 'guilds.guildId': interaction.guildId }).lean();

      if (!userData || !userData.staff) {
        return const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v1_checkPoints').setLabel('ðŸ„ Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed(`No localized staff telemetry found for **${targetUser.username}**.`)], components: [row] });
      }

      const points = userData.staff.points || 0;
      const rank = userData.staff.rank || 'trial';
      const consistency = userData.staff.consistency || 100;

      const embed = await createCustomEmbed(interaction, {
        title: `?? Personnel Asset Profile: ${targetUser.username}`,
        thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
        fields: [
          { name: '? Operational Points', value: `\`${points}\``, inline: true },
          { name: '??? Assigned Rank', value: `\`${rank.toUpperCase()}\``, inline: true },
          { name: '?? Performance Consistency', value: `\`${consistency}%\``, inline: true }
        ],
        color: 'info'
      });

      await const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v1_checkPoints').setLabel('ðŸ„ Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (error) {
      console.error(error);
      const errEmbed = createErrorEmbed('An error occurred while checking points.');
      if (interaction.deferred || interaction.replied) {
        await const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v1_checkPoints').setLabel('ðŸ„ Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [errEmbed], components: [row] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};

