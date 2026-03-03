const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextInputBuilder, TextInputStyle, ModalBuilder, PermissionFlagsBits } = require('discord.js');
const { createCoolEmbed, createErrorEmbed, createSuccessEmbed, createCustomEmbed } = require('../../utils/embeds');
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

module.exports.handleReportStaff = async (interaction, client) => {
  const modal = new ModalBuilder()
    .setCustomId('modal_report_staff')
    .setTitle('🚨 Personnel Report Filing');

  const staffInput = new TextInputBuilder()
    .setCustomId('report_staff_name')
    .setLabel('Target Personnel Username')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Username of the personnel involved')
    .setRequired(true);

  const reasonInput = new TextInputBuilder()
    .setCustomId('report_reason')
    .setLabel('Violation Description')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Describe the incident in detail...')
    .setRequired(true);

  const evidenceInput = new TextInputBuilder()
    .setCustomId('report_evidence')
    .setLabel('Evidence Telemetry')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('URLs to images or detailed evidence...')
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
    .setTitle('💡 Operational Feedback');

  const feedbackInput = new TextInputBuilder()
    .setCustomId('feedback_content')
    .setLabel('Feedback / Suggestion')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Describe your thoughts or proposed changes...')
    .setRequired(true);

  const imageInput = new TextInputBuilder()
    .setCustomId('feedback_image')
    .setLabel('Visual Aid (Optional URL)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('https://example.com/telemetry.png')
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(feedbackInput),
    new ActionRowBuilder().addComponents(imageInput)
  );

  await interaction.showModal(modal);
};

module.exports.handleReportSubmit = async (interaction, client) => {
  try {
            await interaction.deferReply({ fetchReply: true });
    const staffName = interaction.fields.getTextInputValue('report_staff_name');
    const reason = interaction.fields.getTextInputValue('report_reason');
    const evidence = interaction.fields.getTextInputValue('report_evidence') || 'No additional telemetry.';

    const guild = await Guild.findOne({ guildId: interaction.guildId });
    const ticketChannelId = guild?.settings?.ticketChannel;

    if (!ticketChannelId) {
      return interaction.editReply({ embeds: [createErrorEmbed('Administrative channel not found. Deployment required.')], ephemeral: true });
    }

    const ticketChannel = interaction.guild.channels.cache.get(ticketChannelId);
    if (!ticketChannel) {
      return interaction.editReply({ embeds: [createErrorEmbed('Target operational channel lost. Re-deployment required.')], ephemeral: true });
    }

    const ticketNum = Date.now().toString(36).toUpperCase();

    const embed = await createCustomEmbed(interaction, {
      title: `🚨 Personnel Report #${ticketNum}`,
      fields: [
        { name: '🎫 Dossier ID', value: `\`${ticketNum}\``, inline: true },
        { name: '👤 Originator', value: `**${interaction.user.username}**`, inline: true },
        { name: '📊 Status', value: '⏳ **QUEUEING** - Awaiting Review', inline: true },
        { name: '👥 Target Personnel', value: `\`${staffName}\``, inline: false },
        { name: '📝 Violation Reason', value: reason, inline: false },
        { name: '📎 Telemetry Data', value: evidence, inline: false }
      ],
      thumbnail: interaction.user.displayAvatarURL({ dynamic: true }),
      color: 'warning'
    });

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_claim_${ticketNum}`)
          .setLabel('👋 Intercept Ticket')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`ticket_close_${ticketNum}`)
          .setLabel('🔒 Finalize Ticket')
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
        content: `**Subject:** ${staffName}\n**Log:** ${reason}\n**Evidence:** ${evidence}`,
        createdAt: new Date()
      }]
    });
    await ticket.save();

    const confirmEmbed = await createCustomEmbed(interaction, {
      title: '✅ Report Logged',
      description: `Your report has been successfully transmitted to the administration.\n**Dossier ID:** \`${ticketNum}\``,
      color: 'success'
    });

    await interaction.editReply({ embeds: [confirmEmbed], ephemeral: true });
  } catch (err) {
    console.error(err);
    await interaction.editReply({ embeds: [createErrorEmbed('An error occurred during transmission.')], ephemeral: true });
  }
};

