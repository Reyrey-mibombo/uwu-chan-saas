const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextInputBuilder, TextInputStyle, ModalBuilder } = require('discord.js');
const { Ticket, Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketsetup')
    .setDescription('Setup the ticket system with Report Staff and Feedback buttons')
    .addChannelOption(opt => opt.setName('channel').setDescription('Channel to send ticket panel').setRequired(true))
    .addStringOption(opt => opt.setName('title').setDescription('Title for the ticket panel').setRequired(false))
    .setDefaultMemberPermissions('ManageGuild'),

  async execute(interaction, client) {
    const channel = interaction.options.getChannel('channel');
    const title = interaction.options.getString('title') || '🎫 Support Tickets';

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription('Choose the type of ticket you want to create:')
      .addFields(
        { name: '📋 Report Staff', value: 'Report a staff member with evidence/images', inline: false },
        { name: '💬 Feedback', value: 'Submit feedback or suggestions for the server', inline: false }
      )
      .setColor(0x5865f2)
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_report_staff')
          .setLabel('📋 Report Staff')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('ticket_feedback')
          .setLabel('💬 Feedback')
          .setStyle(ButtonStyle.Primary)
      );

    await channel.send({ embeds: [embed], components: [row] });
    
    await Guild.findOneAndUpdate(
      { guildId: interaction.guildId },
      { $set: { 'settings.ticketChannel': channel.id } },
      { upsert: true }
    );

    await interaction.reply({ content: `✅ Ticket panel sent to ${channel}`, ephemeral: true });
  }
};

module.exports.handleReportStaff = async (interaction, client) => {
  const modal = new ModalBuilder()
    .setCustomId('modal_report_staff')
    .setTitle('📋 Report Staff Member');

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
    .setTitle('💬 Server Feedback');

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
  const staffName = interaction.fields.getTextInputValue('report_staff_name');
  const reason = interaction.fields.getTextInputValue('report_reason');
  const evidence = interaction.fields.getTextInputValue('report_evidence') || 'No evidence provided';

  const guild = await Guild.findOne({ guildId: interaction.guildId });
  const ticketChannelId = guild?.settings?.ticketChannel;
  
  if (!ticketChannelId) {
    await interaction.reply({ content: '❌ Ticket channel not configured', ephemeral: true });
    return;
  }

  const ticketChannel = interaction.guild.channels.cache.get(ticketChannelId);
  if (!ticketChannel) {
    await interaction.reply({ content: '❌ Ticket channel not found', ephemeral: true });
    return;
  }

  const ticketNum = Date.now().toString(36).toUpperCase();

  const embed = new EmbedBuilder()
    .setTitle(`📋 Staff Report #${ticketNum}`)
    .setColor(0xe74c3c)
    .addFields(
      { name: '🎫 Ticket ID', value: `\`${ticketNum}\``, inline: true },
      { name: '👤 Reported By', value: `${interaction.user.tag}`, inline: true },
      { name: '📊 Status', value: '⏳ **Pending** - Waiting for staff', inline: true },
      { name: '👨‍💼 Staff Member', value: staffName, inline: false },
      { name: '📝 Reason', value: reason, inline: false },
      { name: '📎 Evidence/Details', value: evidence, inline: false }
    )
    .setThumbnail(interaction.user.displayAvatarURL())
    .setTimestamp();

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket_claim_${ticketNum}`)
        .setLabel('✅ Claim Ticket')
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

  await interaction.reply({ content: `✅ Your report has been submitted! Ticket ID: \`${ticketNum}\``, ephemeral: true });
};

