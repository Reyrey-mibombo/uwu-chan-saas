const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    date: { type: String, required: true }, // Format: YYYY-MM-DD
    messageCount: { type: Number, default: 0 }
});

module.exports = mongoose.model('DailyActivity', activitySchema);