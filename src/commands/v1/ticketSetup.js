const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextInputBuilder, TextInputStyle, ModalBuilder } = require('discord.js');
const { createCoolEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');
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
      const channel = interaction.options.getChannel('channel');
      const title = interaction.options.getString('title') || '🎫 Support Tickets';

      const embed = createCoolEmbed()
        .setTitle(title)
        .setDescription('Choose the type of ticket you want to create below:')
        .addFields(
          { name: '🚨 Report Staff', value: 'Report a staff member with evidence/images', inline: false },
          { name: '💡 Feedback', value: 'Submit feedback or suggestions for the server', inline: false }
        )
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }));

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('ticket_report_staff')
            .setLabel('🚨 Report Staff')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('ticket_feedback')
            .setLabel('💡 Feedback')
            .setStyle(ButtonStyle.Primary)
        );

      await channel.send({ embeds: [embed], components: [row] });

      await Guild.findOneAndUpdate(
        { guildId: interaction.guildId },
        { $set: { 'settings.ticketChannel': channel.id } },
        { upsert: true }
      );

      await interaction.reply({ embeds: [createSuccessEmbed('Ticket Panel Deployed', `✅ Ticket panel successfully sent to <#${channel.id}>`)], ephemeral: true });
    } catch (error) {
      console.error(error);
      const errEmbed = createErrorEmbed('An error occurred while creating the ticket panel. Make sure the bot has permissions to send messages there.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};

module.exports.handleReportStaff = async (interaction, client) => {
  const modal = new ModalBuilder()
    .setCustomId('modal_report_staff')
    .setTitle('🚨 Report Staff Member');

  const staffInput = new TextInputBuilder()
    .setCustomId('report_staff_name')
    .setLabel('1. Staff Member Username')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter the staff member username')
    .setRequired(true);

  const reasonInput = new TextInputBuilder()
    .setCustomId('report_reason')
    .setLabel('2. Reason for Report')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Describe what happened...')
    .setRequired(true);

  const evidenceInput = new TextInputBuilder()
    .setCustomId('report_evidence')
    .setLabel('3. Evidence/Details')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Any evidence or additional details...')
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(staffInput),
    new ActionRowBuilder().addComponents(reasonInput),
    new ActionRowBuilder().addComponents(evidenceInput)
  );

  await interaction.showModal(modal);
};

module.exports.handleFeedback = async (interaction, client) => {
  const modal = new ModalBuilder()
    .setCustomId('modal_feedback')
    .setTitle('💡 Server Feedback');

  const feedbackInput = new TextInputBuilder()
    .setCustomId('feedback_content')
    .setLabel('Your Feedback/Suggestion')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Share your thoughts, suggestions, or feedback...')
    .setRequired(true);

  const imageInput = new TextInputBuilder()
    .setCustomId('feedback_image')
    .setLabel('Image URL (optional)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('https://example.com/image.png')
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(feedbackInput),
    new ActionRowBuilder().addComponents(imageInput)
  );

  await interaction.showModal(modal);
};

module.exports.handleReportSubmit = async (interaction, client) => {
  try {
    const staffName = interaction.fields.getTextInputValue('report_staff_name');
    const reason = interaction.fields.getTextInputValue('report_reason');
    const evidence = interaction.fields.getTextInputValue('report_evidence') || 'No evidence provided';

    const guild = await Guild.findOne({ guildId: interaction.guildId });
    const ticketChannelId = guild?.settings?.ticketChannel;

    if (!ticketChannelId) {
      return interaction.reply({ embeds: [createErrorEmbed('Ticket admin channel not configured! Use /ticketsetup.')], ephemeral: true });
    }

    const ticketChannel = interaction.guild.channels.cache.get(ticketChannelId);
    if (!ticketChannel) {
      return interaction.reply({ embeds: [createErrorEmbed('Configured ticket admin channel no longer exists!')], ephemeral: true });
    }

    const ticketNum = Date.now().toString(36).toUpperCase();

    const embed = createCoolEmbed()
      .setTitle(`🚨 Staff Report #${ticketNum}`)
      .addFields(
        { name: '🎫 Ticket ID', value: `\`${ticketNum}\``, inline: true },
        { name: '👤 Reported By', value: `${interaction.user.tag}`, inline: true },
        { name: '📊 Status', value: '⏳ **Pending** - Waiting for staff', inline: true },
        { name: '👥 Staff Member', value: staffName, inline: false },
        { name: '📝 Reason', value: reason, inline: false },
        { name: '📎 Evidence/Details', value: evidence, inline: false }
      )
      .setThumbnail(interaction.user.displayAvatarURL())
      .setColor('warning');

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_claim_${ticketNum}`)
          .setLabel('👋 Claim Ticket')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`ticket_close_${ticketNum}`)
          .setLabel('🔒 Close Ticket')
          .setStyle(ButtonStyle.Danger)
      );

    const msg = await ticketChannel.send({ embeds: [embed], components: [row] });

    const ticket = new Ticket({
      guildId: interaction.guildId,
      channelId: msg.channelId,
      messageId: msg.id,
      userId: interaction.user.id,
      username: interaction.user.tag,
      category: 'report_staff',
      status: 'open',
      staffName: staffName,
      reason: reason,
      evidence: evidence,
      claimedBy: null,
      messages: [{
        userId: interaction.user.id,
        content: `**Staff:** ${staffName}\n**Reason:** ${reason}\n**Evidence:** ${evidence}`,
        createdAt: new Date()
      }]
    });
    await ticket.save();

    await interaction.reply({ embeds: [createSuccessEmbed('Report Submitted', `Your report has been submitted successfully.\n**Ticket ID:** \`${ticketNum}\``)], ephemeral: true });
  } catch (err) {
    console.error(err);
    await interaction.reply({ embeds: [createErrorEmbed('An error occurred submitting the report.')], ephemeral: true });
  }
};

