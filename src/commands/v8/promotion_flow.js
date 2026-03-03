const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { createCustomEmbed, createEnterpriseEmbed, createErrorEmbed, createProgressBar, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { User, Guild, Shift, Warning } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

const RANK_ORDER = ['member', 'trial', 'staff', 'senior', 'manager', 'admin'];
const RANK_EMOJIS = { member: '??', trial: '??', staff: '?', senior: '??', manager: '??', admin: '??' };
const DEFAULT_THRESHOLDS = {
  trial: { points: 0, shifts: 0, consistency: 0, maxWarnings: 99 },
  staff: { points: 100, shifts: 5, consistency: 70, maxWarnings: 3 },
  senior: { points: 300, shifts: 10, consistency: 75, maxWarnings: 2 },
  manager: { points: 600, shifts: 20, consistency: 80, maxWarnings: 1 },
  admin: { points: 1000, shifts: 30, consistency: 85, maxWarnings: 0 }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promotion_flow')
    .setDescription('?? Visual rank progression path with real stats and next-promotion progress bars')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member to check').setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const license = await validatePremiumLicense(interaction, 'enterprise');
      if (!license.allowed) {
        return await interaction.editReply({ embeds: [license.embed], components: license.components });
      }

      const target = interaction.options.getUser('user') || interaction.user;
      const guildId = interaction.guildId;

      // Fetch real data
      const [user, guildData, shiftCount, warningCount] = await Promise.all([
        User.findOne({ userId: target.id }).lean(),
        Guild.findOne({ guildId }).lean(),
        Shift.countDocuments({ userId: target.id, guildId, endTime: { $ne: null } }),
        Warning.countDocuments({ userId: target.id, guildId })
      ]);

      const staff = user?.staff || {};
      const currentRank = staff.rank || 'member';
      const points = staff.points || 0;
      const consistency = staff.consistency || 0;
      const currentIdx = RANK_ORDER.indexOf(currentRank);

      // Merge custom guild thresholds with defaults
      const thresholds = { ...DEFAULT_THRESHOLDS, ...(guildData?.promotionRequirements || {}) };

      // Build the visual rank ladder
      const ladder = RANK_ORDER.map((rank, idx) => {
        const isCurrentRank = rank === currentRank;
        const isPast = idx < currentIdx;
        const isFuture = idx > currentIdx;
        const req = thresholds[rank] || {};

        let symbol;
        if (isPast) symbol = '?';
        else if (isCurrentRank) symbol = '??';
        else symbol = '?';

        const emoji = RANK_EMOJIS[rank] || '�';
        const label = `${symbol} ${emoji} **${rank.toUpperCase()}**`;

        if (isPast || rank === 'member') return `${label}`;

        // Show progress bar toward this rank
        const reqPts = req.points || 0;
        const pct = reqPts > 0 ? Math.min(100, Math.round((points / reqPts) * 100)) : 100;
        const bar = createProgressBar(pct, 10);

        if (isCurrentRank) {
          return `${label} ? *You are here*\n> \`${points.toLocaleString()} pts\` | \`${shiftCount}\` shifts | \`${consistency}%\` consistency`;
        }

        return `${label} (\`${reqPts.toLocaleString()} pts\` needed)\n> \`${bar}\` ${pct}%`;
      });

      // Next rank requirements
      const nextRank = RANK_ORDER[currentIdx + 1];
      const nextReq = nextRank ? (thresholds[nextRank] || {}) : null;
      let progressSection = '';

      if (nextReq && nextRank) {
        const reqPts = nextReq.points || 0;
        const reqShifts = nextReq.shifts || 0;
        const reqConsistency = nextReq.consistency || 0;
        const reqMaxWarns = nextReq.maxWarnings ?? 99;

        const meetsPoints = points >= reqPts;
        const meetsShifts = shiftCount >= reqShifts;
        const meetsConsistency = consistency >= reqConsistency;
        const meetsWarnings = warningCount <= reqMaxWarns;

        const all4Met = meetsPoints && meetsShifts && meetsConsistency && meetsWarnings;

        progressSection = [
          `${meetsPoints ? '??' : '??'} Points: \`${points.toLocaleString()} / ${reqPts.toLocaleString()}\``,
          `${meetsShifts ? '??' : '??'} Shifts: \`${shiftCount} / ${reqShifts}\``,
          `${meetsConsistency ? '??' : '??'} Consistency: \`${consistency}% / ${reqConsistency}%\``,
          `${meetsWarnings ? '??' : '??'} Warnings: \`${warningCount} / =${reqMaxWarns}\``,
          all4Met ? '\n? **All requirements met! Eligible for promotion!**' : ''
        ].filter(Boolean).join('\n');
      } else {
        progressSection = '?? **Maximum rank achieved!** You are at the top.';
      }

      const embed = await createCustomEmbed(interaction, {
        title: `?? Rank Progression � ${target.username}`,
        thumbnail: target.displayAvatarURL({ dynamic: true }),
        description: ladder.join('\n\n'),
        fields: [
          {
            name: `?? Progress ? ${nextRank ? nextRank.toUpperCase() : 'MAX'}`,
            value: progressSection,
            inline: false
          }
        ],
        color: currentRank === 'admin' ? '#f1c40f' : '#5865F2',
        footer: `uwu-chan � Promotion Flow � Auto-checks every 15min if automation is enabled`
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`promo_check_${target.id}`)
          .setLabel('?? Re-check Eligibility')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setLabel('?? See Requirements')
          .setStyle(ButtonStyle.Secondary)
          .setCustomId('show_promo_reqs')
      );

      await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (error) {
      console.error('[promotion_flow] Error:', error);
      const errEmbed = createErrorEmbed('Failed to load promotion flow.');
            if (interaction.deferred || interaction.replied) { return await interaction.editReply({ embeds: [errEmbed], components: [row] }); } else await interaction.editReply({ embeds: [errEmbed], ephemeral: true });
    }
  }
};



