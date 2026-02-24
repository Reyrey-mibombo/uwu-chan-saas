const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('apply_panel')
    .setDescription('Create the application panel')
    .addChannelOption(opt => opt.setName('channel').setDescription('Channel to send panel').setRequired(true)),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const guildId = interaction.guildId;
    const channel = interaction.options.getChannel('channel');

    const guild = await Guild.findOne({ guildId });
    if (!guild?.applicationConfig?.enabled) {
      return interaction.editReply('❌ Application system not configured. Use `/apply_setup` first!');
    }

    const embed = new EmbedBuilder()
      .setTitle('📋 Staff Applications')
      .setDescription('Click the button below to apply for the staff team!')
      .addFields(
        { name: '📝 Requirements', value: '• Be active\n• Have good communication\n• Want to help the community', inline: false },
        { name: '💡 Note', value: 'One application per 24 hours. Make sure to answer all questions carefully!', inline: false }
      )
      .setColor(0x5865f2)
      .setThumbnail(interaction.guild.iconURL())
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('apply_now')
          .setLabel('📝 Apply Now')
          .setStyle(ButtonStyle.Primary)
      );

    await channel.send({ embeds: [embed], components: [row] });

    await interaction.editReply({ content: `✅ Application panel sent to ${channel}!`, ephemeral: true });
  }
};

module.exports.handleApply = async (interaction, client) => {
  const guildId = interaction.guildId;
  const userId = interaction.user.id;

  const guild = await Guild.findOne({ guildId });
  if (!guild?.applicationConfig?.enabled) {
    await interaction.reply({ content: '❌ Application system not configured.', ephemeral: true });
    return;
  }

  const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

  const modal = new ModalBuilder()
    .setCustomId('apply_modal')
    .setTitle('📋 Staff Application');

  const whyJoin = new TextInputBuilder()
    .setCustomId('why_join')
    .setLabel('1. Why do you want to join staff?')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Tell us why you want to be staff...')
    .setRequired(true);

  const experience = new TextInputBuilder()
    .setCustomId('experience')
    .setLabel('2. Previous experience?')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Any previous staff experience? (moderator, helper, etc.)')
    .setRequired(true);

  const activity = new TextInputBuilder()
    .setCustomId('activity')
    .setLabel('3. How active are you?')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Hours per day/week')
    .setRequired(true);

  const age = new TextInputBuilder()
    .setCustomId('age')
    .setLabel('4. Your age')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Your age')
    .setRequired(true);

  const other = new TextInputBuilder()
    .setCustomId('other')
    .setLabel('5. Anything else?')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Any additional info...')
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(whyJoin),
    new ActionRowBuilder().addComponents(experience),
    new ActionRowBuilder().addComponents(activity),
    new ActionRowBuilder().addComponents(age),
    new ActionRowBuilder().addComponents(other)
  );

  await interaction.showModal(modal);
};

module.exports.handleApplySubmit = async (interaction, client) => {
  const { Guild } = require('../../database/mongo');
  const guildId = interaction.guildId;
  const userId = interaction.user.id;

  const guild = await Guild.findOne({ guildId });
  if (!guild?.applicationConfig?.enabled) {
    await interaction.reply({ content: '❌ Application system not configured.', ephemeral: true });
    return;
  }

  const { User } = require('../../database/mongo');
  
  let user = await User.findOne({ userId });
  if (!user) {
    user = new User({ userId, username: interaction.user.tag });
  }

  if (!user.applications) {
    user.applications = [];
  }

  const lastApplication = user.applications
    .filter(a => a.guildId === guildId)
    .sort((a, b) => new Date(b.createdAt) - new Date(new Date(a.createdAt)))[0];

  if (lastApplication) {
    const hoursSinceLastApp = (Date.now() - new Date(lastApplication.createdAt).getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastApp < 24) {
      await interaction.reply({ 
        content: `❌ You must wait **${Math.round(24 - hoursSinceLastApp)} hours** before applying again.`, 
        ephemeral: true 
      });
      return;
    }
  }

  if (lastApplication && lastApplication.status === 'pending') {
    await interaction.reply({ content: '❌ You already have a pending application!', ephemeral: true });
    return;
  }

  const whyJoin = interaction.fields.getTextInputValue('why_join');
  const experience = interaction.fields.getTextInputValue('experience');
  const activity = interaction.fields.getTextInputValue('activity');
  const age = interaction.fields.getTextInputValue('age');
  const other = interaction.fields.getTextInputValue('other') || 'None';

  const applicationId = Date.now().toString(36).toUpperCase();

  const application = {
    id: applicationId,
    guildId: guildId,
    username: interaction.user.tag,
    userId: userId,
    whyJoin,
    experience,
    activity,
    age,
    other,
    status: 'pending',
    createdAt: new Date()
  };

  if (!user.applications) user.applications = [];
  user.applications.push(application);
  await user.save();

  const logChannelId = guild.applicationConfig.logChannel;
  const logChannel = interaction.guild.channels.cache.get(logChannelId);

  const embed = new EmbedBuilder()
    .setTitle(`📋 New Staff Application #${applicationId}`)
    .setColor(0x5865f2)
    .setThumbnail(interaction.user.displayAvatarURL())
    .addFields(
      { name: '👤 Applicant', value: `${interaction.user.tag}`, inline: true },
      { name: '🆔 User ID', value: userId, inline: true },
      { name: '⏰ Applied', value: `<t:${Math.floor(Date.now()/1000)}:R>`, inline: true },
      { name: '\u200B', value: '\u200B', inline: false },
      { name: '1️⃣ Why do you want to join staff?', value: whyJoin, inline: false },
      { name: '2️⃣ Previous experience?', value: experience, inline: false },
      { name: '3️⃣ How active are you?', value: activity, inline: true },
      { name: '4️⃣ Age', value: age, inline: true },
      { name: '5️⃣ Anything else?', value: other, inline: false }
    )
    .setFooter({ text: `Application ID: ${applicationId}` })
    .setTimestamp();

  const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`apply_accept_${applicationId}`)
        .setLabel('✅ Accept')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`apply_deny_${applicationId}`)
        .setLabel('❌ Deny')
        .setStyle(ButtonStyle.Danger)
    );

  if (logChannel) {
    const logMsg = await logChannel.send({ embeds: [embed], components: [row] });
    application.messageId = logMsg.id;
    application.channelId = logChannel.id;
    await user.save();
  }

  await interaction.reply({ content: `✅ Your application has been submitted! Application ID: \`${applicationId}\``, ephemeral: true });
};

