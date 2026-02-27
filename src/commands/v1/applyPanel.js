const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits
} = require('discord.js');
const { Guild, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('apply_panel')
    .setDescription('Create application panel')
    .addStringOption(opt =>
      opt.setName('type')
        .setDescription('Type of applications')
        .setRequired(true)
        .addChoices(
          { name: '👮 Staff', value: 'staff' },
          { name: '🌟 Helper', value: 'helper' }
        ))
    .addChannelOption(opt => opt.setName('channel').setDescription('Channel to send panel').setRequired(true))
    .addStringOption(opt => opt.setName('custom_title').setDescription('Override title').setRequired(false))
    .addStringOption(opt => opt.setName('custom_desc').setDescription('Override description').setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const guildId = interaction.guildId;
    const type = interaction.options.getString('type');
    const channel = interaction.options.getChannel('channel');

    const guild = await Guild.findOne({ guildId });

    if (!guild?.applicationConfig?.types?.[type]?.enabled) {
      return interaction.editReply(`❌ ${type} application system not configured. Use \`/apply_setup type:${type}\` first!`);
    }

    const config = guild.applicationConfig.types[type];
    const title = interaction.options.getString('custom_title') || config.customTitle;
    const description = interaction.options.getString('custom_desc') || config.customDesc;

    const emoji = type === 'staff' ? '👮' : '🌟';
    const color = type === 'staff' ? 0x5865f2 : 0x9b59b6;

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle(`${emoji} ${title}`)
      .setDescription(`${description}\n\n**Before you apply:**\n> • Ensure your DMs are open so we can contact you.\n> • Be detailed and honest in your responses.\n> • Troll or spam applications will result in a blacklist.`)
      .addFields(
        { name: '📝 Requirements', value: '• Be active in the community\n• Have good communication skills\n• Follow all server rules', inline: false },
        { name: '⏱️ Cooldown', value: 'One application per 24 hours', inline: true },
        { name: '📋 Note', value: 'Answer all questions carefully!', inline: true },
        { name: '📅 Updated', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
      )
      
      .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 512 }))
      
      } Applications`, iconURL: interaction.guild.iconURL() });

    if (config.bannerUrl && config.bannerUrl.startsWith('http')) {
      embed.setImage(config.bannerUrl);
    }

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`apply_now_${type}`)
          .setLabel(`${emoji} Apply Now`)
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`apply_stats_${type}`)
          .setLabel('📊 View Stats')
          .setStyle(ButtonStyle.Secondary)
      );

    await channel.send({ embeds: [embed], components: [row] });

    await interaction.editReply({ content: `✅ ${type} application panel sent to ${channel}!`, ephemeral: true });
  }
};

module.exports.handleApply = async (interaction, client) => {
  const type = interaction.customId.replace('apply_now_', '');
  const guildId = interaction.guildId;
  const userId = interaction.user.id;

  const guild = await Guild.findOne({ guildId });

  if (!guild?.applicationConfig?.types?.[type]?.enabled) {
    return interaction.reply({ content: `❌ ${type} application system not configured.`, ephemeral: true });
  }

  const config = guild.applicationConfig.types[type];

  if (guild.applicationConfig.blacklist?.some(entry => entry.userId === userId)) {
    return interaction.reply({ content: '❌ You are blacklisted from submitting applications.', ephemeral: true });
  }

  const user = await User.findOne({ userId });
  if (user?.applications) {
    const lastApp = user.applications
      .filter(a => a.guildId === guildId && a.type === type)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

    if (lastApp) {
      const hoursSince = (Date.now() - new Date(lastApp.createdAt)) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        return interaction.reply({
          content: `⏳ You must wait **${Math.round(24 - hoursSince)} hours** before applying again for ${type}.`,
          ephemeral: true
        });
      }
      if (lastApp.status === 'pending') {
        return interaction.reply({
          content: `❌ You already have a pending ${type} application!`,
          ephemeral: true
        });
      }
    }
  }

  const questions = config.questions || [
    { question: 'Why do you want this role?', required: true, type: 'paragraph' },
    { question: 'Previous experience?', required: true, type: 'paragraph' },
    { question: 'How active are you?', required: true, type: 'short' }
  ];

  const modal = new ModalBuilder()
    .setCustomId(`apply_modal_${type}`)
    .setTitle(`${type.toUpperCase()} Application`);

  questions.slice(0, 5).forEach((q, index) => {
    const input = new TextInputBuilder()
      .setCustomId(`question_${index}`)
      .setLabel(q.question.slice(0, 45))
      .setStyle(q.type === 'paragraph' ? TextInputStyle.Paragraph : TextInputStyle.Short)
      .setRequired(q.required)
      .setPlaceholder(q.question)
      .setMaxLength(q.type === 'paragraph' ? 1000 : 100);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
  });

  await interaction.showModal(modal);
};

module.exports.handleApplySubmit = async (interaction, client) => {
  const type = interaction.customId.replace('apply_modal_', '');
  const guildId = interaction.guildId;
  const userId = interaction.user.id;

  const guild = await Guild.findOne({ guildId });
  if (!guild?.applicationConfig?.types?.[type]?.enabled) {
    return interaction.reply({ content: `❌ ${type} system not configured.`, ephemeral: true });
  }

  const config = guild.applicationConfig.types[type];

  let user = await User.findOne({ userId });
  if (!user) {
    user = new User({ userId, username: interaction.user.tag, applications: [] });
  }

  const answers = [];
  for (let i = 0; i < 5; i++) {
    try {
      const value = interaction.fields.getTextInputValue(`question_${i}`);
      if (value) answers.push(value);
    } catch (e) { }
  }

  const appId = `${type.toUpperCase().slice(0, 3)}-${Date.now().toString(36).toUpperCase()}`;
  const questions = config.questions.map(q => typeof q === 'string' ? q : q.question);

  const application = {
    id: appId,
    type: type,
    guildId: guildId,
    username: interaction.user.tag,
    userId: userId,
    answers: answers,
    questions: questions,
    status: 'pending',
    createdAt: new Date(),
    notes: [],
    interview: null
  };

  user.applications.push(application);
  await user.save();

  const logChannelId = config.logChannel;
  const logChannel = interaction.guild.channels.cache.get(logChannelId);
  const color = type === 'staff' ? 0x5865f2 : 0x9b59b6;
  const emoji = type === 'staff' ? '👮' : '🌟';

  const member = await interaction.guild.members.fetch(userId).catch(() => null);
  const accountAgeStr = member ? `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>` : 'Unknown';
  const joinedAtStr = member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown';

  const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
    .setTitle(`${emoji} New ${type.toUpperCase()} Application #${appId}`)
    
    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .addFields(
      { name: '👤 Applicant', value: `<@${userId}>\n\`${interaction.user.tag}\``, inline: true },
      { name: '🆔 IDs', value: `App: \`${appId}\`\nUser: \`${userId}\``, inline: true },
      { name: '⏰ Applied', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
      { name: '📅 Account Created', value: accountAgeStr, inline: true },
      { name: '📥 Joined Server', value: joinedAtStr, inline: true }
    );

  // Add a divider
  embed.addFields({ name: '\u200B', value: '**Application Responses**' });

  questions.forEach((q, idx) => {
    if (answers[idx]) {
      embed.addFields({
        name: `Q${idx + 1}: ${q}`,
        value: `>>> ${answers[idx].substring(0, 1024) || 'No answer'}`,
        inline: false
      });
    }
  });

  embed })
    ;

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`apply_accept_${type}_${appId}`)
        .setLabel('Accept')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`apply_deny_${type}_${appId}`)
        .setLabel('Deny')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`apply_interview_${type}_${appId}`)
        .setLabel('Interview')
        .setEmoji('📅')
        .setStyle(ButtonStyle.Primary)
    );

  if (logChannel) {
    const logMsg = await logChannel.send({ embeds: [embed], components: [row] });
    application.messageId = logMsg.id;
    application.channelId = logChannel.id;
    await user.save();
  }

  const userDmEmbed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
    .setTitle('📨 Application Submitted Successfully')
    .setDescription(`Your **${type}** application in **${interaction.guild.name}** has been received.\n\nOur staff team will review it shortly. Please be patient, as this process can take some time.`)
    .addFields({ name: '🎫 Application ID', value: `\`${appId}\`` })
    
    ;

  try {
    await interaction.user.send({ embeds: [userDmEmbed] });
  } catch (e) { } // Ignore DM closed errors

  await interaction.reply({
    content: `✅ Your ${type} application has been submitted to the staff team! ID: \`${appId}\``,
    ephemeral: true
  });
};

