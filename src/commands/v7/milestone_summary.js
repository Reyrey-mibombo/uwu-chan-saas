const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const MILESTONES = [
  { label: '👥 50 Members', type: 'members', target: 50 },
  { label: '👥 100 Members', type: 'members', target: 100 },
  { label: '👥 500 Members', type: 'members', target: 500 },
  { label: '⚡ 1,000 Commands', type: 'commands', target: 1000 },
  { label: '⚡ 10,000 Commands', type: 'commands', target: 10000 },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('milestone_summary')
    .setDescription('View server milestone progress'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const { Guild } = require('../../database/mongo');

    const [guild, discordGuild] = await Promise.all([
      Guild.findOne({ guildId }).lean(),
      interaction.guild
    ]);

    const memberCount = discordGuild.memberCount;
    const commandsUsed = guild?.stats?.commandsUsed || 0;

    const getValue = (type) => {
      if (type === 'members') return memberCount;
      if (type === 'commands') return commandsUsed;
      return 0;
    };

    const fields = MILESTONES.map(m => {
      const current = getValue(m.type);
      const progress = Math.min(100, Math.round((current / m.target) * 100));
      const bar = '▓'.repeat(Math.round(progress / 10)) + '░'.repeat(10 - Math.round(progress / 10));
      const status = current >= m.target ? '✅ Achieved!' : `${current}/${m.target}`;
      return {
        name: `${current >= m.target ? '✅' : '🎯'} ${m.label}`,
        value: `\`${bar}\` **${progress}%** — ${status}`,
        inline: false
      };
    });

    const nextMilestone = MILESTONES.find(m => getValue(m.type) < m.target);

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('🎯 Server Milestone Progress')
      
      .setThumbnail(interaction.guild.iconURL())
      .addFields(
        { name: '👥 Current Members', value: memberCount.toString(), inline: true },
        { name: '⚡ Commands Used', value: commandsUsed.toString(), inline: true },
        { name: '🎯 Next Milestone', value: nextMilestone?.label || '🏆 All achieved!', inline: true },
        ...fields
      )
      
      ;

    await interaction.editReply({ embeds: [embed] });
  }
};
