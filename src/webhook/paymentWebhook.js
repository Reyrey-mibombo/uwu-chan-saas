const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
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

// Idempotency check helper
async function checkExistingLicense(paymentId, provider) {
  return await License.findOne({ paymentId, paymentProvider: provider });
}

router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { userId, guildId, tier, planType } = session.metadata;

        if (!userId || !guildId || !tier) {
          logger.error('Missing required metadata in Stripe session');
          return res.status(400).json({ error: 'Missing metadata' });
        }

        // Idempotency check
        const existingLicense = await checkExistingLicense(session.id, 'stripe');
        if (existingLicense) {
          logger.info(`Duplicate Stripe webhook received for session ${session.id}`);
          return res.json({ received: true, duplicate: true });
        }

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
          try {
            const member = await guild.members.fetch(userId);
            if (member) {
              await member.send(`✅ Your **${tier}** subscription is now active!`).catch(() => {});
            }
          } catch (e) {}
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
  } catch (error) {
    logger.error('Stripe webhook processing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PayPal webhook verification placeholder
// Note: PayPal webhook signature verification should be implemented
// Reference: https://developer.paypal.com/docs/api/webhooks/v1/#verify-webhook-signature
async function verifyPayPalWebhook(req) {
  // TODO: Implement actual PayPal webhook signature verification
  // This requires PayPal's certificate chain validation
  // For now, implement a basic check - in production, use PayPal SDK
  const transmissionId = req.headers['paypal-transmission-id'];
  const certId = req.headers['paypal-cert-id'];
  const signature = req.headers['paypal-transmission-sig'];
  const timestamp = req.headers['paypal-transmission-time'];
  
  if (!transmissionId || !certId || !signature || !timestamp) {
    return false;
  }
  
  // Basic timestamp check (prevent replay attacks older than 5 minutes)
  const eventTime = new Date(timestamp).getTime();
  const now = Date.now();
  if (now - eventTime > 5 * 60 * 1000) {
    logger.warn('PayPal webhook timestamp too old');
    return false;
  }
  
  return true;
}

router.post('/paypal', express.json(), async (req, res) => {
  try {
    // Verify webhook signature
    const isValid = await verifyPayPalWebhook(req);
    if (!isValid) {
      logger.error('PayPal webhook verification failed');
      return res.status(400).json({ error: 'Webhook verification failed' });
    }

    const { event_type, resource } = req.body;

    logger.info(`PayPal webhook received: ${event_type}`);

    switch (event_type) {
      case 'CHECKOUT.ORDER.APPROVED': {
        const order = resource;
        
        // Safely parse custom_id with error handling
        let metadata = {};
        if (order.custom_id) {
          try {
            metadata = JSON.parse(order.custom_id);
          } catch (parseError) {
            logger.error('Invalid custom_id JSON in PayPal webhook:', parseError);
            return res.status(400).json({ error: 'Invalid metadata format' });
          }
        }
        
        const { userId, guildId, tier, planType } = metadata;
        
        if (!userId || !guildId || !tier) {
          logger.error('Missing required metadata in PayPal order');
          return res.status(400).json({ error: 'Missing metadata' });
        }
        
        // Idempotency check
        const existingLicense = await checkExistingLicense(order.id, 'paypal');
        if (existingLicense) {
          logger.info(`Duplicate PayPal webhook received for order ${order.id}`);
          return res.json({ received: true, duplicate: true });
        }
        
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
  } catch (error) {
    logger.error('PayPal webhook processing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/create-checkout-session', express.json(), async (req, res) => {
  try {
    const { plan, guildId, userId } = req.body;

    // Validate required fields
    if (!plan || !guildId || !userId) {
      return res.status(400).json({ error: 'Missing required fields: plan, guildId, userId' });
    }

    // Validate plan format
    const validPlans = ['premium_monthly', 'premium_yearly', 'premium_lifetime', 
                        'enterprise_monthly', 'enterprise_yearly', 'enterprise_lifetime'];
    if (!validPlans.includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    // Validate guildId and userId are numeric (Discord IDs)
    if (!/^\d{17,20}$/.test(String(guildId)) || !/^\d{17,20}$/.test(String(userId))) {
      return res.status(400).json({ error: 'Invalid guildId or userId format' });
    }

    const prices = {
      premium_monthly: { price: 'price_premium_monthly', name: 'Premium Monthly' },
      premium_yearly: { price: 'price_premium_yearly', name: 'Premium Yearly' },
      premium_lifetime: { price: 'price_premium_lifetime', name: 'Premium Lifetime' },
      enterprise_monthly: { price: 'price_enterprise_monthly', name: 'Enterprise Monthly' },
      enterprise_yearly: { price: 'price_enterprise_yearly', name: 'Enterprise Yearly' },
      enterprise_lifetime: { price: 'price_enterprise_lifetime', name: 'Enterprise Lifetime' }
    };

    const selectedPlan = prices[plan];

    const priceId = process.env[selectedPlan.price];
    if (!priceId) {
      logger.error(`Price ID not configured for plan: ${plan}`);
      return res.status(500).json({ error: 'Price configuration error' });
    }

    const botUrl = process.env.BOT_URL;
    if (!botUrl) {
      logger.error('BOT_URL environment variable not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${botUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${botUrl}/canceled`,
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
