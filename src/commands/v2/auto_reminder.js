const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auto_reminder')
    .setDescription('Set up automatic reminders for tasks')
    .addSubcommand(sub => sub.setName('add').setDescription('Add a reminder').addStringOption(opt => opt.setName('message').setDescription('Reminder message').setRequired(true)).addIntegerOption(opt => opt.setName('hours').setDescription('Hours between reminders').setRequired(true)))
    .addSubcommand(sub => sub.setName('list').setDescription('List your reminders'))
    .addSubcommand(sub => sub.setName('remove').setDescription('Remove a reminder').addIntegerOption(opt => opt.setName('index').setDescription('Reminder index').setRequired(true))),
  
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    
    const guildData = await Guild.findOne({ guildId: interaction.guild.id }) || new Guild({ guildId: interaction.guild.id });
    if (!guildData.reminders) guildData.reminders = [];
    
    if (subcommand === 'add') {
      const message = interaction.options.getString('message');
      const hours = interaction.options.getInteger('hours');
      
      guildData.reminders.push({ userId, message, hours, createdAt: new Date() });
      await guildData.save();
      
      return interaction.reply({ content: `✅ Reminder set: "${message}" every ${hours} hours`, ephemeral: true });
    }
    
    if (subcommand === 'list') {
      const userReminders = guildData.reminders.filter(r => r.userId === userId);
      
      if (userReminders.length === 0) {
        return interaction.reply({ content: 'No reminders set', ephemeral: true });
      }
      
      const list = userReminders.map((r, i) => `${i + 1}. "${r.message}" - every ${r.hours}h`).join('\n');
      
      const embed = new EmbedBuilder()
        .setTitle('⏰ Your Reminders')
        .setDescription(list)
        .setColor('#3498db');
      
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
    if (subcommand === 'remove') {
      const index = interaction.options.getInteger('index') - 1;
      
      if (index < 0 || index >= guildData.reminders.length) {
        return interaction.reply({ content: 'Invalid reminder index', ephemeral: true });
      }
      
      guildData.reminders.splice(index, 1);
      await guildData.save();
      
      return interaction.reply({ content: '✅ Reminder removed', ephemeral: true });
    }
  }
};