module.exports.handleFeedbackSubmit = async (interaction, client) => {
  const feedback = interaction.fields.getTextInputValue('feedback_content');
  const imageUrl = interaction.fields.getTextInputValue('feedback_image');

  const guild = await Guild.findOne({ guildId: interaction.guildId });
  const ticketChannelId = guild?.settings?.ticketChannel;
  
  if (!ticketChannelId) {
    await interaction.reply({ content: '❌ Ticket channel not configured', ephemeral: true });
    return;
  }

  const ticketChannel = interaction.guild.channels.cache.get(ticketChannelId);
  if (!ticketChannel) {
    await interaction.reply({ content: '❌ Ticket channel not found', ephemeral: true });
    return;
  }

  const ticketNum = Date.now().toString(36).toUpperCase();

  const embed = new EmbedBuilder()
    .setTitle(`💬 Feedback #${ticketNum}`)
    .setColor(0x2ecc71)
    .addFields(
      { name: '🎫 Ticket ID', value: `\`${ticketNum}\``, inline: true },
      { name: '👤 Submitted By', value: `${interaction.user.tag}`, inline: true },
      { name: '💭 Feedback', value: feedback, inline: false }
    )
    .setThumbnail(interaction.user.displayAvatarURL())
    .setTimestamp();

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

  await interaction.reply({ content: `✅ Your feedback has been submitted! Ticket ID: \`${ticketNum}\``, ephemeral: true });
};

module.exports.handleClaimTicket = async (interaction, client) => {
  // Only bot owner can claim tickets
  if (!client.isOwner(interaction.user)) {
    await interaction.reply({ content: '❌ Only the **Bot Owner** can claim tickets!', ephemeral: true });
    return;
  }

  const customId = interaction.customId;
  const ticketNum = customId.replace('ticket_claim_', '');

  const ticket = await Ticket.findOne({ guildId: interaction.guildId, status: 'open', messageId: interaction.message.id });
  
  if (!ticket) {
    await interaction.reply({ content: '❌ Ticket not found or already claimed', ephemeral: true });
    return;
  }

  const reporter = await client.users.fetch(ticket.userId).catch(() => null);
  const claimer = interaction.user;

  ticket.status = 'claimed';
  ticket.claimedBy = claimer.id;
  ticket.claimedByName = claimer.tag;
  ticket.claimedAt = new Date();
  await ticket.save();

  await interaction.message.delete().catch(() => {});

  const guild = await Guild.findOne({ guildId: interaction.guildId });
  const ticketChannelId = guild?.settings?.ticketChannel;
  const ticketChannel = interaction.guild.channels.cache.get(ticketChannelId);

  const embed = new EmbedBuilder()
    .setTitle(`📋 Staff Report #${ticketNum}`)
    .setColor(0xf39c12)
    .addFields(
      { name: '🎫 Ticket ID', value: `\`${ticketNum}\``, inline: true },
      { name: '👤 Reported By', value: ticket.username, inline: true },
      { name: '📊 Status', value: `✅ **Claimed** by ${claimer.tag}`, inline: true },
      { name: '👨‍💼 Staff Member', value: ticket.staffName, inline: false },
      { name: '📝 Reason', value: ticket.reason, inline: false },
      { name: '📎 Evidence/Details', value: ticket.evidence, inline: false }
    )
    .setTimestamp();

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
      const dmEmbed = new EmbedBuilder()
        .setTitle('📋 Your Report Has Been Claimed!')
        .setDescription(`Your report #${ticketNum} has been picked up by ${claimer.tag}`)
        .addFields(
          { name: 'Staff Member', value: ticket.staffName, inline: true },
          { name: 'Reason', value: ticket.reason, inline: false }
        )
        .setColor(0xf39c12)
        .setTimestamp();
      await reporter.send({ embeds: [dmEmbed] });
    } catch (e) {}
  }

  await interaction.reply({ content: `✅ You have claimed this ticket! You can now DM the reporter.`, ephemeral: true });
};

