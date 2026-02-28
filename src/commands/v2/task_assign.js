const { SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed } = require('../../utils/embeds');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('task_assign')
    .setDescription('Assign tasks to staff members')
    .addSubcommand(sub => sub.setName('add').setDescription('Add a task').addUserOption(opt => opt.setName('user').setDescription('Assign to').setRequired(true)).addStringOption(opt => opt.setName('task').setDescription('Task description').setRequired(true)))
    .addSubcommand(sub => sub.setName('list').setDescription('List all tasks'))
    .addSubcommand(sub => sub.setName('complete').setDescription('Mark task as complete').addIntegerOption(opt => opt.setName('task_id').setDescription('Task ID').setRequired(true))),
  
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    const guildData = await Guild.findOne({ guildId: interaction.guild.id }) || new Guild({ guildId: interaction.guild.id });
    if (!guildData.tasks) guildData.tasks = [];
    
    if (subcommand === 'add') {
      const user = interaction.options.getUser('user');
      const task = interaction.options.getString('task');
      
      const taskId = guildData.tasks.length + 1;
      guildData.tasks.push({ id: taskId, userId: user.id, task, createdBy: interaction.user.id, status: 'pending', createdAt: new Date() });
      await guildData.save();
      
      return interaction.reply({ content: `✅ Task assigned to ${user.tag}: "${task}"`, ephemeral: true });
    }
    
    if (subcommand === 'list') {
      const tasks = guildData.tasks.filter(t => t.status === 'pending');
      
      if (tasks.length === 0) {
        return interaction.reply({ content: 'No pending tasks', ephemeral: true });
      }
      
      const list = await Promise.all(tasks.map(async t => {
        const user = await interaction.client.users.fetch(t.userId).catch(() => null);
        return `**#** - ${t.task${t.id}} (Assigned to: ${user?.username || 'Unknown'})`;
      }));
      
      const embed = createCoolEmbed()
        .setTitle('📋 Pending Tasks')
        .setDescription(list.join('\n'))
        ;
      
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
    if (subcommand === 'complete') {
      const taskId = interaction.options.getInteger('task_id');
      const task = guildData.tasks.find(t => t.id === taskId);
      
      if (!task) {
        return interaction.reply({ content: 'Task not found', ephemeral: true });
      }
      
      task.status = 'completed';
      task.completedAt = new Date();
      await guildData.save();
      
      return interaction.reply({ content: '✅ Task marked as complete!', ephemeral: true });
    }
  }
};



