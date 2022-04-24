process.on('uncaughtException', err => console.error(err))
require('dotenv').config();

const env = require('./modules/Env');
const fs = require('fs');
const { FontLibrary, Canvas } = require('skia-canvas/lib');
const { resolve } = require('path');
const server = require('./modules/server');
const { getItemShop } = require('./modules/ItemShop');
const twitter = require('./modules/Twitter');
server.start();

if (!env.getBoolean('DisableTwitter')) {
    twitter.start();
}

FontLibrary.use("BurbankCondensed", ['./resources/BurbankCondensed.ttf']);
FontLibrary.use("BurbankRegular", ['./resources/BurbankRegular.otf']);

fs.watchFile('./config.json', () => {
    delete require.cache[require.resolve('./config.json')];
    console.log("reloading config");
})

fs.watchFile('./modules/drawing.js', () => {
    delete require.cache[require.resolve('./modules/drawing.js')];
    console.log("reloading drawing.js");
})