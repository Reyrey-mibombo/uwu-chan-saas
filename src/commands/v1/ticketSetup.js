const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed, createCustomEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { Ticket, Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketsetup')
    .setDescription('Setup the ticket system with Report Staff and Feedback buttons')
    .addChannelOption(opt => opt.setName('channel').setDescription('Channel to send ticket panel').setRequired(true))
    .addStringOption(opt => opt.setName('title').setDescription('Title for the ticket panel').setRequired(false))
    .setDefaultMemberPermissions(32n),

  async execute(interaction, client) {
    try {
      await interaction.deferReply({ fetchReply: true });
      const channel = interaction.options.getChannel('channel');
      const titleText = interaction.options.getString('title') || '🎫 Operational Support Interface';

      const embed = await createCustomEmbed(interaction, {
        title: titleText,
        description: 'Initialize a priority communication channel by selecting a category below:',
        fields: [
          { name: '🚨 Report Personnel', value: 'Formal report regarding staff conduct with evidence.', inline: false },
          { name: '💡 Feedback Hub', value: 'Submit operational feedback or systemic suggestions.', inline: false }
        ],
        thumbnail: interaction.guild.iconURL({ dynamic: true })
      });

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('ticket_report_staff')
            .setLabel('🚨 Report Personnel')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('ticket_feedback')
            .setLabel('💡 Feedback Hub')
            .setStyle(ButtonStyle.Primary)
        );

      await channel.send({ embeds: [embed], components: [row] });

      await Guild.findOneAndUpdate(
        { guildId: interaction.guildId },
        { $set: { 'settings.ticketChannel': channel.id } },
        { upsert: true }
      );

      const successEmbed = await createCustomEmbed(interaction, {
        title: '✅ Interface Deployment Successful',
        description: `Operational ticket panel has been successfully transmitted to <#${channel.id}>.`,
        color: 'success'
      });

      await interaction.editReply({ embeds: [successEmbed], ephemeral: true });
    } catch (error) {
      console.error(error);
      const errEmbed = createErrorEmbed('An error occurred during deployment. Verify bot permissions.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.editReply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};

module.exports.handleCreateTicketChannel = async (interaction, categoryType, client) => {
  try {
    await interaction.deferReply({ ephemeral: true });

    const guildDb = await Guild.findOne({ guildId: interaction.guildId }).lean();
    const tkConfig = guildDb?.settings?.modules?.tickets || {};

    if (!tkConfig.enabled) {
      return interaction.editReply({ embeds: [createErrorEmbed('The ticket system is currently disabled by the server administration.')] });
    }

    const ticketNum = Date.now().toString(36).toUpperCase().slice(-6);
    const channelName = `ticket-${interaction.user.username.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)}-${ticketNum}`;

    const openCount = await Ticket.countDocuments({ guildId: interaction.guildId, userId: interaction.user.id, status: { $in: ['open', 'claimed'] } });
    const maxOpen = tkConfig.maxOpenPerUser || 1;
    if (openCount >= maxOpen) {
      return interaction.editReply({ embeds: [createErrorEmbed(`You already have ${openCount} open tickets. Please close them first.`)] });
    }

    const permissionOverwrites = [
      {
        id: interaction.guild.id,
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: interaction.user.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
      },
      {
        id: client.user.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels]
      }
    ];

    if (tkConfig.supportRoleId) {
      const supportRole = interaction.guild.roles.cache.get(tkConfig.supportRoleId);
      if (supportRole) {
        permissionOverwrites.push({
          id: tkConfig.supportRoleId,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
        });
      }
    }

    const options = {
      name: channelName,
      type: 0,
      permissionOverwrites,
      reason: `Ticket created by ${interaction.user.tag}`
    };

    if (tkConfig.categoryId) {
      const category = interaction.guild.channels.cache.get(tkConfig.categoryId);
      if (category && category.type === 4) {
        options.parent = tkConfig.categoryId;
      }
    }

    const ticketChannel = await interaction.guild.channels.create(options);

    const ticket = new Ticket({
      guildId: interaction.guildId,
      channelId: ticketChannel.id,
      userId: interaction.user.id,
      username: interaction.user.tag,
      category: categoryType,
      status: 'open',
      createdAt: new Date()
    });

    await ticket.save();

    const embedTitle = categoryType === 'report_staff' ? '🚨 Personnel Report' : '💡 Feedback Hub';
    let welcomeMsg = tkConfig.openMessage || 'Support will be with you shortly. Please describe your issue.';
    welcomeMsg = welcomeMsg.replace(/{user}/g, `<@${interaction.user.id}>`);

    const welcomeEmbed = await createCustomEmbed(interaction, {
      title: embedTitle,
      description: welcomeMsg,
      fields: [
        { name: 'Ticket ID', value: `\`${ticketNum}\``, inline: true },
        { name: 'Created By', value: `<@${interaction.user.id}>`, inline: true }
      ],
      color: 'primary'
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket_close_${ticketChannel.id}`)
        .setLabel('🔒 Close Ticket')
        .setStyle(ButtonStyle.Danger)
    );

    const pingText = `<@${interaction.user.id}> ${tkConfig.supportRoleId ? `<@&${tkConfig.supportRoleId}>` : ''}`;
    const initialMsg = await ticketChannel.send({ content: pingText, embeds: [welcomeEmbed], components: [row] });

    ticket.messageId = initialMsg.id;
    await ticket.save();

    await interaction.editReply({ embeds: [createSuccessEmbed(`Your ticket has been created: <#${ticketChannel.id}>`)] });
  } catch (error) {
    console.error('[Tickets]', error);
    await interaction.editReply({ embeds: [createErrorEmbed('Failed to create ticket channel. Make sure the bot has `Manage Channels` permission.')] }).catch(() => { });
  }
};

module.exports.handleCloseTicket = async (interaction, client) => {
  try {
    await interaction.deferReply({ fetchReply: true });

    const channelId = interaction.channelId;

    const ticket = await Ticket.findOne({ guildId: interaction.guildId, channelId: channelId, status: { $in: ['open', 'claimed'] } });
    if (!ticket) {
      return interaction.editReply({ embeds: [createErrorEmbed('Could not find active ticket record in database. You can manually delete this channel.')] });
    }

    const guildDb = await Guild.findOne({ guildId: interaction.guildId }).lean();
    const tkConfig = guildDb?.settings?.modules?.tickets || {};

    const isOwner = interaction.user.id === ticket.userId;
    const hasSupportRole = tkConfig.supportRoleId && interaction.member.roles.cache.has(tkConfig.supportRoleId);
    const isMod = interaction.member.permissions.has(PermissionFlagsBits.ManageChannels) || interaction.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!isOwner && !hasSupportRole && !isMod) {
      return interaction.editReply({ embeds: [createErrorEmbed('You do not have permission to close this ticket. Require support role or Admin.')] });
    }

    ticket.status = 'closed';
    ticket.closedBy = interaction.user.id;
    ticket.closedByName = interaction.user.tag;
    ticket.closedAt = new Date();

    let transcriptContent = `Transcript for Ticket #${ticket._id.toString().slice(-6).toUpperCase()}\nCategory: ${ticket.category}\nOpened by: ${ticket.username}\nClosed by: ${interaction.user.tag}\n-----------------------------------\n\n`;

    try {
      const messages = await interaction.channel.messages.fetch({ limit: 100 });
      const sortedMessages = Array.from(messages.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);

      sortedMessages.forEach(m => {
        if (!m.author.bot || m.content) {
          transcriptContent += `[${new Date(m.createdTimestamp).toLocaleString()}] ${m.author.tag}: ${m.content}\n\n`;
        }
      });
    } catch (e) { console.error('Transcript fetch error', e); }

    await ticket.save();

    const { AttachmentBuilder } = require('discord.js');
    const buffer = Buffer.from(transcriptContent, 'utf-8');
    const attachment = new AttachmentBuilder(buffer, { name: `transcript-${ticket.channelId}.txt` });

    const reporter = await client.users.fetch(ticket.userId).catch(() => null);
    if (reporter) {
      try {
        const dmEmbed = await createCustomEmbed(interaction, {
          title: '🔒 Ticket Closed',
          description: `Your ticket has been closed by **${interaction.user.username}**.`,
          color: 'dark'
        });
        await reporter.send({ embeds: [dmEmbed], files: [attachment] });
      } catch (e) { }
    }

    if (tkConfig.transcriptsEnabled && tkConfig.transcriptChannelId) {
      const logChannel = interaction.guild.channels.cache.get(tkConfig.transcriptChannelId);
      if (logChannel) {
        const logEmbed = await createCustomEmbed(interaction, {
          title: '🔒 Ticket Closed & Archived',
          fields: [
            { name: 'Opened By', value: `<@${ticket.userId}>`, inline: true },
            { name: 'Closed By', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Category', value: ticket.category, inline: true }
          ],
          color: 'dark'
        });
        await logChannel.send({ embeds: [logEmbed], files: [attachment] });
      }
    }

    await interaction.editReply({ embeds: [createSuccessEmbed('Ticket closing in 5 seconds... channel will be deleted.')] });

    setTimeout(async () => {
      await interaction.channel.delete().catch(() => { });
    }, 5000);

  } catch (err) {
    console.error(err);
    await interaction.editReply({ embeds: [createErrorEmbed('Failed to finalize session.')] }).catch(() => { });
  }
};
