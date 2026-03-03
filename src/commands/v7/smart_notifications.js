const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEnterpriseEmbed } = require('../../utils/enhancedEmbeds');
const { Guild } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('smart_notifications')
    .setDescription('View smart notification configuration for your server'),

  async execute(interaction, client) {
    await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'enterprise');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }
    const guildId = interaction.guildId;
    const guild = await Guild.findOne({ guildId }).lean();
    const modules = guild?.settings?.modules || {};

    const notifConfig = [
      { name: '?? Activity Drop Alert', active: !!modules.analytics, desc: 'Fires when weekly activity drops >20%' },
      { name: '?? Promotion Ready', active: !!modules.automation, desc: 'Fires when staff hits rank threshold' },
      { name: '? Stuck Shift Alert', active: !!modules.moderation, desc: 'Fires when a shift is open 8+ hours' },
      { name: '?? Warning Spike', active: !!modules.moderation, desc: 'Fires when warnings spike vs last week' },
    ];

    const fields = notifConfig.map(n => ({
      name: `${n.active ? '?' : '?'} ${n.name}`,
      value: n.desc,
      inline: true
    }));

    const logChannel = guild?.settings?.logChannel ? `<#${guild.settings.logChannel}>` : 'Not Set';

    const embed = createEnterpriseEmbed()
      .setTitle('?? Smart Notification Config')
      
      .addFields(
        { name: '?? Log Channel', value: logChannel, inline: true },
        { name: '? Active Notifications', value: notifConfig.filter(n => n.active).length.toString(), inline: true },
        ...fields
      )
      
      ;

    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_smart_notifications').setLabel('�� Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};





