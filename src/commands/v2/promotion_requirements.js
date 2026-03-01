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
        title: '📋 Strategic Advancement Objectives',
        description: `Official metric targets required for hierarchical progression within the **${interaction.guild.name}** sector.`,
        thumbnail: interaction.guild.iconURL({ dynamic: true })
      });

      for (let i = 0; i < ranks.length; i++) {
        const rankName = ranks[i];
        const req = guild.promotionRequirements[rankName];
        const fields = [];

        if (req.points) fields.push(`> ⭐ **Target Points**: \`${req.points.toLocaleString()}\``);
        if (req.shifts) fields.push(`> 🔄 **Target Shifts**: \`${req.shifts}\``);
        if (req.consistency) fields.push(`> 📈 **Reliability Rating**: \`${req.consistency}%\``);
        if (req.maxWarnings !== undefined) fields.push(`> ⚠️ **Warning Threshold**: \`<= ${req.maxWarnings}\``);
        if (req.shiftHours) fields.push(`> ⏱️ **Flight Time**: \`${req.shiftHours}h\``);

        const value = fields.length > 0 ? fields.join('\n') : '*No specific operational constraints configured.*';
        const titleLabel = rankName.charAt(0).toUpperCase() + rankName.slice(1);

        embed.addFields({
          name: `${emojis[i % emojis.length]} Rank: ${titleLabel}`,
          value: value,
          inline: true
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