module.exports.handleFeedbackSubmit = async (interaction, client) => {
  try {
            await interaction.deferReply({ fetchReply: true });
    const feedback = interaction.fields.getTextInputValue('feedback_content');
    const imageUrl = interaction.fields.getTextInputValue('feedback_image');

    const guild = await Guild.findOne({ guildId: interaction.guildId });
    const ticketChannelId = guild?.settings?.ticketChannel;

    if (!ticketChannelId) {
      return interaction.editReply({ embeds: [createErrorEmbed('Administrative channel not found. Deployment required.')], ephemeral: true });
    }

    const ticketChannel = interaction.guild.channels.cache.get(ticketChannelId);
    if (!ticketChannel) {
      return interaction.editReply({ embeds: [createErrorEmbed('Target operational channel lost. Re-deployment required.')], ephemeral: true });
    }

    const ticketNum = Date.now().toString(36).toUpperCase();

    const embed = await createCustomEmbed(interaction, {
      title: `💡 Operational Feedback #${ticketNum}`,
      fields: [
        { name: '🎫 Feedback ID', value: `\`${ticketNum}\``, inline: true },
        { name: '👤 Submitter', value: `**${interaction.user.username}**`, inline: true },
        { name: '📝 Content', value: feedback, inline: false }
      ],
      thumbnail: interaction.user.displayAvatarURL({ dynamic: true }),
      image: imageUrl || null
    });

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_close_${ticketNum}`)
          .setLabel('🔒 Finalize Feedback')
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

    const confirmEmbed = await createCustomEmbed(interaction, {
      title: '✅ Feedback Transmission Successful',
      description: `Your thoughts have been recorded and sent to the logistics department.\n**Reference ID:** \`${ticketNum}\``,
      color: 'success'
    });

    await interaction.editReply({ embeds: [confirmEmbed], ephemeral: true });
  } catch (err) {
    console.error(err);
    await interaction.editReply({ embeds: [createErrorEmbed('An error occurred during transmission.')], ephemeral: true });
  }
};

module.exports.handleClaimTicket = async (interaction, client) => {
  try {
            await interaction.deferReply({ fetchReply: true });
    const isMod = interaction.member.permissions.has(PermissionFlagsBits.Administrator) || (client.isOwner && client.isOwner(interaction.user));
    if (!isMod) {
      return interaction.editReply({ embeds: [createErrorEmbed('Strictly restricted to **Administrative** personnel.')], ephemeral: true });
    }

    const customId = interaction.customId;
    const ticketNum = customId.replace('ticket_claim_', '');

    const ticket = await Ticket.findOne({ guildId: interaction.guildId, status: 'open', messageId: interaction.message.id });

    if (!ticket) {
      return interaction.editReply({ embeds: [createErrorEmbed('Dossier unavailable or already intercepted.')], ephemeral: true });
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

    const embed = await createCustomEmbed(interaction, {
      title: `🚨 Personnel Report #${ticketNum}`,
      fields: [
        { name: '🎫 Dossier ID', value: `\`${ticketNum}\``, inline: true },
        { name: '👤 Originator', value: ticket.username, inline: true },
        { name: '📊 Status', value: `👋 **INTERCEPTED** by ${claimer.username}`, inline: true },
        { name: '👥 Target Personnel', value: `\`${ticket.staffName}\``, inline: false },
        { name: '📝 Violation Reason', value: ticket.reason, inline: false },
        { name: '📎 Telemetry Data', value: ticket.evidence, inline: false }
      ],
      color: 'info'
    });

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_dm_${ticketNum}`)
          .setLabel('💬 Communicate')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`ticket_close_${ticketNum}`)
          .setLabel('🔒 Finalize')
          .setStyle(ButtonStyle.Danger)
      );

    if (ticketChannel) {
      await ticketChannel.send({ embeds: [embed], components: [row] });
    }

    if (reporter) {
      try {
            await interaction.deferReply({ fetchReply: true });
        const dmEmbed = await createCustomEmbed(interaction, {
          title: '👋 Communication Link Established',
          description: `Your report **#${ticketNum}** has been intercepted by **${claimer.username}**. Expect contact shortly.`,
          fields: [
            { name: 'Target Subject', value: `\`${ticket.staffName}\``, inline: true },
            { name: 'Status', value: '⏳ Under Review', inline: true }
          ]
        });
        await reporter.send({ embeds: [dmEmbed] });
      } catch (e) { }
    }

    const claimConfirm = await createCustomEmbed(interaction, {
      title: '✅ Dossier Intercepted',
      description: `You have taken command of Ticket **#${ticketNum}**. Communication channel is open.`,
      color: 'success'
    });

    await interaction.editReply({ embeds: [claimConfirm], ephemeral: true });
  } catch (err) {
    console.error(err);
    await interaction.editReply({ embeds: [createErrorEmbed('Failed to intercept dossier.')], ephemeral: true });
  }
};

