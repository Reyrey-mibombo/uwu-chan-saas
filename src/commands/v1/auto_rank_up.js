const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCoolEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User } = require('../../database/mongo');

const RANK_ORDER = ['trial', 'staff', 'senior', 'manager', 'admin', 'owner'];
const RANK_THRESHOLDS = { trial: 0, staff: 100, senior: 300, manager: 600, admin: 1000, owner: 2000 };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auto_rank_up')
    .setDescription('Show all staff who qualify for an automatic rank-up'),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const users = await User.find({ 'staff.points': { $gt: 0 } }).lean();

      if (!users || !users.length) {
        return interaction.editReply({ embeds: [createErrorEmbed('No staff data available yet.')] });
      }

      const eligible = users
        .map(u => {
          const currentRank = u.staff?.rank || 'trial';
          const points = u.staff?.points || 0;
          const currentIdx = RANK_ORDER.indexOf(currentRank);
          const nextRank = RANK_ORDER[currentIdx + 1];
          if (!nextRank) return null;
          const threshold = RANK_THRESHOLDS[nextRank];
          if (points >= threshold) return { userId: u.userId, username: u.username || 'Unknown', currentRank, nextRank, points, threshold };
          return null;
        })
        .filter(Boolean)
        .sort((a, b) => b.points - a.points);

      if (!eligible.length) {
        return interaction.editReply({ content: '📊 No staff currently qualify for an automatic rank-up. Keep earning points!', ephemeral: true });
      }

      const listText = eligible.map((e, i) =>
        `\`${String(i + 1).padStart(2)}\` **${e.username}** — \`${e.currentRank.toUpperCase()}\` → **\`${e.nextRank.toUpperCase()}\`** (${e.points}/${e.threshold} pts ✅)`
      ).join('\n');

      const embed = createCoolEmbed()
        .setTitle('⬆️ Automatic Rank-Up Eligible Staff')
        .setDescription(listText)
        .addFields(
          { name: '✅ Eligible Count', value: eligible.length.toString(), inline: true },
          { name: '📌 Next Step', value: 'Click the button below to **approve** all promotions instantly!', inline: true }
        )
        .setColor('success');

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('approve_all_promotions')
          .setLabel(`Approve All ${eligible.length} Promotions`)
          .setStyle(ButtonStyle.Success)
          .setEmoji('🎉')
      );

      await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (error) {
      console.error(error);
      const errEmbed = createErrorEmbed('An error occurred while checking eligible staff.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  },

  async handleApproveAll(interaction, client) {
    try {
      await interaction.deferUpdate();
      if (!interaction.member.permissions.has('ModerateMembers') && !interaction.member.permissions.has('ManageGuild')) {
        return interaction.followUp({ embeds: [createErrorEmbed('You do not have permission to approve promotions.')], ephemeral: true });
      }

      const users = await User.find({ 'staff.points': { $gt: 0 } }).lean();
      let promotedCount = 0;

      for (const u of users) {
        const currentRank = u.staff?.rank || 'trial';
        const points = u.staff?.points || 0;
        const currentIdx = RANK_ORDER.indexOf(currentRank);
        const nextRank = RANK_ORDER[currentIdx + 1];
        if (!nextRank) continue;
        const threshold = RANK_THRESHOLDS[nextRank];

        if (points >= threshold) {
          await User.findOneAndUpdate({ userId: u.userId }, { 'staff.rank': nextRank });
          promotedCount++;
        }
      }

      if (promotedCount === 0) {
        return interaction.followUp({ embeds: [createErrorEmbed('No staff were eligible for promotion.')], ephemeral: true });
      }

      const embed = createCoolEmbed()
        .setTitle('✅ Mass Promotion Successful')
        .setDescription(`Successfully promoted **${promotedCount}** eligible staff members to their next ranks!`)
        .setColor('success');

      // Disable the button after use
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('approve_all_promotions')
          .setLabel(`Approved ${promotedCount} Staff`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );

      await interaction.editReply({ embeds: [embed], components: [disabledRow] });
    } catch (error) {
      console.error(error);
      await interaction.followUp({ content: '❌ An error occurred while mass approving promotions.', ephemeral: true });
    }
  }
};
