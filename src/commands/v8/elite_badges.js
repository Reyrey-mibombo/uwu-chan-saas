const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('elite_badges')
    .setDescription('Zenith Apex: Macroscopic Merit Badges & Elite Personnel Showcase'),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      // Zenith Apex: Absolute License Verification
      const license = await validatePremiumLicense(interaction);
      if (!license.allowed) {
        return interaction.editReply({ embeds: [license.embed], components: license.components });
      }

      const users = await User.find({ 'staff.points': { $gt: 499 }, guildId: interaction.guildId }).sort({ 'staff.points': -1 }).limit(10).lean();

      const BADGE_TIERS = [
        { min: 2000, badge: '👑 LEGEND', icon: '💎' },
        { min: 1000, badge: '💎 DIAMOND', icon: '✨' },
        { min: 500, badge: '🥇 GOLD', icon: '🏅' },
      ];

      const badgeHolders = users.map(u => {
        const pts = u.staff?.points || 0;
        const tier = BADGE_TIERS.find(t => pts >= t.min);
        return { username: u.username || 'Unknown', pts, badge: tier?.badge || 'SILVER', icon: tier?.icon || '⭐' };
      });

      const list = badgeHolders.length
        ? badgeHolders.map(h => `${h.icon} **${h.badge}** | ${h.username} ░ \`${h.pts.toLocaleString()}\` Merit`).join('\n')
        : '> 🏅 *No elite merit badges authenticated in this sector registry yet.*';

      const embed = await createCustomEmbed(interaction, {
        title: '🏅 Zenith Hyper-Apex: Divine Personnel Showcase',
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        description: `### 🎖️ Divine Merit Registry\nAuthenticated elite indices for the **${interaction.guild.name}** sector. Current Legendary Presence: \`${legendCount > 0 ? 'DOMINANT' : 'STABLE'}\`.\n\n**💎 ZENITH HYPER-APEX EXCLUSIVE**`,
        fields: [
          { name: '👑 Legend Trophies', value: `\`${legendCount}\``, inline: true },
          { name: '💎 Diamond Metrics', value: `\`${badgeHolders.filter(h => h.pts >= 1000).length}\``, inline: true },
          { name: '🥇 Gold Infractions', value: `\`${badgeHolders.filter(h => h.pts >= 500).length}\``, inline: true },
          { name: '📜 Divine Achievement Matrix', value: list, inline: false },
          { name: '⚖️ Visual Tier', value: '`DIVINE [HYPER-APEX]`', inline: true },
          { name: '🔄 Omni-Bridge', value: '`ACTIVE`', inline: true }
        ],
        footer: 'Divine Personnel Showcase • V8 Identity Matrix Suite',
        color: 'premium'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Zenith Elite Badges Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Identity failure: Unable to decode elite merit badges.')] });
    }
  }
};
