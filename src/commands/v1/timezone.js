const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timezone')
    .setDescription('Set or view your timezone')
    .addStringOption(opt => opt.setName('timezone').setDescription('Your timezone (e.g., UTC, EST, PST)').setRequired(false)),
  
  async execute(interaction) {
    const timezone = interaction.options.getString('timezone');
    const userId = interaction.user.id;
    
    const guildData = await Guild.findOne({ guildId: interaction.guild.id }) || new Guild({ guildId: interaction.guild.id });
    if (!guildData.userSettings) guildData.userSettings = {};
    
    if (timezone) {
      guildData.userSettings[userId] = { ...guildData.userSettings[userId], timezone };
      await guildData.save();
      
      const embed = new EmbedBuilder()
        .setTitle('✅ Timezone Set')
        .setDescription(`Your timezone has been set to: **${timezone}**`)
        .setColor('#2ecc71');
      
      return interaction.reply({ embeds: [embed] });
    }
    
    const savedTimezone = guildData.userSettings[userId]?.timezone;
    
    const embed = new EmbedBuilder()
      .setTitle('🌍 Your Timezone')
      .setDescription(savedTimezone ? `**${savedTimezone}**` : 'Not set. Use `/timezone <zone>` to set it.')
      .setColor('#3498db');
    
    await interaction.reply({ embeds: [embed] });
  }
};
