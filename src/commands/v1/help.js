const { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, StringSelectMenuBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed, createTierEmbed } = require('../../utils/enhancedEmbeds');

const CATEGORIES = {
  general: {
    emoji: '⚙️',
    label: 'General Utilities',
    description: 'Core commands available to everyone',
    commands: [
      { name: '/ping', desc: 'System telemetry, latency & resource monitoring' },
      { name: '/help', desc: 'This help menu' },
      { name: '/server_status', desc: 'Real-time server statistics' },
      { name: '/invite_link', desc: 'Get the bot invite link' },
      { name: '/report_issue', desc: 'Report an issue to the developers' }
    ]
  },
  staff: {
    emoji: '👔',
    label: 'Staff & Shifts',
    description: 'Staff management and shift tracking',
    commands: [
      { name: '/shift_start', desc: 'Start your duty shift' },
      { name: '/shift_end', desc: 'End your current shift + earn points' },
      { name: '/staff_profile', desc: 'View staff profile with stats chart' },
      { name: '/leaderboard', desc: 'Real-time points leaderboard' },
      { name: '/promote', desc: 'Promote a staff member' },
      { name: '/demote', desc: 'Demote a staff member' },
      { name: '/staff_stats', desc: 'Detailed staff statistics' },
      { name: '/check_activity', desc: 'Deep-scan user presence & activity' }
    ]
  },
  analytics: {
    emoji: '📊',
    label: 'Analytics',
    description: 'Server and staff performance data',
    commands: [
      { name: '/activity_chart', desc: 'Visual activity trend chart' },
      { name: '/daily_summary', desc: 'Daily activity summary' },
      { name: '/monthly_summary', desc: 'Monthly performance summary' },
      { name: '/server_growth', desc: 'Server member growth stats' },
      { name: '/shift_leaderboard', desc: 'Top shift performers' }
    ]
  },
  moderation: {
    emoji: '🛡️',
    label: 'Moderation',
    description: 'Server moderation tools',
    commands: [
      { name: '/warn', desc: 'Issue a warning with severity & DM' },
      { name: '/case_file', desc: 'View a user\'s full case file' },
      { name: '/ticketSetup', desc: 'Configure the ticket system' },
      { name: '/ticketLogs', desc: 'View ticket history' }
    ]
  },
  premium: {
    emoji: '💎',
    label: 'Premium & Enterprise',
    description: 'Unlock advanced features',
    commands: [
      { name: '/buy', desc: 'View pricing and upgrade now' },
      { name: 'Premium (v3-v5)', desc: '29 commands: analytics, roles, automation' },
      { name: 'Enterprise (v6-v8)', desc: '102 commands: AI insights, visual dashboards, automation' }
    ]
  }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('📖 Interactive command directory • browse all available features')
    .addStringOption(opt =>
      opt.setName('command')
        .setDescription('Get details for a specific command')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply({ fetchReply: true });
      const commandName = interaction.options.getString('command');

      if (commandName) {
        const embed = createTierEmbed('free', {
          title: `Help: /${commandName}`,
          description: `Showing details for the \`${commandName}\` command.\nSome features require a higher license tier • use \`/buy\` to upgrade.`,
          footer: 'uwu-chan • Type /help to see all categories'
        });
        return interaction.editReply({ embeds: [embed], ephemeral: true });
      }

      const category = 'general';
      const embed = await buildCategoryEmbed(interaction, category);

      const selectRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('help_category_select')
          .setPlaceholder('📂 Browse a command category...')
          .addOptions(
            Object.entries(CATEGORIES).map(([key, cat]) => ({
              label: cat.label,
              description: cat.description,
              value: key,
              emoji: cat.emoji
            }))
          )
      );

      const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('👔 My Profile')
          .setCustomId('help_action_profile')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setLabel('📊 Live Stats')
          .setCustomId('help_action_stats')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setLabel('⭐ Upgrade')
          .setStyle(ButtonStyle.Link)
          .setURL('https://stratadashboard.vercel.app/pricing'),
        new ButtonBuilder()
          .setLabel('📡 Support')
          .setStyle(ButtonStyle.Link)
          .setURL('https://discord.gg/uwuchan')
      );

      const msg = await interaction.editReply({ embeds: [embed], components: [selectRow, buttonRow], fetchReply: true });

      const collector = msg.createMessageComponentCollector({ time: 120000 });
      collector.on('collect', async i => {
        if (i.user.id !== interaction.user.id) {
          return i.reply({ content: '❌ This menu is not for you.', ephemeral: true });
        }
        if (i.customId === 'help_category_select') {
          await i.deferUpdate();
          const newEmbed = await buildCategoryEmbed(interaction, i.values[0]);
          await i.editReply({ embeds: [newEmbed], components: [selectRow, buttonRow] });
        } else if (i.customId === 'help_action_profile') {
          const cmd = client.commands.get('staff_profile');
          if (cmd) await cmd.execute(i, client);
        } else if (i.customId === 'help_action_stats') {
          const cmd = client.commands.get('staff_stats');
          if (cmd) await cmd.execute(i, client);
        }
      });

      collector.on('end', () => {
        // Silently expire
        msg.edit({ components: [buttonRow] }).catch(() => { });
      });

    } catch (error) {
      console.error('[help] Error:', error);
      const errEmbed = createErrorEmbed('An error occurred while loading the help menu.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.editReply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};

async function buildCategoryEmbed(interaction, categoryKey) {
  const cat = CATEGORIES[categoryKey] || CATEGORIES.general;

  const commandList = cat.commands
    .map(c => `**${c.name}** • ${c.desc}`)
    .join('\n');

  return createCustomEmbed(interaction, {
    title: `${cat.emoji} ${cat.label}`,
    description: `${cat.description}\n\n${commandList}`,
    thumbnail: interaction.client.user?.displayAvatarURL(),
    fields: [
      { name: '📜 Commands Available', value: `\`${cat.commands.length}\` in this category`, inline: true },
      { name: '📁 Total Categories', value: `\`${Object.keys(CATEGORIES).length}\` categories`, inline: true }
    ],
    footer: `uwu-chan Help • Use /buy to unlock Premium & Enterprise`,
    color: 'primary'
  });
}
