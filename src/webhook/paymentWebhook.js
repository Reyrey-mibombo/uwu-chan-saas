const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const axios = require('axios');
const logger = require('../utils/logger');
const { License, Guild } = require('../database/mongo');

const PLAN_DURATIONS = {
  premium_monthly: 30,
  premium_yearly: 365,
  premium_lifetime: 3650,
  enterprise_monthly: 30,
  enterprise_yearly: 365,
  enterprise_lifetime: 3650
};

router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const { userId, guildId, tier, planType } = session.metadata;

      const duration = PLAN_DURATIONS[planType] || 30;

      await License.create({
        key: `STRIPE-${session.id.slice(0, 8).toUpperCase()}`,
        userId,
        guildId,
        tier,
        status: 'active',
        activatedAt: new Date(),
        expiresAt: new Date(Date.now() + duration * 24 * 60 * 60 * 1000),
        paymentId: session.id,
        paymentProvider: 'stripe'
      });

      await Guild.findOneAndUpdate(
        { guildId },
        {
          $set: {
            'premium.isActive': true,
            'premium.tier': tier,
            'premium.activatedAt': new Date(),
            'premium.expiresAt': new Date(Date.now() + duration * 24 * 60 * 60 * 1000),
            'premium.paymentProvider': 'stripe'
          }
        },
        { upsert: true }
      );

      const guild = await global.client?.guilds?.cache?.get(guildId);
      if (guild) {
        const member = await guild.members.fetch(userId);
        if (member) {
          try {
            await member.send(`✅ Your **${tier}** subscription is now active!`);
          } catch (e) {}
        }
      }

      logger.info(`✅ Premium activated via Stripe for user ${userId}, guild ${guildId}, tier ${tier}`);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      logger.warn(`⚠️ Payment failed for invoice: ${invoice.id}`);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      
      await License.findOneAndUpdate(
        { paymentId: subscription.id },
        { status: 'expired' }
      );

      const license = await License.findOne({ paymentId: subscription.id });
      if (license?.guildId) {
        await Guild.findOneAndUpdate(
          { guildId: license.guildId },
          {
            $set: {
              'premium.isActive': false,
              'premium.tier': 'free'
            }
          }
        );
      }

      logger.info(`❌ Subscription cancelled: ${subscription.id}`);
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object;
      logger.info(`💰 Payment received: ${invoice.id}`);
      break;
    }
  }

  res.json({ received: true });
});

router.post('/paypal', async (req, res) => {
  const { event_type, resource } = req.body;

  logger.info(`PayPal webhook received: ${event_type}`);

  switch (event_type) {
    case 'CHECKOUT.ORDER.APPROVED': {
      const order = resource;
      const { userId, guildId, tier, planType } = order.custom_id ? JSON.parse(order.custom_id) : {};
      
      const duration = PLAN_DURATIONS[planType] || 30;

      await License.create({
        key: `PAYPAL-${order.id.slice(0, 8).toUpperCase()}`,
        userId,
        guildId,
        tier,
        status: 'active',
        activatedAt: new Date(),
        expiresAt: new Date(Date.now() + duration * 24 * 60 * 60 * 1000),
        paymentId: order.id,
        paymentProvider: 'paypal'
      });

      await Guild.findOneAndUpdate(
        { guildId },
        {
          $set: {
            'premium.isActive': true,
            'premium.tier': tier,
            'premium.activatedAt': new Date(),
            'premium.expiresAt': new Date(Date.now() + duration * 24 * 60 * 60 * 1000),
            'premium.paymentProvider': 'paypal'
          }
        },
        { upsert: true }
      );

      logger.info(`✅ Premium activated via PayPal for user ${userId}, guild ${guildId}`);
      break;
    }

    case 'PAYMENT.CAPTURE.COMPLETED': {
      logger.info(`💰 PayPal payment captured: ${resource.id}`);
      break;
    }

    case 'CUSTOMER.SUBSCRIPTION.DELETED': {
      const subscription = resource;
      
      await License.findOneAndUpdate(
        { paymentId: subscription.id },
        { status: 'expired' }
      );

      logger.info(`❌ PayPal subscription cancelled: ${subscription.id}`);
      break;
    }
  }

  res.json({ received: true });
});

router.post('/create-checkout-session', async (req, res) => {
  const { plan, guildId, userId } = req.body;

  const prices = {
    premium_monthly: { price: 'price_premium_monthly', name: 'Premium Monthly' },
    premium_yearly: { price: 'price_premium_yearly', name: 'Premium Yearly' },
    premium_lifetime: { price: 'price_premium_lifetime', name: 'Premium Lifetime' },
    enterprise_monthly: { price: 'price_enterprise_monthly', name: 'Enterprise Monthly' },
    enterprise_yearly: { price: 'price_enterprise_yearly', name: 'Enterprise Yearly' },
    enterprise_lifetime: { price: 'price_enterprise_lifetime', name: 'Enterprise Lifetime' }
  };

  const selectedPlan = prices[plan];

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: process.env[selectedPlan.price] || selectedPlan.price,
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.BOT_URL || 'https://yourbot.com'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BOT_URL || 'https://yourbot.com'}/canceled`,
      metadata: {
        userId,
        guildId,
        tier: plan.includes('enterprise') ? 'enterprise' : 'premium',
        planType: plan
      }
    });

    res.json({ url: session.url });
  } catch (error) {
    logger.error('Stripe checkout error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
