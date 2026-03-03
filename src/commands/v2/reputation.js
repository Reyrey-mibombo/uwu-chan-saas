const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reputation')
    .setDescription('Check reputation standing')
    .addUserOption(opt => opt.setName('user').setDescription('User to check (Optional)').setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser('user') || interaction.user;

      const user = await User.findOne({ userId: targetUser.id, 'guilds.guildId': interaction.guildId }).lean();

      if (!user || !user.staff) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_reputation').setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary));
        return await interaction.editReply({ embeds: [createErrorEmbed('No staff data found for this user.')], components: [row] });
      }

      const rep = user.staff?.reputation || 0;
      const rank = user.staff?.rank || 'member';

      let tier = 'Neutral';
      let tierEmoji = '⚪';
      if (rep >= 1000) { tier = 'Legendary'; tierEmoji = '👑'; }
      else if (rep >= 500) { tier = 'Platinum'; tierEmoji = '💎'; }
      else if (rep >= 250) { tier = 'Gold'; tierEmoji = '🥇'; }
      else if (rep >= 100) { tier = 'Silver'; tierEmoji = '🥈'; }
      else if (rep >= 50) { tier = 'Bronze'; tierEmoji = '🥉'; }

      const embed = await createCustomEmbed(interaction, {
        title: `${tierEmoji} Reputation: ${targetUser.username}`,
        thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
        description: `Reputation in **${interaction.guild.name}**`,
        fields: [
          { name: '⭐ Reputation Points', value: `\`${rep.toLocaleString()}\``, inline: true },
          { name: '🏆 Tier', value: `${tierEmoji} \`${tier}\``, inline: true },
          { name: '⭐ Rank', value: `\`${rank.toUpperCase()}\``, inline: true }
        ],
        color: rep >= 100 ? 'premium' : 'primary'
      });

      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_reputation').setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary));
      await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (error) {
      console.error('Reputation Error:', error);
      const errEmbed = createErrorEmbed('Failed to load reputation data.');
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_reputation').setLabel('🔄 Retry').setStyle(ButtonStyle.Secondary));
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed], components: [row] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};

