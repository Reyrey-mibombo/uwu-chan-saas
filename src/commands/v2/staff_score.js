const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_score')
    .setDescription('View the algorithmic quality grade rating for a staff member')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member (Optional)').setRequired(false)),

  async execute(interaction, client) {
    try {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const staffSystem = client.systems.staff;

      if (!staffSystem) {
        return interaction.editReply({ embeds: [createErrorEmbed('Staff system is currently offline.')] });
      }

      // StaffSystem utility safely enforces guildId scoping out-of-the-box
      const score = await staffSystem.calculateStaffScore(targetUser.id, interaction.guildId).catch(() => 0);
      const points = await staffSystem.getPoints(targetUser.id, interaction.guildId).catch(() => 0);
      const consistency = await staffSystem.updateConsistency(targetUser.id, interaction.guildId).catch(() => 100);
      const warnings = await staffSystem.getUserWarnings(targetUser.id, interaction.guildId).catch(() => ({ total: 0 }));

      const activityScore = Math.min(100, Math.round(points / 10));
      const qualityScore = Math.max(0, 100 - (warnings.total * 5));

      const filledScore = Math.min(10, Math.floor(score / 10));
      const progressBar = `\`${'█'.repeat(filledScore)}${'░'.repeat(10 - filledScore)}\``;

      const embed = await createCustomEmbed(interaction, {
        title: `🎯 Staff Quality Algorithm: ${targetUser.username}`,
        thumbnail: targetUser.displayAvatarURL(),
        description: `The internal grading mechanism evaluates users based on **Activity**, disciplinary **Quality**, and schedule **Consistency**.`,
        fields: [
          { name: '💯 Overlap Grade', value: `${progressBar} **${score}%**`, inline: false },
          { name: '🔥 Activity Score', value: `\`${activityScore}/100\``, inline: true },
          { name: '✅ Quality Score', value: `\`${qualityScore}/100\``, inline: true },
          { name: '📈 Consistency', value: `\`${consistency}%\``, inline: true }
        ],
        footer: `Disciplinary Warnings Impact Quality: [${warnings.total} Strikes recorded]`
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Staff Score Error:', error);
      const errEmbed = createErrorEmbed('An error occurred while running the grading algorithm.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
