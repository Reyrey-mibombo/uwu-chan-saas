const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEnterpriseEmbed } = require('../../utils/enhancedEmbeds');
const { User } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

const AVAILABLE_ACHIEVEMENTS = [
  { name: '?? First Shift', desc: 'Complete your first shift', req: 'Complete 1 shift' },
  { name: '? Point Collector', desc: 'Earn 100 points', req: '100 points' },
  { name: '?? Elite Member', desc: 'Earn 500 points', req: '500 points' },
  { name: '?? Consistent', desc: 'Maintain 95%+ consistency for 30 days', req: '95% consistency' },
  { name: '?? Top Performer', desc: 'Reach #1 on the leaderboard', req: 'Rank #1' },
  { name: '? Power User', desc: 'Use 500 commands', req: '500 commands' }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('achievement_rewards')
    .setDescription('View available achievements and your current progress')
    .addUserOption(opt => opt.setName('user').setDescription('Check another user\'s achievements').setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'enterprise');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }
    const target = interaction.options.getUser('user') || interaction.user;
    const user = await User.findOne({ userId: target.id }).lean();
    const earned = user?.staff?.achievements || [];
    const points = user?.staff?.points || 0;
    const consistency = user?.staff?.consistency || 100;

    const fields = AVAILABLE_ACHIEVEMENTS.map(a => ({
      name: earned.includes(a.name) ? `? ${a.name}` : `?? ${a.name}`,
      value: `${a.desc}\n*Requirement: ${a.req}*`,
      inline: true
    }));

    const embed = createEnterpriseEmbed()
      .setTitle(`?? Achievement Rewards � ${target.username}`)
      
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: '??? Earned', value: `${earned.length}/${AVAILABLE_ACHIEVEMENTS.length}`, inline: true },
        { name: '? Points', value: points.toString(), inline: true },
        { name: '?? Consistency', value: `${consistency}%`, inline: true },
        ...fields
      )
      
      ;

    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_achievement_rewards').setLabel('�� Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};





