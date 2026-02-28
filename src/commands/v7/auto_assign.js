const { SlashCommandBuilder } = require('discord.js');
const { createEnterpriseEmbed } = require('../../utils/embeds');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auto_assign')
    .setDescription('View or configure auto-role assignment settings')
    .addRoleOption(opt => opt.setName('role').setDescription('Role to add to auto-assign list').setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const roleToAdd = interaction.options.getRole('role');

    let guild = await Guild.findOne({ guildId });

    if (roleToAdd) {
      if (!interaction.member.permissions.has('ManageRoles')) {
        return interaction.editReply('❌ You need **Manage Roles** permission to configure auto-assign.');
      }
      if (!guild) guild = new Guild({ guildId, name: interaction.guild.name });
      if (!guild.settings.autoRoles) guild.settings.autoRoles = [];
      if (!guild.settings.autoRoles.includes(roleToAdd.id)) {
        guild.settings.autoRoles.push(roleToAdd.id);
        await guild.save();
      }
    }

    const currentRoles = guild?.settings?.autoRoles || [];
    const roleList = currentRoles.length
      ? currentRoles.map(id => `<@&${id}>`).join(', ')
      : 'No auto-assign roles configured.';

    const embed = createEnterpriseEmbed()
      .setTitle('⚙️ Auto-Assign Role Configuration')
      
      .addFields(
        { name: '📋 Auto-Assign Roles', value: roleList },
        { name: '✅ Status', value: currentRoles.length > 0 ? `Active — ${currentRoles.length} role(s)` : 'Inactive', inline: true },
        { name: '📌 How it works', value: 'Listed roles are automatically assigned to new members when they join.' }
      )
      
      ;

    await interaction.editReply({ embeds: [embed] });
  }
};



