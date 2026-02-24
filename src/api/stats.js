const express = require('express');
const router = express.Router();
const { Guild, User, Ticket } = require('../database/mongo');

router.get('/live', async (req, res) => {
  try {
    // Count the total number of Guilds (Servers using the bot)
    const serversCount = await Guild.countDocuments();
    
    // Count the total number of Users (Staff members registered)
    const usersCount = await User.countDocuments();
    
    // Count the total number of Tickets handled
    const ticketsCount = await Ticket.countDocuments();

    res.json({
      success: true,
      data: {
        servers: serversCount,
        staff: usersCount,
        tickets: ticketsCount
      }
    });
  } catch (error) {
    console.error('[STATS API] Error fetching live stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch live statistics.' });
  }
});

module.exports = router;
