const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promotion_requirements')
    .setDescription('[Premium] View authentic real-data promotion requirements for this server'),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const guildId = interaction.guildId;
      const guild = await Guild.findOne({ guildId }).lean();

      if (!guild || !guild.promotionRequirements) {
        return interaction.editReply({ embeds: [createErrorEmbed('No promotion requirements have been established in this server yet.')] });
      }

      const ranks = Object.keys(guild.promotionRequirements);
      if (ranks.length === 0) {
        return interaction.editReply({ embeds: [createErrorEmbed('No rank configurations exist in the database.')] });
      }

      const emojis = ['⭐', '🌟', '💎', '👑', '🔥', '🚀'];

      const embed = await createCustomEmbed(interaction, {
        title: '📋 Active Promotion Objectives',
        description: `Minimum target metrics required to progress through the hierarchy in **${interaction.guild.name}**.`,
        thumbnail: interaction.guild.iconURL({ dynamic: true })
      });

      for (let i = 0; i < ranks.length; i++) {
        const rankName = ranks[i];
        const req = guild.promotionRequirements[rankName];
        const fields = [];

        if (req.points) fields.push(`⭐ Points: **${req.points}**`);
        if (req.shifts) fields.push(`🔄 Shifts: **${req.shifts}**`);
        if (req.consistency) fields.push(`📈 Consistency: **${req.consistency}%**`);
        if (req.maxWarnings !== undefined && req.maxWarnings !== null) fields.push(`⚠️ Max Warnings: **${req.maxWarnings}**`);
        if (req.shiftHours) fields.push(`⏰ Shift Hours: **${req.shiftHours}**`);
        if (req.achievements) fields.push(`🏅 Achievements: **${req.achievements}**`);
        if (req.reputation) fields.push(`💫 Reputation: **${req.reputation}**`);
        if (req.daysInServer) fields.push(`📅 Days in Server: **${req.daysInServer}**`);
        if (req.cleanRecordDays) fields.push(`✅ Clean Record Days: **${req.cleanRecordDays}**`);

        const value = fields.length > 0 ? fields.join('\n') : '*No specific requirements configured.*';

        const title = rankName.charAt(0).toUpperCase() + rankName.slice(1);
        embed.addFields({
          name: `${emojis[i % emojis.length]} Target: ${title}`,
          value: value,
          inline: false
        });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Promotion Requirements Error:', error);
      const errEmbed = createErrorEmbed('An error occurred while fetching the promotion requirements.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
