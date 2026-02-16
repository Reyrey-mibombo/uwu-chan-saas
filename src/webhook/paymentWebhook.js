const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const logger = require('../utils/logger');

router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const licenseSystem = req.app.locals.client?.systems?.license;

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const { userId, guildId, tier } = session.metadata;

      if (licenseSystem) {
        const license = await licenseSystem.createLicense(userId, tier, {
          id: session.id,
          provider: 'stripe',
          metadata: session
        });

        if (guildId) {
          await licenseSystem.activateLicense(license.key, guildId, userId);
        }

        logger.info(`Premium activated via Stripe for user ${userId}, guild ${guildId}`);
      }
      break;
    }

    case 'invoice.payment_failed': {
      const session = event.data.object;
      logger.warn(`Payment failed for subscription: ${session.subscription}`);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      logger.info(`Subscription cancelled: ${subscription.id}`);
      break;
    }

    default:
      logger.info(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

router.post('/paypal', async (req, res) => {
  logger.info('PayPal webhook received');
  res.json({ received: true });
});

module.exports = router;
