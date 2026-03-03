const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed, createErrorEmbed, createPremiumEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { Activity } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('advanced_logs')
    .setDescription('Scrutinize advanced algorithmic chronological tracking metrics for the server.')
    .addIntegerOption(option =>
      option.setName('limit')
        .setDescription('Number of logs to poll (Max 50)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(50)),

  async execute(interaction) {
    try {
      await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'premium');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }
      const guildId = interaction.guildId;
      const limit = interaction.options.getInteger('limit') || 20;

      const logs = await Activity.find({
        guildId, // Secure isolation parameter mapped strictly internally
        type: { $in: ['command', 'warning', 'message'] }
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      if (logs.length === 0) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v3_advanced_logs').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed('No activity vectors flagged natively in this server partition yet.')], components: [row] });
      }

      const logTypes = {
        command: '?? Command',
        warning: '?? Warning',
        message: '?? Message',
        shift: '? Patrol',
        promotion: '?? Promotion'
      };

      const logEntries = logs.map(log => {
        const type = logTypes[log.type] || log.type;
        const userStr = log.userId ? `<@${log.userId}>` : '`SYSTEM`';

        // Inject deep timestamps 
        const unixTime = Math.floor(new Date(log.createdAt).getTime() / 1000);

        let dataStr = '';
        if (log.data) {
          // Stringify inner meta safely truncating without throwing buffer exceptions
          const str = JSON.stringify(log.data).replace(/[{}]/g, '');
          dataStr = str.length > 40 ? `\n> *${str.substring(0, 40)}...*` : `\n> *${str}*`;
        }

        return `**${type}** ? ${userStr} (<t:${unixTime}:R>)${dataStr}`;
      });

      const commandCount = await Activity.countDocuments({ guildId, type: 'command' });
      const warningCount = await Activity.countDocuments({ guildId, type: 'warning' });

      const embed = await createCustomEmbed(interaction, {
        title: `?? Advanced Moderation Ledger`,
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        description: `Querying the **${logs.length}** most recent ledger chronologies inside **${interaction.guild.name}**.`,
        fields: [
          { name: '?? Security Ledger Matrix', value: logEntries.join('\n\n') || '*No records match limit index*', inline: false },
          { name: '? Lifetime Commands', value: `\`${commandCount}\` Invocations`, inline: true },
          { name: '?? Disciplinary Metrics', value: `\`${warningCount}\` Issued`, inline: true }
        ]
      });

      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v3_advanced_logs').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });

    } catch (error) {
      console.error('Advanced Logs Error:', error);
      const errEmbed = createErrorEmbed('A backend query error occurred reading the chronological ledger.');
            if (interaction.deferred || interaction.replied) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v3_advanced_logs').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            return await interaction.editReply({ embeds: [errEmbed], components: [row] });
      } else {
        await interaction.editReply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};