module.exports.handleFeedbackSubmit = async (interaction, client) => {
  try {
    const feedback = interaction.fields.getTextInputValue('feedback_content');
    const imageUrl = interaction.fields.getTextInputValue('feedback_image');

    const guild = await Guild.findOne({ guildId: interaction.guildId });
    const ticketChannelId = guild?.settings?.ticketChannel;

    if (!ticketChannelId) {
      return interaction.reply({ embeds: [createErrorEmbed('Ticket admin channel not configured! Use /ticketsetup.')], ephemeral: true });
    }

    const ticketChannel = interaction.guild.channels.cache.get(ticketChannelId);
    if (!ticketChannel) {
      return interaction.reply({ embeds: [createErrorEmbed('Configured ticket channel no longer exists!')], ephemeral: true });
    }

    const ticketNum = Date.now().toString(36).toUpperCase();

    const embed = createCoolEmbed()
      .setTitle(`💡 Feedback #${ticketNum}`)
      .addFields(
        { name: '🎫 Ticket ID', value: `\`${ticketNum}\``, inline: true },
        { name: '👤 Submitted By', value: `${interaction.user.tag}`, inline: true },
        { name: '📝 Feedback', value: feedback, inline: false }
      )
      .setThumbnail(interaction.user.displayAvatarURL());

    if (imageUrl) {
      embed.setImage(imageUrl);
    }

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_close_${ticketNum}`)
          .setLabel('🔒 Close Ticket')
          .setStyle(ButtonStyle.Danger)
      );

    const msg = await ticketChannel.send({ embeds: [embed], components: [row] });

    const ticket = new Ticket({
      guildId: interaction.guildId,
      channelId: msg.channelId,
      messageId: msg.id,
      userId: interaction.user.id,
      username: interaction.user.tag,
      category: 'feedback',
      status: 'open',
      feedback: feedback,
      imageUrl: imageUrl,
      claimedBy: null,
      messages: [{
        userId: interaction.user.id,
        content: feedback,
        createdAt: new Date()
      }]
    });
    await ticket.save();

    await interaction.reply({ embeds: [createSuccessEmbed('Feedback Submitted', `Your feedback has been received!\n**Ticket ID:** \`${ticketNum}\``)], ephemeral: true });
  } catch (err) {
    console.error(err);
    await interaction.reply({ embeds: [createErrorEmbed('An error occurred submitting feedback.')], ephemeral: true });
  }
};