module.exports.handleAccept = async (interaction, client) => {
  const parts = interaction.customId.split('_');
  const type = parts[2];
  const appId = parts.slice(3).join('_');

  const guildId = interaction.guildId;
  const guild = await Guild.findOne({ guildId });

  if (!guild?.applicationConfig?.types?.[type]) {
    return interaction.reply({ content: '❌ System not configured.', ephemeral: true });
  }

  const config = guild.applicationConfig.types[type];

  const staffRoleId = config.staffRole;
  const member = interaction.member;
  if (!member.roles.cache.has(staffRoleId) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ You cannot review applications!', ephemeral: true });
  }

  const users = await User.find({ 'applications.guildId': guildId, 'applications.id': appId });
  let targetUser = null, targetApplication = null;

  for (const user of users) {
    const app = user.applications.find(a => a.id === appId && a.type === type);
    if (app) { targetUser = user; targetApplication = app; break; }
  }

  if (!targetApplication) return interaction.reply({ content: '❌ Application not found!', ephemeral: true });
  if (targetApplication.status !== 'pending') {
    return interaction.reply({ content: '❌ This application has already been processed!', ephemeral: true });
  }

  targetApplication.status = 'accepted';
  targetApplication.reviewedBy = interaction.user.tag;
  targetApplication.reviewedAt = new Date();
  await targetUser.save();

  const discordUser = await client.users.fetch(targetUser.userId).catch(() => null);
  if (discordUser) {
    try {
      const color = type === 'staff' ? 0x2ecc71 : 0x57f287;
      const dmEmbed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
        .setTitle(`✅ ${type.toUpperCase()} Application Accepted!`)
        .setDescription(`Congratulations! Your ${type} application in **${interaction.guild.name}** has been accepted!`)
        
        ;
      await discordUser.send({ embeds: [dmEmbed] });
    } catch (e) { }
  }

  const acceptedRoleId = config.acceptedRole;
  const guildMember = interaction.guild.members.cache.get(targetUser.userId);
  if (guildMember && acceptedRoleId) {
    try { await guildMember.roles.add(acceptedRoleId); } catch (e) { }
  }

  const color = type === 'staff' ? 0x2ecc71 : 0x57f287; // Green
  const newEmbed = EmbedBuilder.from(interaction.message.embeds[0])
    
    .addFields({
      name: '✅ Application Accepted',
      value: `Reviewed by <@${interaction.user.id}> (<t:${Math.floor(Date.now() / 1000)}:R>)`,
      inline: false
    });

  // Remove buttons
  await interaction.message.edit({ embeds: [newEmbed], components: [] });
  await interaction.reply({ content: `✅ ${type} application accepted! User has been notified via DM.`, ephemeral: true });
};

