process.on('uncaughtException', err => console.error(err))
require('dotenv').config();

const { registerFont } = require('canvas');
registerFont('./resources/BurbankCondensed.ttf', { family: "BurbankCondensed" });
registerFont('./resources/BurbankRegular.otf', { family: "BurbankRegular" });


const env = require('./modules/Env');
const fs = require('fs');
const { resolve } = require('path');
const server = require('./modules/server');
const { getItemShop } = require('./modules/ItemShop');
const twitter = require('./modules/Twitter');
const { getImage } = require('./modules/resources');
server.start();

if (!env.getBoolean('DisableTwitter')) {
    twitter.start();
}

fs.watchFile('./config.json', () => {
    delete require.cache[require.resolve('./config.json')];
    console.log("reloading config");
})

fs.watchFile('./modules/drawing.js', () => {
    delete require.cache[require.resolve('./modules/drawing.js')];
    console.log("reloading drawing.js");
})