module.exports.handleClaimTicket = async (interaction, client) => {
  try {
    if (!client.isOwner(interaction.user)) {
      return interaction.reply({ embeds: [createErrorEmbed('Only the **Bot Owner** can claim tickets!')], ephemeral: true });
    }

    const customId = interaction.customId;
    const ticketNum = customId.replace('ticket_claim_', '');

    const ticket = await Ticket.findOne({ guildId: interaction.guildId, status: 'open', messageId: interaction.message.id });

    if (!ticket) {
      return interaction.reply({ embeds: [createErrorEmbed('Ticket not found or already claimed.')], ephemeral: true });
    }

    const reporter = await client.users.fetch(ticket.userId).catch(() => null);
    const claimer = interaction.user;

    ticket.status = 'claimed';
    ticket.claimedBy = claimer.id;
    ticket.claimedByName = claimer.tag;
    ticket.claimedAt = new Date();
    await ticket.save();

    await interaction.message.delete().catch(() => { });

    const guild = await Guild.findOne({ guildId: interaction.guildId });
    const ticketChannelId = guild?.settings?.ticketChannel;
    const ticketChannel = interaction.guild.channels.cache.get(ticketChannelId);

    const embed = createCoolEmbed()
      .setTitle(`🚨 Staff Report #${ticketNum}`)
      .addFields(
        { name: '🎫 Ticket ID', value: `\`${ticketNum}\``, inline: true },
        { name: '👤 Reported By', value: ticket.username, inline: true },
        { name: '📊 Status', value: `👋 **Claimed** by ${claimer.tag}`, inline: true },
        { name: '👥 Staff Member', value: ticket.staffName, inline: false },
        { name: '📝 Reason', value: ticket.reason, inline: false },
        { name: '📎 Evidence/Details', value: ticket.evidence, inline: false }
      )
      .setColor('info');

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_dm_${ticketNum}`)
          .setLabel('💬 DM Reporter')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`ticket_close_${ticketNum}`)
          .setLabel('🔒 Close Ticket')
          .setStyle(ButtonStyle.Danger)
      );

    if (ticketChannel) {
      await ticketChannel.send({ embeds: [embed], components: [row] });
    }

    if (reporter) {
      try {
        const dmEmbed = createCoolEmbed()
          .setTitle('👋 Your Report Has Been Claimed!')
          .setDescription(`Your report **#${ticketNum}** has been picked up by ${claimer.tag}. They will review it shortly.`)
          .addFields(
            { name: 'Staff Member', value: ticket.staffName, inline: true },
            { name: 'Reason', value: ticket.reason, inline: false }
          );
        await reporter.send({ embeds: [dmEmbed] });
      } catch (e) { }
    }

    await interaction.reply({ embeds: [createSuccessEmbed('Ticket Claimed', `You have claimed Ticket **#${ticketNum}**. You can now DM the reporter.`)], ephemeral: true });
  } catch (err) {
    console.error(err);
    await interaction.reply({ embeds: [createErrorEmbed('Failed to claim ticket.')], ephemeral: true });
  }
};