module.exports.handleTicketDM = async (interaction, client) => {
  // Only bot owner can DM
  if (!client.isOwner(interaction.user)) {
    await interaction.reply({ content: '❌ Only the **Bot Owner** can message the reporter!', ephemeral: true });
    return;
  }

  const customId = interaction.customId;
  const ticketNum = customId.replace('ticket_dm_', '');

  const ticket = await Ticket.findOne({ 
    guildId: interaction.guildId, 
    status: 'claimed',
    messageId: interaction.message.id
  });

  if (!ticket) {
    await interaction.reply({ content: '❌ Ticket not found', ephemeral: true });
    return;
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
};

module.exports.handleDMReply = async (interaction, client) => {
  const message = interaction.fields.getTextInputValue('dm_message');
  const customId = interaction.customId;
  const ticketNum = customId.replace('modal_dm_reply_', '');

  const ticket = await Ticket.findOne({ 
    guildId: interaction.guildId, 
    status: 'claimed',
    claimedBy: interaction.user.id 
  });

  if (!ticket) {
    await interaction.reply({ content: '❌ Ticket not found', ephemeral: true });
    return;
  }

  const reporter = await client.users.fetch(ticket.userId).catch(() => null);

  if (reporter) {
    try {
      const dmEmbed = new EmbedBuilder()
        .setTitle('💬 New Message About Your Report')
        .setDescription(`**Message:** ${message}\n\n📝 From: ${interaction.user.tag}\n📋 Ticket: #${ticketNum}`)
        .setColor(0x3498db)
        .setTimestamp();
      await reporter.send({ embeds: [dmEmbed] });
      await interaction.reply({ content: `✅ Message sent to ${ticket.username}!`, ephemeral: true });
    } catch (e) {
      await interaction.reply({ content: '❌ Could not send DM - user may have DMs disabled', ephemeral: true });
    }
  } else {
    await interaction.reply({ content: '❌ Could not find reporter', ephemeral: true });
  }
};

module.exports.handleCloseTicket = async (interaction, client) => {
  // Only bot owner can close tickets
  if (!client.isOwner(interaction.user)) {
    await interaction.reply({ content: '❌ Only the **Bot Owner** can close tickets!', ephemeral: true });
    return;
  }

  const customId = interaction.customId;
  const ticketNum = customId.replace('ticket_close_', '');

  const ticket = await Ticket.findOne({ 
    guildId: interaction.guildId,
    status: { $in: ['open', 'claimed'] },
    messageId: interaction.message.id
  });

  if (!ticket) {
    await interaction.reply({ content: '❌ Ticket not found', ephemeral: true });
    return;
  }

  ticket.status = 'closed';
  ticket.closedBy = interaction.user.id;
  ticket.closedByName = interaction.user.tag;
  ticket.closedAt = new Date();
  await ticket.save();

  const reporter = await client.users.fetch(ticket.userId).catch(() => null);

  if (reporter) {
    try {
      const dmEmbed = new EmbedBuilder()
        .setTitle('🔒 Your Ticket Has Been Closed')
        .setDescription(`Your report/feedback #${ticketNum} has been closed by ${interaction.user.tag}`)
        .setColor(0x95a5a6)
        .setTimestamp();
      await reporter.send({ embeds: [dmEmbed] });
    } catch (e) {}
  }

  await interaction.message.delete().catch(() => {});

  const guild = await Guild.findOne({ guildId: interaction.guildId });
  const ticketChannelId = guild?.settings?.ticketChannel;
  const ticketChannel = interaction.guild.channels.cache.get(ticketChannelId);

  const closedEmbed = new EmbedBuilder()
    .setTitle(ticket.category === 'report_staff' ? `📋 Staff Report #${ticketNum} (Closed)` : `💬 Feedback #${ticketNum} (Closed)`)
    .setColor(0x95a5a6)
    .addFields(
      { name: '🎫 Ticket ID', value: `\`${ticketNum}\``, inline: true },
      { name: '👤 Submitted By', value: ticket.username, inline: true },
      { name: '🔒 Closed By', value: interaction.user.tag, inline: true },
      { name: '📊 Status', value: '✅ **Closed**', inline: true }
    )
    .setTimestamp();

  if (ticketChannel) {
    await ticketChannel.send({ embeds: [closedEmbed] });
  }

  await interaction.reply({ content: `✅ Ticket #${ticketNum} has been closed!`, ephemeral: true });
};
