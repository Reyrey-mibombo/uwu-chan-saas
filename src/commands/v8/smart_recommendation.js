const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEnterpriseEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { User } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('smart_recommendation')
    .setDescription('Smart AI-based staff recommendation for any task')
    .addStringOption(opt => opt.setName('task').setDescription('Task description').setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'enterprise');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }
    const taskDesc = interaction.options.getString('task') || 'general task';
    const users = await User.find({ 'staff.points': { $gt: 0 } }).sort({ 'staff.points': -1, 'staff.consistency': -1 }).limit(5).lean();
    if (!users.length) return interaction.editReply('?? No staff data yet.');
    const top = users[0];
    const rankEmojis = { owner: '??', admin: '??', manager: '??', senior: '??', staff: '?', trial: '??', member: '??' };
    const alt = users.slice(1, 3).map(u => `� **${u.username || '?'}** (${u.staff?.rank || 'member'}) � ${u.staff?.points || 0} pts`).join('\n');
    const embed = createEnterpriseEmbed()
      .setTitle('?? Smart Staff Recommendation')
      
      .setThumbnail(interaction.guild.iconURL())
      .addFields(
        { name: '?? Task', value: taskDesc, inline: false },
        { name: '?? Top Recommendation', value: `**${top.username || '?'}** ${rankEmojis[top.staff?.rank] || ''}\n? ${top.staff?.points || 0} pts | ?? ${top.staff?.consistency || 100}% consistency | ?? ${top.staff?.reputation || 0} rep` },
        { name: '?? Alternatives', value: alt || 'No alternatives.' }
      )
      
      ;
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_smart_recommendation').setLabel('�� Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};







