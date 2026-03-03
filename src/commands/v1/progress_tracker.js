const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createErrorEmbed, createCustomEmbed } = require('../../utils/embeds');
const { User } = require('../../database/mongo');

const RANK_THRESHOLDS = { trial: 0, staff: 100, senior: 300, manager: 600, admin: 1000, owner: 2000 };
const RANK_ORDER = ['trial', 'staff', 'senior', 'manager', 'admin', 'owner'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('progress_tracker')
    .setDescription('Track your progress toward the next rank')
    .addUserOption(opt => opt.setName('user').setDescription('User to track').setRequired(false)),

  async execute(interaction, client) {
    try {
      await interaction.deferReply();
      const target = interaction.options.getUser('user') || interaction.user;
      const user = await User.findOne({ userId: target.id, 'guilds.guildId': interaction.guildId }).lean();

      if (!user || !user.staff) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v1_progress_tracker').setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary));
        return await interaction.editReply({ embeds: [createErrorEmbed(`No staff data found for **${target.username}**. They need to start a shift first!`)], components: [row] });
      }

      const points = user.staff?.points || 0;
      const consistency = user.staff?.consistency || 100;
      const rank = user.staff?.rank || 'trial';
      const rankIdx = RANK_ORDER.indexOf(rank);
      const nextRank = RANK_ORDER[rankIdx + 1];

      if (!nextRank) {
        const embed = await createCustomEmbed(interaction, {
          title: `🏆 MAXIMUM RANK REACHED: ${target.username}`,
          thumbnail: target.displayAvatarURL({ dynamic: true }),
          description: `🎉 **Congratulations!** You have reached the highest rank in this server!`,
          fields: [
            { name: '👑 Current Rank', value: `\`${rank.toUpperCase()}\``, inline: true },
            { name: '💰 Lifetime Points', value: `\`${points.toLocaleString()}\``, inline: true },
            { name: '⭐ Achievements', value: `\`${user.staff?.achievements?.length || 0}\` badges earned`, inline: true }
          ],
          color: 'premium'
        });
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v1_progress_tracker').setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary));
        return await interaction.editReply({ embeds: [embed], components: [row] });
      }

      const currentThreshold = RANK_THRESHOLDS[rank] || 0;
      const nextThreshold = RANK_THRESHOLDS[nextRank];
      const progress = Math.min(100, Math.round(((points - currentThreshold) / (nextThreshold - currentThreshold)) * 100));
      const needed = Math.max(0, nextThreshold - points);
      const barFilled = Math.min(10, Math.round(progress / 10));
      const bar = '█'.repeat(barFilled) + '░'.repeat(10 - barFilled);

      const daysEstimate = Math.ceil(needed / 10);
      const hoursEstimate = Math.ceil(needed / 2);

      const embed = await createCustomEmbed(interaction, {
        title: `📈 Rank Progress: ${target.username}`,
        thumbnail: target.displayAvatarURL({ dynamic: true }),
        description: `**Current:** \`${rank.toUpperCase()}\` → **Next:** \`${nextRank.toUpperCase()}\``,
        fields: [
          { name: '📊 Progress Bar', value: `\`${bar}\` **${progress}%**`, inline: false },
          { name: '💰 Points', value: `\`${points.toLocaleString()}\` / \`${nextThreshold.toLocaleString()}\``, inline: true },
          { name: '🎯 Points Needed', value: `\`${needed.toLocaleString()}\` more`, inline: true },
          { name: '⚡ Consistency', value: `\`${consistency}%\``, inline: true },
          { name: '🏅 Achievements', value: `\`${user.staff?.achievements?.length || 0}\``, inline: true },
          { name: '⏱️ Est. Time', value: needed <= 0 ? '✅ Ready!' : `~${daysEstimate} days or ~${hoursEstimate} hours`, inline: true }
        ],
        color: progress >= 75 ? 'success' : progress >= 50 ? 'warning' : 'primary'
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('auto_v1_progress_tracker').setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setLabel('🎯 Start Shift').setStyle(ButtonStyle.Success).setCustomId('shift_start_btn')
      );
      await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (error) {
      console.error(error);
      const errEmbed = createErrorEmbed('An error occurred while tracking progress.');
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v1_progress_tracker').setLabel('🔄 Retry').setStyle(ButtonStyle.Secondary));
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed], components: [row] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};


