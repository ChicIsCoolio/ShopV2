const env = require('./Env');
const { response } = require('express');
const { RecurrenceRule, scheduleJob } = require('node-schedule');
const { Canvas } = require('skia-canvas/lib');
const Twitter = require('twitter');
const { drawShop } = require('./drawing');
const { getItemShop } = require('./ItemShop');
const client = new Twitter({
    consumer_key: env.getString('TWITTER_CONSUMER_KEY'),
    consumer_secret: env.getString('TWITTER_CONSUMER_SECRET'),
    access_token_key: env.getString('TWITTER_ACCESS_TOKEN_KEY'),
    access_token_secret: env.getString('TWITTER_ACCESS_TOKEN_SECRET')
});

function start() {
    var rule = new RecurrenceRule();
    rule.tz = "Etc/UTC";
    rule.hour = 0;

    scheduleJob('shop', rule, tweetShop);
}

async function tweetShop() {
    var shop = await getItemShop();
    var status = `Fortnite Item Shop:\n` + 
                 `${shop.date.toLocaleDateString('en-uk', { dateStyle: 'long' })}\n\n` +
                 `Consider using code 'Chic' to support me!\n#EpicPartner`;

    tweetCanvases(status, await drawShop(shop));
}

function tweet(status) {
    return client.post('statuses/update', {
        status: status
    });
}

/**
 * @param {Canvas} canvas 
 * @returns {Promise<{media_id:number, media_id_string:string, media_key:string, size:number, expires_after_secs:number, image:{image_type:string, w:number, h:number}}>}
 */
function uploadCanvas(canvas) {
    return new Promise((resolve, reject) => {
        client.post('media/upload', {
            media: canvas.toBufferSync('png')
        }).then(resolve, reject);
    });
}

/**
 * @param {string} status 
 * @param {Canvas} canvas
 * @returns {Promise<Twitter.ResponseData>} 
 */
function tweetCanvas(status, canvas) {
    return new Promise((resolve, reject) => {
        uploadCanvas(canvas).then(response => {
            client.post('statuses/update', {
                status: status,
                media_ids: response.media_id_string
            }).then(resolve, reject);
        }, reject);
    });
}

/**
 * @param {string} status 
 * @param {Canvas[]} canvases 
 * @param {Promise<Twitter.ResponseData>}
 */
function tweetCanvases(status, canvases) {
    return new Promise((resolve, reject) => {
        var promises = [];
        canvases.forEach(canvas => promises.push(uploadCanvas(canvas)));

        Promise.allSettled(promises).then(results => {
            client.post('statuses/update', {
                status: status,
                media_ids: results.map(result => result.value.media_id_string).join(',')
            }).then(resolve, reject);
        });
    });
}

module.exports = {
    start, tweet, tweetCanvas, tweetCanvases, tweetShop
}