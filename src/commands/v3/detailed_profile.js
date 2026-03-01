const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');
const { User, Activity, Shift } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('detailed_profile')
    .setDescription('Zenith Personnel Dossier: High-Fidelity identity verification')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to view profile for')
        .setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      // Strict Zenith License Guard
      const license = await validatePremiumLicense(interaction);
      if (!license.allowed) {
        return interaction.editReply({ embeds: [license.embed], components: license.components });
      }

      const targetUser = interaction.options.getUser('user') || interaction.user;
      const guildId = interaction.guildId;

      const user = await User.findOne({ userId: targetUser.id, guildId }).lean();

      if (!user || !user.staff) {
        return interaction.editReply({ embeds: [createErrorEmbed(`No high-fidelity personnel records found for <@${targetUser.id}>.`)] });
      }

      const staff = user.staff;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [activities, shifts] = await Promise.all([
        Activity.find({ guildId, userId: targetUser.id }).sort({ createdAt: -1 }).limit(5).lean(),
        Shift.find({ guildId, userId: targetUser.id, startTime: { $gte: thirtyDaysAgo } }).lean()
      ]);

      const totalHours = shifts.reduce((acc, s) => acc + (s.duration || 0), 0) / 3600;

      // Zenith Aesthetic: Custom Watermarked Profile
      const embed = await createCustomEmbed(interaction, {
        title: `🎖️ Zenith Personnel Dossier: ${targetUser.username}`,
        thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
        description: `### 💎 Zenith Identity Authentication\nAuthenticated high-fidelity trace for **${targetUser.tag}**. Integrating V2 Ultra metrics and behavioral consistency mapping.\n\n**Verified Premium Operative**`,
        fields: [
          { name: '🏆 Operational Rank', value: `\`${staff.rank?.toUpperCase() || 'MEMBER'}\``, inline: true },
          { name: '✨ Mastery Level', value: `\`LVL ${staff.level || 1}\``, inline: true },
          { name: '📊 Merit Gained', value: `\`${(staff.points || 0).toLocaleString()}\``, inline: true },
          { name: '⏱️ 30D Time Delta', value: `\`${totalHours.toFixed(1)}h\``, inline: true },
          { name: '📈 Reliability', value: `\`${staff.consistency || 100}%\``, inline: true },
          { name: '🤝 Peer Honorific', value: `\`${staff.honorific || 'COMMENDABLE'}\``, inline: true },
          { name: '🏷️ Tactical Tagline', value: `*"${staff.tagline || 'Operational Personnel'}"*`, inline: false }
        ],
        footer: 'Zenith Identity Matrix • V3 Strategic Executive Suite',
        color: 'enterprise'
      });

      // Integrating RPG Perks if equipped
      if (staff.equippedPerk) {
        embed.addFields({ name: '🌟 Equipped Tactical Perk', value: `\`[ ${staff.equippedPerk.toUpperCase()} ]\``, inline: true });
      }

      if (activities.length > 0) {
        const activityList = activities.map(a => `\`[${new Date(a.createdAt).toLocaleDateString()}]\` **${a.type.toUpperCase()}** - Verified Tracer`).join('\n');
        embed.addFields({ name: '📜 Recent Ledger Footprints', value: activityList, inline: false });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Zenith Detailed Profile Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Zenith Identity failure: Unable to decode high-fidelity dossiers.')] });
    }
  }
};
