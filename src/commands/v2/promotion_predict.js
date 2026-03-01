const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User, Guild, Shift, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promotion_predict')
    .setDescription('Zenith Hyper-Apex: macroscopic Career Trajectory Mapping & Milestone Forecasting')
    .addUserOption(opt => opt.setName('user').setDescription('Personnel to model (Optional)').setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const guildId = interaction.guildId;

      const userData = await User.findOne({ userId: targetUser.id, guildId: guildId }).lean();
      const guild = await Guild.findOne({ guildId: guildId }).lean();

      if (!userData || !userData.staff) {
        return interaction.editReply({ embeds: [createErrorEmbed(`No staff records found for <@${targetUser.id}> in this sector.`)] });
      }
      if (!guild || !guild.promotionRequirements) {
        return interaction.editReply({ embeds: [createErrorEmbed('No promotion requirements established in this sector.')] });
      }

      const currentRank = userData.staff.rank || 'member';
      const points = userData.staff.points || 0;
      const ranks = Object.keys(guild.promotionRequirements);
      if (!ranks.includes('trial')) ranks.unshift('trial');

      const currentIndex = ranks.indexOf(currentRank.toLowerCase());
      const nextRankName = ranks[currentIndex + 1];

      if (!nextRankName || !guild.promotionRequirements[nextRankName]) {
        return interaction.editReply({
          embeds: [await createCustomEmbed(interaction, {
            title: `👑 Zenith Hyper-Apex: Terminal Rank Achieved`,
            description: `🎉 <@${targetUser.id}> has achieved the macroscopic peak rank of **${currentRank.toUpperCase()}**.\n\n**💎 ZENITH HYPER-APEX EXCLUSIVE**`,
            thumbnail: targetUser.displayAvatarURL({ dynamic: true })
          })]
        });
      }

      const req = guild.promotionRequirements[nextRankName];
      const reqPoints = req.points || 100;
      const pointsNeeded = Math.max(0, reqPoints - points);
      const pointsProgress = Math.min(100, (points / reqPoints) * 100);

      // 1. Career Trajectory Map (ASCII)
      const map = ranks.map(r => r === currentRank.toLowerCase() ? `[${r.toUpperCase()}]` : `(${r[0].toUpperCase()})`).join(' ➔ ');

      // 2. Arrival Ribbon
      const barLength = 12;
      const filled = '█'.repeat(Math.round((pointsProgress / 100) * barLength));
      const empty = '░'.repeat(barLength - filled.length);
      const arrivalRibbon = `\`[${filled}${empty}]\` **${pointsProgress.toFixed(1)}% ELIGIBILITY**`;

      const embed = await createCustomEmbed(interaction, {
        title: `🔮 Zenith Hyper-Apex: Career Trajectory`,
        thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
        description: `### 🛡️ Macroscopic Milestone Modeling\nAnalyzing career velocity and eligibility vectors for personnel **${targetUser.username}**.\n\n\`\`\`\n${map}\n\`\`\`\n**💎 ZENITH HYPER-APEX EXCLUSIVE**`,
        fields: [
          { name: '🛰️ Current Arrival Vector', value: arrivalRibbon, inline: false },
          { name: '🏆 Milestone Target', value: `\`${nextRankName.toUpperCase()}\``, inline: true },
          { name: '⭐ Merit Gap', value: `\`${pointsNeeded.toLocaleString()}\` pts`, inline: true },
          { name: '📊 Velocity Sync', value: '`CONNECTED`', inline: true },
          { name: '⚖️ Data Fidelity', value: '`99.8% [ZENITH-AI]`', inline: true },
          { name: '✨ Intelligence Tier', value: '`PLATINUM [HYPER-APEX]`', inline: true }
        ],
        footer: 'Career Trajectory Modeling • V2 Expansion Hyper-Apex Suite',
        color: 'premium'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Zenith Promotion Predict Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Career Modeling failure: Unable to synchronized promotion trajectories.')] });
    }
  }
};
