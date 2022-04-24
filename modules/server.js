const express = require('express');
const app = express();

const path = require('path');
const { Entry } = require('./ItemShop');
const { tweetCanvases } = require('./Twitter');


app.get('/generated', (req, res) => {
    var drawing = require('./drawing');
    var page = req.query['page'] ? req.query['page'] : 0;

    drawing.drawShop(null).then(pages => {
        tweetCanvases('shop test', pages);
        
        if (page >= pages.length || page < 0) res.status(404).send(`Out of range (0 - ${pages.length - 1})`);
        else res.contentType('image/png').end(pages[page].toBufferSync('png'));
    });
});

app.get('/shop', (req, res) => require('./ItemShop').getItemShop().then(s => res.json(s)));
app.get('/ping', (req, res) => res.send("pong"));

module.exports = {
    start: function(port) {
        if (port == null) port = 3000;

        app.listen(port);
    }
}