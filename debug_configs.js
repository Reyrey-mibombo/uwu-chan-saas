require('dotenv').config();
const mongoose = require('mongoose');
const { ApplicationConfig } = require('./src/database/mongo');

async function test() {
    await mongoose.connect(process.env.MONGODB_URI);
    const configs = await ApplicationConfig.find({});
    console.log(JSON.stringify(configs, null, 2));
    process.exit(0);
}
test();
