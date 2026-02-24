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
    .setName('helper_panel')
    .setDescription('[Helper] Create helper application panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel to send the application panel')
        .setRequired(true)),

  async execute(interaction, client) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const guildId = interaction.guildId;
      const targetChannel = interaction.options.getChannel('channel');

      const guild = await Guild.findOne({ guildId });
      if (!guild?.helperConfig?.enabled) {
        return interaction.editReply('❌ Helper system not configured. Use `/helper_setup` first!');
      }

      // Cool panel embed
      const panelEmbed = new EmbedBuilder()
        .setTitle('🌟 **Helper Staff Applications**')
        .setDescription('✨ Click the button below to start your journey as a Helper!')
        .setColor(0x9B59B6) // purple
        .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 1024 }))
        .addFields(
          {
            name: '📋 **Requirements**',
            value: '```• Be active and helpful\n• Good communication skills\n• Want to assist the community```',
            inline: false
          },
          {
            name: '⏳ **Note**',
            value: '```One application per 24 hours. Answer all questions carefully!```',
            inline: false
          }
        )
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
        .setTimestamp();

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('helper_apply')
            .setLabel('🙋 Apply Now')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📝')
        );

      await targetChannel.send({ embeds: [panelEmbed], components: [row] });
      await interaction.editReply({ content: `✅ Application panel sent to ${targetChannel}!`, ephemeral: true });
    } catch (error) {
      console.error('Error in helper_panel execute:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ An unexpected error occurred.', ephemeral: true });
      } else {
        await interaction.editReply({ content: '❌ An unexpected error occurred.', ephemeral: true }).catch(() => {});
      }
    }
  },

  // ==================== HANDLE APPLY BUTTON ====================
  handleApply: async (interaction, client) => {
    console.log('✅ handleApply triggered by', interaction.user.tag); // Log for debugging
    try {
      const modal = new ModalBuilder()
        .setCustomId('helper_modal')
        .setTitle('🙋 Helper Application Form');

      const whyHelper = new TextInputBuilder()
        .setCustomId('why_helper')
        .setLabel('1. Why do you want to be a Helper?')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Tell us why you want to be a helper...')
        .setRequired(true);

      const assist = new TextInputBuilder()
        .setCustomId('how_assist')
        .setLabel('2. How would you assist the community?')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('How would you help members...')
        .setRequired(true);

      const experience = new TextInputBuilder()
        .setCustomId('experience')
        .setLabel('3. Any experience as helper/mod?')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Previous experience...')
        .setRequired(true);

      const activity = new TextInputBuilder()
        .setCustomId('activity')
        .setLabel('4. How active are you?')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Hours per day/week')
        .setRequired(true);

      const other = new TextInputBuilder()
        .setCustomId('other')
        .setLabel('5. Anything else?')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Any additional info...')
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder().addComponents(whyHelper),
        new ActionRowBuilder().addComponents(assist),
        new ActionRowBuilder().addComponents(experience),
        new ActionRowBuilder().addComponents(activity),
        new ActionRowBuilder().addComponents(other)
      );

      await interaction.showModal(modal);
    } catch (error) {
      console.error('Error in handleApply:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Failed to open application form.', ephemeral: true }).catch(() => {});
      }
    }
  },

  // ==================== HANDLE MODAL SUBMIT ====================
  handleSubmit: async (interaction, client) => {
    try {
      const guildId = interaction.guildId;
      const userId = interaction.user.id;

      const guild = await Guild.findOne({ guildId });
      if (!guild?.helperConfig?.enabled) {
        await interaction.reply({ content: '❌ Helper system not configured.', ephemeral: true });
        return;
      }

      let user = await User.findOne({ userId });
      if (!user) {
        user = new User({ userId, username: interaction.user.tag });
      }
      if (!user.helperApplications) user.helperApplications = [];

      // Cooldown check (24h)
      const lastApp = user.helperApplications
        .filter(a => a.guildId === guildId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

      if (lastApp) {
        const hoursSince = (Date.now() - new Date(lastApp.createdAt).getTime()) / (1000 * 60 * 60);
        if (hoursSince < 24) {
          await interaction.reply({
            content: `⏳ You must wait **${Math.round(24 - hoursSince)} hours** before applying again.`,
            ephemeral: true
          });
          return;
        }
      }

      if (lastApp && lastApp.status === 'pending') {
        await interaction.reply({ content: '❌ You already have a pending application!', ephemeral: true });
        return;
      }

      const whyHelper = interaction.fields.getTextInputValue('why_helper');
      const howAssist = interaction.fields.getTextInputValue('how_assist');
      const experience = interaction.fields.getTextInputValue('experience');
      const activity = interaction.fields.getTextInputValue('activity');
      const other = interaction.fields.getTextInputValue('other') || 'None';

      const appId = 'HLPR' + Date.now().toString(36).toUpperCase();

      const application = {
        id: appId,
        guildId,
        username: interaction.user.tag,
        userId,
        whyHelper,
        howAssist,
        experience,
        activity,
        other,
        status: 'pending',
        createdAt: new Date()
      };

      user.helperApplications.push(application);
      await user.save();

      const logChannelId = guild.helperConfig.logChannel;
      const logChannel = interaction.guild.channels.cache.get(logChannelId);

      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle(`📬 New Helper Application #${appId}`)
          .setColor(0x5865F2) // blurple
          .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
          .addFields(
            { name: '👤 Applicant', value: interaction.user.toString(), inline: true },
            { name: '🆔 User ID', value: userId, inline: true },
            { name: '⏰ Applied', value: `<t:${Math.floor(Date.now()/1000)}:R>`, inline: true },
            { name: '📋 **1. Why Helper?**', value: whyHelper.slice(0, 1024), inline: false },
            { name: '💬 **2. How Assist?**', value: howAssist.slice(0, 1024), inline: false },
            { name: '🎓 **3. Experience**', value: experience.slice(0, 1024), inline: false },
            { name: '⏳ **4. Activity**', value: activity, inline: true },
            { name: '📌 **5. Other**', value: other, inline: true }
          )
          .setFooter({ text: `Application ID: ${appId}` })
          .setTimestamp();

        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`helper_accept_${appId}`)
              .setLabel('✅ Accept')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`helper_deny_${appId}`)
              .setLabel('❌ Deny')
              .setStyle(ButtonStyle.Danger)
          );

        const logMsg = await logChannel.send({ embeds: [logEmbed], components: [row] });
        application.messageId = logMsg.id;
        application.channelId = logChannel.id;
        await user.save();
      }

      await interaction.reply({ 
        content: `✅ Your application has been submitted! ID: \`${appId}\`\nPlease wait for staff to review.`, 
        ephemeral: true 
      });
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Failed to submit application.', ephemeral: true }).catch(() => {});
      }
    }
  },

  // ==================== HANDLE ACCEPT ====================
  handleAccept: async (interaction, client) => {
    try {
      const guildId = interaction.guildId;
      const appId = interaction.customId.replace('helper_accept_', '');

      const guild = await Guild.findOne({ guildId });
      if (!guild?.helperConfig) {
        await interaction.reply({ content: '❌ System not configured.', ephemeral: true });
        return;
      }

      const staffRoleId = guild.helperConfig.staffRole;
      if (!interaction.member.roles.cache.has(staffRoleId) && !interaction.member.permissions.has('Administrator')) {
        await interaction.reply({ content: '❌ You cannot review applications.', ephemeral: true });
        return;
      }

      const users = await User.find({ 'helperApplications.guildId': guildId, 'helperApplications.id': appId });
      let targetUser, targetApp;
      for (const u of users) {
        const app = u.helperApplications.find(a => a.id === appId);
        if (app) {
          targetUser = u;
          targetApp = app;
          break;
        }
      }

      if (!targetUser || !targetApp) {
        await interaction.reply({ content: '❌ Application not found!', ephemeral: true });
        return;
      }

      if (targetApp.status !== 'pending') {
        await interaction.reply({ content: '❌ Application already processed.', ephemeral: true });
        return;
      }

      targetApp.status = 'accepted';
      targetApp.reviewedBy = interaction.user.tag;
      targetApp.reviewedAt = new Date();
      await targetUser.save();

      const discordUser = await client.users.fetch(targetUser.userId).catch(() => null);
      if (discordUser) {
        try {
          await discordUser.send({
            embeds: [
              new EmbedBuilder()
                .setTitle('✅ Helper Application Accepted!')
                .setDescription(`Congratulations! Your helper application in **${interaction.guild.name}** has been accepted! Welcome to the team 🎉`)
                .setColor(0x57F287)
            ]
          });
        } catch (e) {}
      }

      const acceptedRoleId = guild.helperConfig.acceptedRole;
      const member = interaction.guild.members.cache.get(targetUser.userId);
      if (member && acceptedRoleId) {
        try { await member.roles.add(acceptedRoleId); } catch (e) {}
      }

      const newEmbed = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor(0x57F287)
        .addFields({ name: '✅ Status', value: `**ACCEPTED** by ${interaction.user.tag}`, inline: true });

      await interaction.message.edit({ embeds: [newEmbed], components: [] });
      await interaction.reply({ content: '✅ Application accepted!', ephemeral: true });
    } catch (error) {
      console.error('Error in handleAccept:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Failed to accept application.', ephemeral: true }).catch(() => {});
      }
    }
  },

  // ==================== HANDLE DENY ====================
  handleDeny: async (interaction, client) => {
    try {
      const guildId = interaction.guildId;
      const appId = interaction.customId.replace('helper_deny_', '');

      const guild = await Guild.findOne({ guildId });
      if (!guild?.helperConfig) {
        await interaction.reply({ content: '❌ System not configured.', ephemeral: true });
        return;
      }

      const staffRoleId = guild.helperConfig.staffRole;
      if (!interaction.member.roles.cache.has(staffRoleId) && !interaction.member.permissions.has('Administrator')) {
        await interaction.reply({ content: '❌ You cannot review applications.', ephemeral: true });
        return;
      }

      const users = await User.find({ 'helperApplications.guildId': guildId, 'helperApplications.id': appId });
      let targetUser, targetApp;
      for (const u of users) {
        const app = u.helperApplications.find(a => a.id === appId);
        if (app) {
          targetUser = u;
          targetApp = app;
          break;
        }
      }

      if (!targetUser || !targetApp) {
        await interaction.reply({ content: '❌ Application not found!', ephemeral: true });
        return;
      }

      if (targetApp.status !== 'pending') {
        await interaction.reply({ content: '❌ Application already processed.', ephemeral: true });
        return;
      }

      targetApp.status = 'denied';
      targetApp.reviewedBy = interaction.user.tag;
      targetApp.reviewedAt = new Date();
      await targetUser.save();

      const discordUser = await client.users.fetch(targetUser.userId).catch(() => null);
      if (discordUser) {
        try {
          await discordUser.send({
            embeds: [
              new EmbedBuilder()
                .setTitle('❌ Helper Application Denied')
                .setDescription(`Your helper application in **${interaction.guild.name}** has been denied. Thank you for your interest!`)
                .setColor(0xED4245)
            ]
          });
        } catch (e) {}
      }

      const newEmbed = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor(0xED4245)
        .addFields({ name: '❌ Status', value: `**DENIED** by ${interaction.user.tag}`, inline: true });

      await interaction.message.edit({ embeds: [newEmbed], components: [] });
      await interaction.reply({ content: '✅ Application denied!', ephemeral: true });
    } catch (error) {
      console.error('Error in handleDeny:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Failed to deny application.', ephemeral: true }).catch(() => {});
      }
    }
  }
};