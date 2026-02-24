const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { User, Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('view_applications')
    .setDescription('[Helper] View all helper applications')
    .addStringOption(opt => opt.setName('status').setDescription('Filter by status')
      .addChoices({ name: 'Pending', value: 'pending' }, { name: 'Accepted', value: 'accepted' }, { name: 'Denied', value: 'denied' }, { name: 'All', value: 'all' }))
    .addIntegerOption(opt => opt.setName('page').setDescription('Page number').setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply();

    const guildId = interaction.guildId;
    const statusFilter = interaction.options.getString('status') || 'all';
    const page = interaction.options.getInteger('page') || 1;

    const guild = await Guild.findOne({ guildId });
    if (!guild?.helperConfig?.enabled) {
      return interaction.editReply('❌ Helper system not configured.');
    }

    const staffRoleId = guild.helperConfig.staffRole;
    if (!interaction.member.roles.cache.has(staffRoleId) && !interaction.member.permissions.has('Administrator')) {
      return interaction.editReply('❌ Only staff can view applications.');
    }

    const users = await User.find({ 'helperApplications.guildId': guildId }).lean();
    
    let allApps = [];
    users.forEach(u => {
      if (u.helperApplications) {
        u.helperApplications.forEach(a => {
          allApps.push({ ...a, username: u.username });
        });
      }
    });

    if (statusFilter !== 'all') {
      allApps = allApps.filter(a => a.status === statusFilter);
    }

    allApps.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const perPage = 5;
    const totalPages = Math.ceil(allApps.length / perPage);
    const apps = allApps.slice((page - 1) * perPage, page * perPage);

    if (!allApps.length) {
      return interaction.editReply('📭 No applications found.');
    }

    const embed = new EmbedBuilder()
      .setTitle('📋 Helper Applications')
      .setColor(0x5865f2)
      .addFields(
        { name: '⏳ Pending', value: allApps.filter(a => a.status === 'pending').length.toString(), inline: true },
        { name: '✅ Accepted', value: allApps.filter(a => a.status === 'accepted').length.toString(), inline: true },
        { name: '❌ Denied', value: allApps.filter(a => a.status === 'denied').length.toString(), inline: true }
      )
      .setFooter({ text: `Page ${page}/${totalPages} • Total: ${allApps.length}` })
      .setTimestamp();

    for (const app of apps) {
      const statusEmoji = app.status === 'pending' ? '⏳' : app.status === 'accepted' ? '✅' : '❌';
      const statusColor = app.status === 'pending' ? 0xf39c12 : app.status === 'accepted' ? 0x2ecc71 : 0xe74c3c;

      embed.addFields({
        name: `${statusEmoji} ${app.username} - ${app.status.toUpperCase()}`,
        value: `ID: \`${app.id}\` • <t:${Math.floor(new Date(app.createdAt).getTime()/1000)}:R>`,
        inline: false
      });
    }

    await interaction.editReply({ embeds: [embed] });
  }
};
