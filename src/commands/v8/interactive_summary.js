const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEnterpriseEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { User, Shift, Activity } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('interactive_summary')
    .setDescription('Interactive summary of your own server stats')
    .addUserOption(opt => opt.setName('user').setDescription('User to view').setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'enterprise');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }
    const target = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guildId;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    const [user, shifts, recentActs] = await Promise.all([
      User.findOne({ userId: target.id }).lean(),
      Shift.find({ guildId, userId: target.id, startTime: { $gte: thirtyDaysAgo } }).lean(),
      Activity.countDocuments({ guildId, userId: target.id, createdAt: { $gte: thirtyDaysAgo } })
    ]);

    const pts = user?.staff?.points || 0;
    const rank = user?.staff?.rank || 'member';
    const consistency = user?.staff?.consistency || 100;
    const completedShifts = shifts.filter(s => s.endTime).length;
    const totalShiftHrs = shifts.filter(s => s.endTime).reduce((sum, s) => sum + (s.duration || (new Date(s.endTime) - new Date(s.startTime)) / 3600000), 0);
    const consBar = '�'.repeat(Math.round(consistency / 10)) + '�'.repeat(10 - Math.round(consistency / 10));

    const embed = createEnterpriseEmbed()
      .setTitle(`?? Interactive Summary � ${target.username}`)
      
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: '??? Rank', value: rank.toUpperCase(), inline: true },
        { name: '? Points', value: pts.toString(), inline: true },
        { name: '?? Achievements', value: (user?.staff?.achievements?.length || 0).toString(), inline: true },
        { name: '?? Consistency', value: `\`${consBar}\` ${consistency}%` },
        { name: '?? Shifts (30d)', value: completedShifts.toString(), inline: true },
        { name: '?? Shift Hours (30d)', value: totalShiftHrs.toFixed(1), inline: true },
        { name: '? Actions (30d)', value: recentActs.toString(), inline: true }
      )
      
      ;

    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_interactive_summary').setLabel('�� Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};