module.exports.handleTicketDM = async (interaction, client) => {
  try {
            await interaction.deferReply({ fetchReply: true });
    if (!client.isOwner(interaction.user)) {
      return interaction.editReply({ embeds: [createErrorEmbed('Access denied. Executive clearance required.')], ephemeral: true });
    }

    const customId = interaction.customId;
    const ticketNum = customId.replace('ticket_dm_', '');

    const ticket = await Ticket.findOne({
      guildId: interaction.guildId,
      status: 'claimed',
      messageId: interaction.message.id
    });

    if (!ticket) {
      return interaction.editReply({ embeds: [createErrorEmbed('Dossier sync error.')], ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId(`modal_dm_reply_${ticketNum}`)
      .setTitle('💬 Secure Communication Channel');

    const messageInput = new TextInputBuilder()
      .setCustomId('dm_message')
      .setLabel('Encrypted Message Content')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Type your message for the originator...')
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(messageInput));

    await interaction.showModal(modal);
  } catch (err) {
    console.error(err);
    await interaction.editReply({ embeds: [createErrorEmbed('Failed to initialize communication modal.')], ephemeral: true });
  }
};

module.exports.handleDMReply = async (interaction, client) => {
  try {
            await interaction.deferReply({ fetchReply: true });
    const message = interaction.fields.getTextInputValue('dm_message');
    const customId = interaction.customId;
    const ticketNum = customId.replace('modal_dm_reply_', '');

    const ticket = await Ticket.findOne({
      guildId: interaction.guildId,
      status: 'claimed',
      claimedBy: interaction.user.id
    });

    if (!ticket) {
      return interaction.editReply({ embeds: [createErrorEmbed('Communication link lost or unauthorized access.')], ephemeral: true });
    }

    const reporter = await client.users.fetch(ticket.userId).catch(() => null);

    if (reporter) {
      try {
            await interaction.deferReply({ fetchReply: true });
        const dmEmbed = await createCustomEmbed(interaction, {
          title: '💬 Incoming Operational Message',
          description: `**Log:** ${message}\n\n👤 **Personnel:** ${interaction.user.username}\n🎫 **Session ID:** #${ticketNum}`
        });
        await reporter.send({ embeds: [dmEmbed] });

        const okEmbed = await createCustomEmbed(interaction, {
          title: '✅ Message Transmitted',
          description: `Telemetry successfully delivered to **${ticket.username}**.`,
          color: 'success'
        });
        await interaction.editReply({ embeds: [okEmbed], ephemeral: true });
      } catch (e) {
        await interaction.editReply({ embeds: [createErrorEmbed('Target node incommunicado (DMs disabled).')], ephemeral: true });
      }
    } else {
      await interaction.editReply({ embeds: [createErrorEmbed('Target personnel node lost (left server).')], ephemeral: true });
    }
  } catch (err) {
    console.error(err);
    await interaction.editReply({ embeds: [createErrorEmbed('Operational transmission failure.')], ephemeral: true });
  }
};

module.exports.handleCloseTicket = async (interaction, client) => {
  try {
            await interaction.deferReply({ fetchReply: true });
    const isMod = interaction.member.permissions.has(PermissionFlagsBits.Administrator) || (client.isOwner && client.isOwner(interaction.user));
    if (!isMod) {
      return interaction.editReply({ embeds: [createErrorEmbed('Access denied. Administrative oversight required.')], ephemeral: true });
    }

    const customId = interaction.customId;
    const ticketNum = customId.replace('ticket_close_', '');

    const ticket = await Ticket.findOne({
      guildId: interaction.guildId,
      status: { $in: ['open', 'claimed'] },
      messageId: interaction.message.id
    });

    if (!ticket) {
      return interaction.editReply({ embeds: [createErrorEmbed('Dossier synchronization failure.')], ephemeral: true });
    }

    ticket.status = 'closed';
    ticket.closedBy = interaction.user.id;
    ticket.closedByName = interaction.user.tag;
    ticket.closedAt = new Date();
    await ticket.save();

    const reporter = await client.users.fetch(ticket.userId).catch(() => null);

    if (reporter) {
      try {
            await interaction.deferReply({ fetchReply: true });
        const dmEmbed = await createCustomEmbed(interaction, {
          title: '🔒 Operational Session Finalized',
          description: `Your ticket **#${ticketNum}** has been closed by **${interaction.user.username}**. All logs archived.`,
          color: 'error'
        });
        await reporter.send({ embeds: [dmEmbed] });
      } catch (e) { }
    }

    await interaction.message.delete().catch(() => { });

    const guild = await Guild.findOne({ guildId: interaction.guildId });
    const ticketChannelId = guild?.settings?.ticketChannel;
    const ticketChannel = interaction.guild.channels.cache.get(ticketChannelId);

    const closedEmbed = await createCustomEmbed(interaction, {
      title: ticket.category === 'report_staff' ? `🚨 Personnel Report #${ticketNum} (Finalized)` : `💡 Feedback #${ticketNum} (Finalized)`,
      fields: [
        { name: '🎫 Dossier ID', value: `\`${ticketNum}\``, inline: true },
        { name: '👤 Originator', value: ticket.username, inline: true },
        { name: '🔒 Finalized By', value: interaction.user.username, inline: true },
        { name: '📊 Status', value: '❌ **ARCHIVED**', inline: true }
      ],
      color: 'dark'
    });

    const { AttachmentBuilder } = require('discord.js');
    let transcriptContent = `Transcript for Ticket #${ticketNum}\nReported by: ${ticket.username}\nClosed by: ${interaction.user.tag}\n-----------------------------------\n\n`;

    ticket.messages.forEach(m => {
      transcriptContent += `[${new Date(m.createdAt).toLocaleString()}] User ${m.userId}:\n${m.content}\n\n`;
    });

    const buffer = Buffer.from(transcriptContent, 'utf-8');
    const attachment = new AttachmentBuilder(buffer, { name: `transcript-${ticketNum}.txt` });

    if (ticketChannel) {
      await ticketChannel.send({ embeds: [closedEmbed], files: [attachment] });
    }

    if (reporter) {
      try {
            await interaction.deferReply({ fetchReply: true });
        await reporter.send({ content: 'Operational Transcript Archived:', files: [attachment] });
      } catch (e) { }
    }

    const closeOk = await createCustomEmbed(interaction, {
      title: '✅ Session Finalized',
      description: `Ticket **#${ticketNum}** permanent record saved and archived.`,
      color: 'success'
    });

    await interaction.editReply({ embeds: [closeOk], ephemeral: true });
  } catch (err) {
    console.error(err);
    await interaction.editReply({ embeds: [createErrorEmbed('Failed to finalize session.')], ephemeral: true });
  }
};

