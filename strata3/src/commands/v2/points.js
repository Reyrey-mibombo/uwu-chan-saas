const { SlashCommandBuilder } = require('@discordjs/builders');

// In-memory storage for points (replace with a database for persistence, e.g., MongoDB)
const userPoints = new Map();  // Key: userId, Value: points

module.exports = {
  data: new SlashCommandBuilder()
    .setName('points')
    .setDescription('Check or add points to users')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check or add points to')
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('add')
        .setDescription('Amount of points to add (admin only)')
        .setRequired(false)),

  async execute(interaction) {
    try {
      const targetUser = interaction.options.getUser('usew') || interaction.user;
      const addAmount = interaction.options.getInteger('add') || 0;
      const userId = targetUser.id;

      // Initialize points if not set
      if (!userPoints.has(userId)) {
        userPoints.set(userId, 0);
      }

      // Add points if specified (basic check: only if user is adding to themselves or has permission)
      if (addAmount > 0) {
        // Simple permission check (replace with role-based logic)
        if (interaction.user.id !== userId && !interaction.member.permissions.has('ADMINISTRATOR')) {
          return await interaction.reply({ content: 'Nyaa~ Onwy admins can add points to othews!', ephemeral: true });
        }
        userPoints.set(userId, userPoints.get(userId) + addAmount);
      }

      // Fixed data object (this resolves the syntax error from line 32)
      const data = {
        'points': userPoints.get(userId),  // <-- Fixed: Proper key-value pair instead of 'data.points',
        'userId': userId,
        'lastChecked': Date.now(),
      };

      // UwU-themed response
      const points = data.points;
      let response = `**${targetUser.username}** has **${points}** points! UwU`;
      if (addAmount > 0) {
        response += ` (+${addAmount} added!)`;
      }

      await interaction.reply({ content: response });
    } catch (error) {
      console.error('Error in points command:', error);
      await interaction.reply({ content: 'Oopsie! Something went wong with points. Twy again, nya~', ephemeral: true });
    }
  },
};