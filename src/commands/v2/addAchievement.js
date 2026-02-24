const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add_achievement')
    .setDescription('[Premium] Award a specific staff achievement')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The staff member to award')
        .setRequired(true))
    .addStringOption(option =>
      option
        .setName('achievement')
        .setDescription('Specific achievement to award')
        .setRequired(true)
        .addChoices(
          // MONTHLY - 12 months
          { name: 'Staff of the Month – January', value: 'MONTHLY:Staff of the Month – January' },
          { name: 'Staff of the Month – February', value: 'MONTHLY:Staff of the Month – February' },
          { name: 'Staff of the Month – March', value: 'MONTHLY:Staff of the Month – March' },
          { name: 'Staff of the Month – April', value: 'MONTHLY:Staff of the Month – April' },
          { name: 'Staff of the Month – May', value: 'MONTHLY:Staff of the Month – May' },
          { name: 'Staff of the Month – June', value: 'MONTHLY:Staff of the Month – June' },
          { name: 'Staff of the Month – July', value: 'MONTHLY:Staff of the Month – July' },
          { name: 'Staff of the Month – August', value: 'MONTHLY:Staff of the Month – August' },
          { name: 'Staff of the Month – September', value: 'MONTHLY:Staff of the Month – September' },
          { name: 'Staff of the Month – October', value: 'MONTHLY:Staff of the Month – October' },
          { name: 'Staff of the Month – November', value: 'MONTHLY:Staff of the Month – November' },
          { name: 'Staff of the Month – December', value: 'MONTHLY:Staff of the Month – December' },

          // MODERATION
          { name: 'Exemplary Moderator', value: 'MOD:Exemplary Moderator' },
          { name: 'Rule Enforcer Elite', value: 'MOD:Rule Enforcer Elite' },
          { name: 'Peacekeeper', value: 'MOD:Peacekeeper' },
          { name: 'Spam Slayer', value: 'MOD:Spam Slayer' },
          { name: 'Conflict Resolver', value: 'MOD:Conflict Resolver' },

          // SUPPORT
          { name: 'Support Legend', value: 'SUPPORT:Support Legend' },
          { name: 'Ticket Master', value: 'SUPPORT:Ticket Master' },
          { name: 'Patience Champion', value: 'SUPPORT:Patience Champion' },
          { name: 'Welcome Wizard', value: 'SUPPORT:Welcome Wizard' },

          // ACTIVITY
          { name: 'Hyper Active Staff', value: 'ACTIVITY:Hyper Active Staff' },
          { name: 'Voice Chat Legend', value: 'ACTIVITY:Voice Chat Legend' },
          { name: 'Message Marathon', value: 'ACTIVITY:Message Marathon' },
          { name: 'Event Regular', value: 'ACTIVITY:Event Regular' }
        )),

  async execute(interaction) {
    try {
      const targetUser = interaction.options.getUser('user');
      const fullChoice = interaction.options.getString('achievement');
      const [category, title] = fullChoice.split(':', 2);
      
      // Simple response without database
      const embed = new EmbedBuilder()
        .setColor('#ffd700')
        .setTitle(`🏆 Achievement Awarded`)
        .setDescription(`**${title}** awarded to ${targetUser}`)
        .addFields(
          { name: 'Category', value: category, inline: true },
          { name: 'Awarded by', value: interaction.user.tag, inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error:', error);
      await interaction.reply({ 
        content: '❌ Failed to award achievement.', 
        ephemeral: true 
      });
    }
  }
};