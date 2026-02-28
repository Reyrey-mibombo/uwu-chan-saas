const { SlashCommandBuilder } = require('discord.js');
const { createEnterpriseEmbed } = require('../../utils/embeds');

const WEEKLY_EVENTS = [
  { name: '⚡ Speed Challenge', desc: 'Complete 20 commands in one day', reward: '+30 bonus pts', active: true },
  { name: '🕐 Shift Marathon', desc: 'Log 10+ hours of shift time this week', reward: '+50 bonus pts', active: true },
  { name: '🏅 Consistency King', desc: 'Maintain 95%+ consistency all week', reward: '+25 bonus pts', active: true },
  { name: '🤝 Team Player', desc: 'Support 5 different team members', reward: 'Special badge', active: false },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('event_rewards')
    .setDescription('View this week\'s event rewards and challenges'),

  async execute(interaction, client) {
    await interaction.deferReply();

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const weekLabel = `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

    const fields = WEEKLY_EVENTS.map(e => ({
      name: `${e.active ? '🟢' : '🔴'} ${e.name}`,
      value: `${e.desc}\n💰 Reward: **${e.reward}** | Status: ${e.active ? '**Active**' : 'Inactive'}`,
      inline: false
    }));

    const embed = createEnterpriseEmbed()
      .setTitle(`🎉 Event Rewards — Week of ${weekLabel}`)
      
      .addFields(
        { name: '📅 Event Period', value: weekLabel, inline: true },
        { name: '🎁 Active Events', value: WEEKLY_EVENTS.filter(e => e.active).length.toString(), inline: true },
        ...fields
      )
      
      ;

    await interaction.editReply({ embeds: [embed] });
  }
};



