const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promotion_requirements')
    .setDescription('View promotion requirements'),

  async execute(interaction) {
    const ranks = [
      { name: 'Member', points: 0, consistency: 0, shifts: 0 },
      { name: 'Trial Staff', points: 100, consistency: 50, shifts: 10 },
      { name: 'Staff', points: 500, consistency: 70, shifts: 30 },
      { name: 'Moderator', points: 1000, consistency: 80, shifts: 60 },
      { name: 'Admin', points: 2500, consistency: 90, shifts: 100 },
      { name: 'Owner', points: 5000, consistency: 100, shifts: 200 }
    ];

    const embed = new EmbedBuilder()
      .setTitle('📋 Promotion Requirements')
      .setColor(0x9b59b6)
      .setDescription('Requirements for each rank level:')
      .addFields(
        { name: 'Rank', value: ranks.map(r => r.name).join('\n'), inline: true },
        { name: 'Points', value: ranks.map(r => r.points.toString()).join('\n'), inline: true },
        { name: 'Consistency', value: ranks.map(r => `${r.consistency}%`).join('\n'), inline: true }
      )
      .setFooter({ text: 'Earn points by completing shifts and tasks!' });

    await interaction.reply({ embeds: [embed] });
  }
};