module.exports.handleDeny = async (interaction, client) => {
  const parts = interaction.customId.split('_');
  const type = parts[2];
  const appId = parts.slice(3).join('_');

  const guildId = interaction.guildId;
  const guild = await Guild.findOne({ guildId });

  if (!guild?.applicationConfig?.types?.[type]) {
    return interaction.reply({ content: '❌ System not configured.', ephemeral: true });
  }

  const config = guild.applicationConfig.types[type];

  const staffRoleId = config.staffRole;
  const member = interaction.member;
  if (!member.roles.cache.has(staffRoleId) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ You cannot review applications!', ephemeral: true });
  }

  const users = await User.find({ 'applications.guildId': guildId, 'applications.id': appId });
  let targetUser = null, targetApplication = null;

  for (const user of users) {
    const app = user.applications.find(a => a.id === appId && a.type === type);
    if (app) { targetUser = user; targetApplication = app; break; }
  }

  if (!targetApplication) return interaction.reply({ content: '❌ Application not found!', ephemeral: true });
  if (targetApplication.status !== 'pending') {
    return interaction.reply({ content: '❌ This application has already been processed!', ephemeral: true });
  }

  targetApplication.status = 'denied';
  targetApplication.reviewedBy = interaction.user.tag;
  targetApplication.reviewedAt = new Date();
  await targetUser.save();

  const discordUser = await client.users.fetch(targetUser.userId).catch(() => null);
  if (discordUser) {
    try {
      const dmEmbed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
        .setTitle(`❌ ${type.toUpperCase()} Application Denied`)
        .setDescription(`Your ${type} application has been denied. Thank you for applying!`)
        
        ;
      await discordUser.send({ embeds: [dmEmbed] });
    } catch (e) { }
  }

  const newEmbed = EmbedBuilder.from(interaction.message.embeds[0])
     // Red
    .addFields({
      name: '❌ Application Denied',
      value: `Reviewed by <@${interaction.user.id}> (<t:${Math.floor(Date.now() / 1000)}:R>)`,
      inline: false
    });

  await interaction.message.edit({ embeds: [newEmbed], components: [] });
  await interaction.reply({ content: `✅ ${type} application denied. User has been notified via DM.`, ephemeral: true });
};