module.exports.handleTicketDM = async (interaction, client) => {
  try {
    if (!client.isOwner(interaction.user)) {
      return interaction.reply({ embeds: [createErrorEmbed('Only the **Bot Owner** can message the reporter!')], ephemeral: true });
    }

    const customId = interaction.customId;
    const ticketNum = customId.replace('ticket_dm_', '');

    const ticket = await Ticket.findOne({
      guildId: interaction.guildId,
      status: 'claimed',
      messageId: interaction.message.id
    });

    if (!ticket) {
      return interaction.reply({ embeds: [createErrorEmbed('Ticket not found.')], ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId(`modal_dm_reply_${ticketNum}`)
      .setTitle('💬 Send Message to Reporter');

    const messageInput = new TextInputBuilder()
      .setCustomId('dm_message')
      .setLabel('Your Message')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Type your message to the reporter...')
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(messageInput));

    await interaction.showModal(modal);
  } catch (err) {
    console.error(err);
    await interaction.reply({ embeds: [createErrorEmbed('Failed to open DM modal.')], ephemeral: true });
  }
};

module.exports.handleDMReply = async (interaction, client) => {
  try {
    const message = interaction.fields.getTextInputValue('dm_message');
    const customId = interaction.customId;
    const ticketNum = customId.replace('modal_dm_reply_', '');

    const ticket = await Ticket.findOne({
      guildId: interaction.guildId,
      status: 'claimed',
      claimedBy: interaction.user.id
    });

    if (!ticket) {
      return interaction.reply({ embeds: [createErrorEmbed('Ticket not found or you are not the claimer.')], ephemeral: true });
    }

    const reporter = await client.users.fetch(ticket.userId).catch(() => null);

    if (reporter) {
      try {
        const dmEmbed = createCoolEmbed()
          .setTitle('💬 New Message About Your Report')
          .setDescription(`**Message:** ${message}\n\n👤 **From:** ${interaction.user.tag}\n🎫 **Ticket:** #${ticketNum}`);
        await reporter.send({ embeds: [dmEmbed] });
        await interaction.reply({ embeds: [createSuccessEmbed('Message Sent', `Message successfully sent to ${ticket.username}!`)], ephemeral: true });
      } catch (e) {
        await interaction.reply({ embeds: [createErrorEmbed('Could not send DM. User may have DMs disabled.')], ephemeral: true });
      }
    } else {
      await interaction.reply({ embeds: [createErrorEmbed('Could not find reporter (user may have left).')], ephemeral: true });
    }
  } catch (err) {
    console.error(err);
    await interaction.reply({ embeds: [createErrorEmbed('Failed to process message.')], ephemeral: true });
  }
};

module.exports.handleCloseTicket = async (interaction, client) => {
  try {
    if (!client.isOwner(interaction.user)) {
      return interaction.reply({ embeds: [createErrorEmbed('Only the **Bot Owner** can close tickets!')], ephemeral: true });
    }

    const customId = interaction.customId;
    const ticketNum = customId.replace('ticket_close_', '');

    const ticket = await Ticket.findOne({
      guildId: interaction.guildId,
      status: { $in: ['open', 'claimed'] },
      messageId: interaction.message.id
    });

    if (!ticket) {
      return interaction.reply({ embeds: [createErrorEmbed('Ticket not found.')], ephemeral: true });
    }

    ticket.status = 'closed';
    ticket.closedBy = interaction.user.id;
    ticket.closedByName = interaction.user.tag;
    ticket.closedAt = new Date();
    await ticket.save();

    const reporter = await client.users.fetch(ticket.userId).catch(() => null);

    if (reporter) {
      try {
        const dmEmbed = createCoolEmbed()
          .setTitle('🔒 Your Ticket Has Been Closed')
          .setDescription(`Your report/feedback **#${ticketNum}** has been closed by ${interaction.user.tag}. Thank you.`)
          .setColor('error');
        await reporter.send({ embeds: [dmEmbed] });
      } catch (e) { }
    }

    await interaction.message.delete().catch(() => { });

    const guild = await Guild.findOne({ guildId: interaction.guildId });
    const ticketChannelId = guild?.settings?.ticketChannel;
    const ticketChannel = interaction.guild.channels.cache.get(ticketChannelId);

    const closedEmbed = createCoolEmbed()
      .setTitle(ticket.category === 'report_staff' ? `🚨 Staff Report #${ticketNum} (Closed)` : `💡 Feedback #${ticketNum} (Closed)`)
      .addFields(
        { name: '🎫 Ticket ID', value: `\`${ticketNum}\``, inline: true },
        { name: '👤 Submitted By', value: ticket.username, inline: true },
        { name: '🔒 Closed By', value: interaction.user.tag, inline: true },
        { name: '📊 Status', value: '❌ **Closed**', inline: true }
      )
      .setColor('dark');

    if (ticketChannel) {
      await ticketChannel.send({ embeds: [closedEmbed] });
    }

    await interaction.reply({ embeds: [createSuccessEmbed('Ticket Closed', `Ticket **#${ticketNum}** has been permanently closed.`)], ephemeral: true });
  } catch (err) {
    console.error(err);
    await interaction.reply({ embeds: [createErrorEmbed('Failed to close ticket.')], ephemeral: true });
  }
};
