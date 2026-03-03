const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEnterpriseEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { User } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('achievement_display')
    .setDescription('Display your achievements showcase')
    .addUserOption(opt => opt.setName('user').setDescription('User to display').setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'enterprise');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }
    const target = interaction.options.getUser('user') || interaction.user;
    const user = await User.findOne({ userId: target.id }).lean();
    const achievements = user?.staff?.achievements || [];
    const points = user?.staff?.points || 0;
    const rank = user?.staff?.rank || 'member';

    const rankEmojis = { owner: '??', admin: '??', manager: '??', senior: '??', staff: '?', trial: '??', member: '??' };
    const achieveDisplay = achievements.length
      ? achievements.map(a => `� ${a}`).join('\n')
      : '*No achievements yet � keep contributing!*';

    const embed = createEnterpriseEmbed()
      .setTitle(`?? Achievement Showcase � ${target.username}`)
      
      .setThumbnail(target.displayAvatarURL({ size: 256 }))
      .setDescription(achieveDisplay)
      .addFields(
        { name: `${rankEmojis[rank] || '??'} Rank`, value: rank.toUpperCase(), inline: true },
        { name: '? Points', value: points.toString(), inline: true },
        { name: '?? Total Achievements', value: achievements.length.toString(), inline: true }
      )
      
      ;

    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_achievement_display').setLabel('�� Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};







