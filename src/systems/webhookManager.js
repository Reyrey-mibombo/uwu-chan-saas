const express = require('express');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { Guild, User } = require('../database/mongo');

class WebhookManager {
  constructor(client) {
    this.client = client;
    this.router = express.Router();
    this.setupRoutes();
  }

  setupRoutes() {
    // Stripe webhook
    this.router.post('/stripe', express.raw({ type: 'application/json' }), this.handleStripeWebhook.bind(this));
    
    // PayPal webhook
    this.router.post('/paypal', express.json(), this.handlePayPalWebhook.bind(this));
    
    // Custom webhook endpoint for external integrations
    this.router.post('/custom/:guildId', express.json(), this.handleCustomWebhook.bind(this));
    
    // GitHub webhook for auto-deployment
    this.router.post('/github', express.json(), this.handleGitHubWebhook.bind(this));
    
    // Twitch webhook for stream notifications
    this.router.post('/twitch/:guildId', express.json(), this.handleTwitchWebhook.bind(this));
    
    // YouTube webhook for upload notifications
    this.router.post('/youtube/:guildId', express.json(), this.handleYouTubeWebhook.bind(this));

    // Health check
    this.router.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
  }

  async handleStripeWebhook(req, res) {
    try {
      const sig = req.headers['stripe-signature'];
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      
      let event;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
      } catch (err) {
        logger.error(`[Webhook] Stripe signature verification failed:`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      logger.info(`[Webhook] Stripe event received: ${event.type}`);

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          await this.processStripePayment(session);
          break;
        }
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object;
          await this.processStripeSubscriptionRenewal(invoice);
          break;
        }
        case 'customer.subscription.deleted': {
          const subscription = event.data.object;
          await this.processStripeCancellation(subscription);
          break;
        }
      }