module.exports.handleAccept = async (interaction, client) => {
  const { Guild, User } = require('../../database/mongo');
  const guildId = interaction.guildId;
  const applicationId = interaction.customId.replace('apply_accept_', '');

  const guild = await Guild.findOne({ guildId });
  if (!guild?.applicationConfig) {
    await interaction.reply({ content: '❌ Application system not configured.', ephemeral: true });
    return;
  }

  const staffRoleId = guild.applicationConfig.staffRole;
  const member = interaction.member;

  if (!member.roles.cache.has(staffRoleId) && !member.permissions.has('Administrator')) {
    await interaction.reply({ content: '❌ You cannot review applications!', ephemeral: true });
    return;
  }

  const users = await User.find({ 'applications.guildId': guildId, 'applications.id': applicationId });
  
  let targetUser = null;
  let targetApplication = null;
  
  for (const user of users) {
    const app = user.applications.find(a => a.id === applicationId);
    if (app) {
      targetUser = user;
      targetApplication = app;
      break;
    }
  }

  if (!targetUser || !targetApplication) {
    await interaction.reply({ content: '❌ Application not found!', ephemeral: true });
    return;
  }

  if (targetApplication.status !== 'pending') {
    await interaction.reply({ content: '❌ This application has already been processed!', ephemeral: true });
    return;
  }

  targetApplication.status = 'accepted';
  targetApplication.reviewedBy = interaction.user.tag;
  targetApplication.reviewedAt = new Date();
  await targetUser.save();

  const discordUser = await client.users.fetch(targetUser.userId).catch(() => null);
  if (discordUser) {
    try {
      const dmEmbed = new EmbedBuilder()
        .setTitle('✅ Application Accepted!')
        .setDescription(`Your staff application has been accepted! Welcome to the team! 🎉`)
        .setColor(0x2ecc71)
        .setTimestamp();
      await discordUser.send({ embeds: [dmEmbed] });
    } catch (e) {}
  }

  const acceptedRoleId = guild.applicationConfig.acceptedRole;
  const discordGuild = interaction.guild;
  const guildMember = discordGuild.members.cache.get(targetUser.userId);

  if (guildMember && acceptedRoleId) {
    try {
      await guildMember.roles.add(acceptedRoleId);
    } catch (e) {}
  }

  const newEmbed = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor(0x2ecc71)
    .addFields({ name: '✅ Status', value: `**ACCEPTED** by ${interaction.user.tag}`, inline: true });

  await interaction.message.edit({ embeds: [newEmbed], components: [] });

  await interaction.reply({ content: `✅ Application accepted! User has been notified.`, ephemeral: true });
};

module.exports.handleDeny = async (interaction, client) => {
  const { Guild, User } = require('../../database/mongo');
  const guildId = interaction.guildId;
  const applicationId = interaction.customId.replace('apply_deny_', '');

  const guild = await Guild.findOne({ guildId });
  if (!guild?.applicationConfig) {
    await interaction.reply({ content: '❌ Application system not configured.', ephemeral: true });
    return;
  }

  const staffRoleId = guild.applicationConfig.staffRole;
  const member = interaction.member;

  if (!member.roles.cache.has(staffRoleId) && !member.permissions.has('Administrator')) {
    await interaction.reply({ content: '❌ You cannot review applications!', ephemeral: true });
    return;
  }

  const users = await User.find({ 'applications.guildId': guildId, 'applications.id': applicationId });
  
  let targetUser = null;
  let targetApplication = null;
  
  for (const user of users) {
    const app = user.applications.find(a => a.id === applicationId);
    if (app) {
      targetUser = user;
      targetApplication = app;
      break;
    }
  }

  if (!targetUser || !targetApplication) {
    await interaction.reply({ content: '❌ Application not found!', ephemeral: true });
    return;
  }

  if (targetApplication.status !== 'pending') {
    await interaction.reply({ content: '❌ This application has already been processed!', ephemeral: true });
    return;
  }

  targetApplication.status = 'denied';
  targetApplication.reviewedBy = interaction.user.tag;
  targetApplication.reviewedAt = new Date();
  await targetUser.save();

  const discordUser = await client.users.fetch(targetUser.userId).catch(() => null);
  if (discordUser) {
    try {
      const dmEmbed = new EmbedBuilder()
        .setTitle('❌ Application Denied')
        .setDescription(`Your staff application has been denied. Thank you for applying!`)
        .setColor(0xe74c3c)
        .setTimestamp();
      await discordUser.send({ embeds: [dmEmbed] });
    } catch (e) {}
  }

  const newEmbed = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor(0xe74c3c)
    .addFields({ name: '❌ Status', value: `**DENIED** by ${interaction.user.tag}`, inline: true });

  await interaction.message.edit({ embeds: [newEmbed], components: [] });

  await interaction.reply({ content: `✅ Application denied. User has been notified.`, ephemeral: true });
};
