const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promotion_requirements')
    .setDescription('[Premium] View promotion requirements'),

  async execute(interaction) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const guild = await Guild.findOne({ guildId });

    const ranks = [
      { key: 'staff', name: 'Staff', emoji: '⭐' },
      { key: 'senior', name: 'Senior', emoji: '🌟' },
      { key: 'manager', name: 'Manager', emoji: '💎' },
      { key: 'admin', name: 'Admin', emoji: '👑' }
    ];

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('📋 Promotion Requirements')
      
      .setDescription('Requirements to promote to each rank')
      .setThumbnail(interaction.guild.iconURL())
      ;

    for (const rank of ranks) {
      const req = guild?.promotionRequirements?.[rank.key] || {};
      
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

      const value = fields.length > 0 ? fields.join('\n') : 'Default requirements (not configured)';

      embed.addFields({
        name: `${rank.emoji} ${rank.name}`,
        value: value,
        inline: false
      });
    }

    embed;

    await interaction.editReply({ embeds: [embed] });
  }
};
