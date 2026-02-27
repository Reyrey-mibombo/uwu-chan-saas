const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Shift } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_list')
    .setDescription('List all staff members in the server')
    .addIntegerOption(opt => opt.setName('page').setDescription('Page number').setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply();

    const users = await User.find({ 
      'staff.rank': { $ne: null, $exists: true }
    }).lean();

    if (!users.length) {
      return interaction.editReply('❌ No staff members found.');
    }

    const page = interaction.options.getInteger('page') || 1;
    const perPage = 10;
    const totalPages = Math.ceil(users.length / perPage);
    const start = (page - 1) * perPage;
    const staff = users.slice(start, start + perPage);

    const rankOrder = { admin: 1, manager: 2, senior: 3, staff: 4, trial: 5 };
    const sorted = staff
      .filter(u => u.staff?.rank)
      .sort((a, b) => (rankOrder[a.staff.rank] || 99) - (rankOrder[b.staff.rank] || 99));

    const list = sorted.map((u, i) => {
      const rank = u.staff?.rank || 'member';
      const points = u.staff?.points || 0;
      return `\`${String(start + i + 1).padStart(2)}\` **${u.username || 'Unknown'}** - ${rank} (${points} pts)`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('👥 Staff List')
      .setDescription(list || 'No staff found')
      
      
      ;

    await interaction.editReply({ embeds: [embed] });
  }
};
