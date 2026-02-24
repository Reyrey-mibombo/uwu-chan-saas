const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set_rank_roles')
    .setDescription('[Free] Set custom roles for each promotion rank')
    .addStringOption(opt => opt.setName('rank').setDescription('Which rank').setRequired(true)
      .addChoices(
        { name: 'Trial → Staff', value: 'staff' },
        { name: 'Senior', value: 'senior' },
        { name: 'Manager', value: 'manager' },
        { name: 'Admin', value: 'admin' }
      ))
    .addRoleOption(opt => opt.setName('role').setDescription('The Discord role for this rank').setRequired(true)),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });
    
    const guildId = interaction.guildId;
    const rank = interaction.options.getString('rank');
    const role = interaction.options.getRole('role');

    let guildData = await Guild.findOne({ guildId });
    if (!guildData) {
      guildData = new Guild({ guildId, name: interaction.guild.name });
    }

    if (!guildData.rankRoles) {
      guildData.rankRoles = {};
    }

    guildData.rankRoles[rank] = role.id;
    await guildData.save();

    const rankNames = {
      staff: 'Staff',
      senior: 'Senior',
      manager: 'Manager',
      admin: 'Admin'
    };

    const embed = new EmbedBuilder()
      .setTitle('✅ Rank Role Updated')
      .setColor(0x2ecc71)
      .setDescription(`When users promote to **${rankNames[rank]}**, they will get the role: **${role.name}**`)
      .addFields(
        { name: '📌 Rank', value: rankNames[rank], inline: true },
        { name: '🎭 Role', value: role.name, inline: true }
      )
      .setFooter({ text: 'Use /view_rank_roles to see all configured roles' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