      res.json({ received: true });
    } catch (error) {
      logger.error('[Webhook] Stripe webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async processStripePayment(session) {
    const { guildId, userId, tier } = session.metadata || {};
    
    if (!guildId || !tier) {
      logger.error('[Webhook] Missing metadata in Stripe session');
      return;
    }

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    await Guild.findOneAndUpdate(
      { guildId },
      {
        $set: {
          'premium.isActive': true,
          'premium.tier': tier,
          'premium.activatedAt': new Date(),
          'premium.expiresAt': expiresAt,
          'premium.paymentProvider': 'stripe',
          'premium.subscriptionId': session.subscription
        }
      }
    );

    await User.findOneAndUpdate(
      { userId },
      {
        $push: {
          licenses: {
            licenseKey: session.id,
            guildId,
            tier,
            activatedAt: new Date(),
            expiresAt,
            isActive: true
          }
        }
      }
    );

    // Notify guild
    await this.notifyGuild(guildId, {
      title: '✅ Premium Activated',
      description: `Your server has been upgraded to ${tier} tier!`,
      color: '#00FF00'
    });

    logger.info(`[Webhook] Processed Stripe payment for guild ${guildId}, tier: ${tier}`);
  }

  async processStripeSubscriptionRenewal(invoice) {
    const subscriptionId = invoice.subscription;
    
    const guild = await Guild.findOne({ 'premium.subscriptionId': subscriptionId });
    if (!guild) return;

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    await Guild.updateOne(
      { guildId: guild.guildId },
      { $set: { 'premium.expiresAt': expiresAt } }
    );

    logger.info(`[Webhook] Renewed subscription for guild ${guild.guildId}`);
  }

  async processStripeCancellation(subscription) {
    const guild = await Guild.findOne({ 'premium.subscriptionId': subscription.id });
    if (!guild) return;

    await Guild.updateOne(
      { guildId: guild.guildId },
      {
        $set: {
          'premium.isActive': false,
          'premium.tier': 'free'
        }
      }
    );

    await this.notifyGuild(guild.guildId, {
      title: '⚠️ Premium Expired',
      description: 'Your premium subscription has ended. Renew to keep access to premium features.',
      color: '#FFA500'
    });

    logger.info(`[Webhook] Cancelled subscription for guild ${guild.guildId}`);
  }

  async handlePayPalWebhook(req, res) {
    try {
      const { event_type, resource } = req.body;
      
      logger.info(`[Webhook] PayPal event received: ${event_type}`);

      switch (event_type) {
        case 'PAYMENT.CAPTURE.COMPLETED':
          await this.processPayPalPayment(resource);
          break;
        case 'BILLING.SUBSCRIPTION.CANCELLED':
          await this.processPayPalCancellation(resource);
          break;
      }

      res.sendStatus(200);
    } catch (error) {
      logger.error('[Webhook] PayPal webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async processPayPalPayment(resource) {
    const customId = resource.custom_id;
    if (!customId) return;

    const [guildId, userId, tier] = customId.split(':');

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    await Guild.findOneAndUpdate(
      { guildId },
      {
        $set: {
          'premium.isActive': true,
          'premium.tier': tier,
          'premium.activatedAt': new Date(),
          'premium.expiresAt': expiresAt,
          'premium.paymentProvider': 'paypal'
        }
      }
    );

    logger.info(`[Webhook] Processed PayPal payment for guild ${guildId}, tier: ${tier}`);
  }

  async processPayPalCancellation(resource) {
    const subscriptionId = resource.id;
    
    const guild = await Guild.findOne({ 'premium.subscriptionId': subscriptionId });
    if (!guild) return;

    await Guild.updateOne(
      { guildId: guild.guildId },
      {
        $set: {
          'premium.isActive': false,
          'premium.tier': 'free'
        }
      }
    );

    logger.info(`[Webhook] Cancelled PayPal subscription for guild ${guild.guildId}`);
  }

  async handleCustomWebhook(req, res) {
    try {
      const { guildId } = req.params;
      const { token, event, data } = req.body;

      // Verify webhook token
      const guild = await Guild.findOne({ guildId });
      if (!guild || guild.webhookToken !== token) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      logger.info(`[Webhook] Custom webhook received for guild ${guildId}: ${event}`);

      switch (event) {
        case 'announcement':
          await this.handleCustomAnnouncement(guildId, data);
          break;
        case 'moderation':
          await this.handleCustomModeration(guildId, data);
          break;
        case 'staff_action':
          await this.handleCustomStaffAction(guildId, data);
          break;
        default:
          return res.status(400).json({ error: 'Unknown event type' });
      }

      res.json({ success: true });
    } catch (error) {
      logger.error('[Webhook] Custom webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async handleCustomAnnouncement(guildId, data) {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return;

    const channel = guild.channels.cache.get(data.channelId);
    if (!channel) return;

    const { EmbedBuilder } = require('discord.js');
    const embed = new EmbedBuilder()
      .setTitle(data.title || 'Announcement')
      .setDescription(data.content)
      .setColor(data.color || '#0099FF')
      .setTimestamp();

    if (data.image) embed.setImage(data.image);

    await channel.send({
      content: data.mention ? '@everyone' : '',
      embeds: [embed]
    });
  }

  async handleCustomModeration(guildId, data) {
    if (this.client.systems.enhancedModeration) {
      switch (data.action) {
        case 'warn':
          await this.client.systems.enhancedModeration.warn(
            guildId,
            data.userId,
            data.reason,
            data.moderatorId || this.client.user.id,
            data.severity || 'medium'
          );
          break;
        case 'mute':
          await this.client.systems.enhancedModeration.mute(
            guildId,
            data.userId,
            data.duration,
            data.reason,
            data.moderatorId || this.client.user.id
          );
          break;
      }
    }
  }

  async handleCustomStaffAction(guildId, data) {
    if (this.client.systems.staffManagement) {
      switch (data.action) {
        case 'add_points':
          await this.client.systems.staffManagement.addPoints(
            guildId,
            data.userId,
            data.points,
            data.reason,
            data.moderatorId
          );
          break;
        case 'promote':
          await this.client.systems.staffManagement.promote(
            guildId,
            data.userId,
            data.newRank,
            data.moderatorId,
            data.reason
          );
          break;
      }
    }
  }

  async handleGitHubWebhook(req, res) {
    try {
      const event = req.headers['x-github-event'];
      const payload = req.body;

      logger.info(`[Webhook] GitHub event received: ${event}`);

      // Handle deployment events
      if (event === 'push' && payload.ref === 'refs/heads/main') {
        // Log deployment info
        logger.info(`[Webhook] Push to main branch detected`);
      }

      res.sendStatus(200);
    } catch (error) {
      logger.error('[Webhook] GitHub webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async handleTwitchWebhook(req, res) {
    try {
      const { subscription, event } = req.body;
      const { guildId } = req.params;

      if (subscription?.type === 'stream.online') {
        await this.notifyStream(guildId, event, 'twitch');
      }

      res.sendStatus(200);
    } catch (error) {
      logger.error('[Webhook] Twitch webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async handleYouTubeWebhook(req, res) {
    try {
      const { guildId } = req.params;
      const data = req.body;

      await this.notifyUpload(guildId, data, 'youtube');

      res.sendStatus(200);
    } catch (error) {
      logger.error('[Webhook] YouTube webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async notifyStream(guildId, event, platform) {
    const guild = await Guild.findOne({ guildId }).lean();
    if (!guild?.notifications?.streamChannel) return;

    const discordGuild = this.client.guilds.cache.get(guildId);
    if (!discordGuild) return;

    const channel = discordGuild.channels.cache.get(guild.notifications.streamChannel);
    if (!channel) return;

    const { EmbedBuilder } = require('discord.js');
    const embed = new EmbedBuilder()
      .setTitle(`${event.broadcaster_user_name} is now live on ${platform}!`)
      .setDescription(event.title || 'Stream started')
      .setURL(`https://${platform}.tv/${event.broadcaster_user_name}`)
      .setColor('#9146FF')
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  }

  async notifyUpload(guildId, data, platform) {
    const guild = await Guild.findOne({ guildId }).lean();
    if (!guild?.notifications?.uploadChannel) return;

    const discordGuild = this.client.guilds.cache.get(guildId);
    if (!discordGuild) return;

    const channel = discordGuild.channels.cache.get(guild.notifications.uploadChannel);
    if (!channel) return;

    const { EmbedBuilder } = require('discord.js');
    const embed = new EmbedBuilder()
      .setTitle(`New ${platform} upload: ${data.title}`)
      .setDescription(data.description?.substring(0, 200) || '')
      .setURL(data.link)
      .setColor('#FF0000')
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  }

  async notifyGuild(guildId, notification) {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return;

    const guildData = await Guild.findOne({ guildId }).lean();
    const channelId = guildData?.channels?.logs || guildData?.channels?.welcome;
    if (!channelId) return;

    const channel = guild.channels.cache.get(channelId);
    if (!channel) return;

    const { EmbedBuilder } = require('discord.js');
    const embed = new EmbedBuilder()
      .setTitle(notification.title)
      .setDescription(notification.description)
      .setColor(notification.color || '#0099FF')
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => {});
  }

  getRouter() {
    return this.router;
  }
}

module.exports = WebhookManager;
