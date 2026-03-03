const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEnterpriseEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { User } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reward_display')
    .setDescription('Display your earned rewards and badges')
    .addUserOption(opt => opt.setName('user').setDescription('User to view').setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'enterprise');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }
    const target = interaction.options.getUser('user') || interaction.user;
    const user = await User.findOne({ userId: target.id }).lean();
    const pts = user?.staff?.points || 0;
    const BADGES = [{ min: 2000, badge: '?? Legend' }, { min: 1000, badge: '?? Diamond' }, { min: 500, badge: '?? Gold' }, { min: 150, badge: '?? Silver' }, { min: 50, badge: '?? Bronze' }];
    const earned = BADGES.filter(b => pts >= b.min).map(b => b.badge);
    const next = BADGES.find(b => pts < b.min);
    const embed = createEnterpriseEmbed()
      .setTitle(`?? Reward Display � ${target.username}`)
      
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: '? Points', value: pts.toString(), inline: true },
        { name: '?? Badges Earned', value: earned.length.toString(), inline: true },
        { name: '??? Your Badges', value: earned.length ? earned.join('\n') : '?? No badges yet � earn 50+ points!' },
        { name: '?? Next Reward', value: next ? `${next.badge} at **${next.min}** pts (need ${next.min - pts} more)` : '?? All rewards unlocked!' }
      )
      
      ;
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_reward_display').setLabel('�� Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};







