const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEnterpriseEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { User } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bonus_tracker')
    .setDescription('Visual bonus points tracker for a staff member')
    .addUserOption(opt => opt.setName('user').setDescription('User to track').setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'enterprise');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }
    const target = interaction.options.getUser('user') || interaction.user;
    const user = await User.findOne({ userId: target.id }).lean();
    const points = user?.staff?.points || 0;
    const TIERS = [50, 150, 300, 500, 1000];

    const nextTier = TIERS.find(t => points < t) || TIERS[TIERS.length - 1];
    const prevTier = TIERS.filter(t => points >= t).pop() || 0;
    const progress = Math.min(100, Math.round(((points - prevTier) / (nextTier - prevTier)) * 100));
    const bar = '�'.repeat(Math.round(progress / 10)) + '�'.repeat(10 - Math.round(progress / 10));

    const tiersDisplay = TIERS.map(t => `${points >= t ? '?' : '??'} **${t} pts**`).join('  ?  ');

    const embed = createEnterpriseEmbed()
      .setTitle(`?? Bonus Tracker � ${target.username}`)
      
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: '? Current Points', value: points.toString(), inline: true },
        { name: '?? Next Tier', value: points >= 1000 ? '?? MAX' : nextTier.toString(), inline: true },
        { name: '?? Progress', value: `\`${bar}\` **${progress}%**` },
        { name: '?? Tier Progress', value: tiersDisplay }
      )
      
      ;

    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_bonus_tracker').setLabel('�� Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};







