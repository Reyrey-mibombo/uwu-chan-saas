const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEnterpriseEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('growth_visuals')
    .setDescription('Visual server growth metrics and trends'),

  async execute(interaction, client) {
    await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'enterprise');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }
    const guildId = interaction.guildId;
    const { Guild, Activity } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
    const [guild, acts] = await Promise.all([
      Guild.findOne({ guildId }).lean(),
      Activity.find({ guildId, createdAt: { $gte: new Date(Date.now() - 30 * 86400000) } }).lean()
    ]);

    const memberCount = interaction.guild.memberCount;
    const joined = guild?.stats?.membersJoined || 0;
    const messages = guild?.stats?.messagesProcessed || 0;
    const commands = guild?.stats?.commandsUsed || 0;

    const growth = joined > 0 ? Math.round((joined / Math.max(memberCount, 1)) * 100) : 0;
    const engRate = Math.round(([...new Set(acts.map(a => a.userId))].length / Math.max(memberCount, 1)) * 100);
    const gBar = '�'.repeat(Math.round(growth / 10)) + '�'.repeat(10 - Math.round(growth / 10));
    const eBar = '�'.repeat(Math.round(engRate / 10)) + '�'.repeat(10 - Math.round(engRate / 10));

    const embed = createEnterpriseEmbed()
      .setTitle('?? Growth Visuals')
      
      .setThumbnail(interaction.guild.iconURL())
      .addFields(
        { name: '?? Total Members', value: memberCount.toString(), inline: true },
        { name: '?? Members Joined (Tracked)', value: joined.toString(), inline: true },
        { name: '?? Messages Processed', value: messages.toString(), inline: true },
        { name: '? Commands Used', value: commands.toString(), inline: true },
        { name: '?? Growth Rate', value: `\`${gBar}\` ${growth}%` },
        { name: '?? Engagement Rate (30d)', value: `\`${eBar}\` ${engRate}%` }
      )
      
      ;

    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_growth_visuals').setLabel('�� Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};







