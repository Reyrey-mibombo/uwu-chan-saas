const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank_animation')
    .setDescription('View rank promotion animation')
    .addUserOption(opt => opt.setName('user').setDescription('User to view (optional)')),
  async execute(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guild.id;

    const user = await User.findOne({ userId: targetUser.id });
    const rank = user?.staff?.rank || 'member';
    const points = user?.staff?.points || 0;
    const reputation = user?.staff?.reputation || 0;
    const achievements = user?.staff?.achievements || [];

    const rankColors = {
      member: 0x808080,
      trial: 0x3498db,
      staff: 0x2ecc71,
      senior: 0x9b59b6,
      lead: 0xe74c3c,
      admin: 0xffd700
    };

    const color = rankColors[rank] || 0x808080;

    const animationFrames = [
      '⬜⬜⬜⬜⬜⬜⬜⬜⬜',
      '▫️⬜⬜⬜⬜⬜⬜⬜⬜',
      '▫️▫️⬜⬜⬜⬜⬜⬜⬜',
      '▫️▫️▫️⬜⬜⬜⬜⬜⬜',
      '▫️▫️▫️▫️⬜⬜⬜⬜⬜',
      '▫️▫️▫️▫️▫️⬜⬜⬜⬜',
      '▫️▫️▫️▫️️⬜▫️▫⬜⬜',
      '▫️▫️▫️▫️▫️▫️▫️⬜⬜',
      '▫️▫️▫️▫️▫️▫️▫️▫️⬜',
      '🟪🟪🟪🟪🟪🟪🟪🟪🟪'
    ];

    const embed = new EmbedBuilder()
      .setTitle('🎬 Rank Animation')
      .setColor(color)
      .setDescription(`**${targetUser.username}**'s rank progression`)
      .addFields(
        { name: 'Current Rank', value: rank.toUpperCase(), inline: true },
        { name: 'Points', value: `${points}`, inline: true },
        { name: 'Reputation', value: `${reputation}`, inline: true }
      );

    if (achievements.length > 0) {
      embed.addFields({ name: 'Achievements', value: achievements.slice(0, 5).join(', '), inline: false });
    }

    const animationText = animationFrames.map((frame, i) => `Frame ${i + 1}: ${frame}`).join('\n');
    embed.addFields({ name: 'Animation Preview', value: `\`\`\`\n${animationText}\n\`\`\``, inline: false });

    await interaction.reply({ embeds: [embed] });
  }
};
