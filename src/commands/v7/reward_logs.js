const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEnterpriseEmbed } = require('../../utils/enhancedEmbeds');
const { Activity } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reward_logs')
    .setDescription('View a log of rewards and bonuses awarded recently')
    .addIntegerOption(opt => opt.setName('limit').setDescription('Number of entries').setRequired(false).setMinValue(1).setMaxValue(20)),

  async execute(interaction, client) {
    await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'enterprise');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }
    const guildId = interaction.guildId;
    const limit = interaction.options.getInteger('limit') || 10;

    const rewards = await Activity.find({ guildId, type: 'promotion' })
      .sort({ createdAt: -1 }).limit(limit).lean();

    if (!rewards.length) {
      return interaction.editReply('?? No reward events found yet.');
    }

    const logLines = rewards.map((r, i) => {
      const ts = Math.floor(new Date(r.createdAt).getTime() / 1000);
      const pts = r.data?.bonusPoints || 'N/A';
      return `\`${String(i + 1).padStart(2)}\` ?? <@${r.userId}> � +${pts} pts � <t:${ts}:R>`;
    }).join('\n');

    const embed = createEnterpriseEmbed()
      .setTitle('?? Recent Reward Log')
      
      .addFields(
        { name: '?? Showing', value: `Last ${rewards.length} reward events`, inline: true },
        { name: '?? Log', value: logLines }
      )
      
      ;

    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_reward_logs').setLabel('�� Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};





