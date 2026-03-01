const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('elite_badges')
    .setDescription('Zenith Hyper-Apex: Macroscopic Personnel Hall of Fame & Legendary Aura Frames'),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      // Zenith Hyper-Apex License Guard
      const license = await validatePremiumLicense(interaction);
      if (!license.allowed) {
        return interaction.editReply({ embeds: [license.embed], components: license.components });
      }

      const elites = await User.find({ guildId: interaction.guildId, 'staff.points': { $gte: 100 } })
        .sort({ 'staff.points': -1 })
        .limit(5)
        .lean();

      if (elites.length === 0) {
        return interaction.editReply({ embeds: [createErrorEmbed('No elite personnel merit traces found in this sector.')] });
      }

      // 1. Generate Legendary Aura Frames (ASCII)
      const badgeList = elites.map((u, i) => {
        const pts = u.staff.points;
        const tier = pts > 2000 ? 'LEGEND' : (pts > 1000 ? 'ELITE' : 'ACTIVE');
        const auraBar = '✦'.repeat(Math.min(10, Math.floor(pts / 200)));
        return `\`[P#${i + 1}]\` **${u.username}**\n\`[${auraBar}]\` \`${tier}\` | \`${pts.toLocaleString()} Merit\``;
      }).join('\n\n');

      const embed = await createCustomEmbed(interaction, {
        title: '🏆 Zenith Hyper-Apex: Elite Sector Hall',
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        description: `### ✨ Divine Personnel Recognition\nShowcasing the highest-density merit nodes and legendary auras for sector **${interaction.guild.name}**.\n\n${badgeList}\n\n**💎 ZENITH HYPER-APEX EXCLUSIVE**`,
        fields: [
          { name: '🛰️ Global Aura Sync', value: '`CONNECTED`', inline: true },
          { name: '✨ Visual Tier', value: '`DIVINE [APEX]`', inline: true },
          { name: '⚖️ Data Fidelity', value: '`99.9%`', inline: true }
        ],
        footer: 'Elite Personnel Hall • V8 Divine Identity Suite',
        color: 'premium'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Zenith Elite Badges Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Hall of Fame failure: Unable to decode legendary aura frames.')] });
    }
  }
};
