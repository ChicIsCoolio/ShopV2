const fs = require('fs');
const path = require('path');
const { loadImage, Image, Canvas } = require('canvas');
const {performance} = require('perf_hooks');

const cachePath = './cache/';

function getPages() {
    return fs.readdirSync(cachePath).filter(name => name.startsWith('__Page'));
}

function clearPages() {
    return new Promise((resolve, reject) => {
        var promises = [];
        
        getPages().forEach(file => {
            promises.push(new Promise((resolve, reject) => {
                fs.rmSync(cachePath + file);
                resolve();
            }));
        })

        Promise.allSettled(promises).then(() => {
            resolve();
        }, reason => reject(reason));
    });
}

/**
 * @param {string} name 
 * @returns {string}
 */
function contains(name) {
    return fs.existsSync(cachePath + name);
}

/**
 * @param {string} name 
 * @param {Buffer} buffer 
 */
function add(name, buffer) {
    return new Promise((resolve, reject) => {
        fs.writeFileSync(cachePath + name, buffer);
        resolve();
    });
}

/**
 * @param {string} name 
 * @param {Buffer} buffer 
 */
function addSync(name, buffer) {
    fs.writeFileSync(cachePath + name, buffer);
}

/**
 * @param {string} name
 * @param {('ascii'|'base64'|'base64url'|'binary'|'hex'|'latin1'|'ucs-2'|'ucs2'|'utf-8'|'utf16le'|'utf8')} [encoding]
 */
function getText(name, encoding = 'utf-8') {
    return new Promise(resolve => resolve(fs.readFileSync(cachePath + name, { encoding: encoding })));
}

/**
 * @param {string} name
 * @param {('ascii'|'base64'|'base64url'|'binary'|'hex'|'latin1'|'ucs-2'|'ucs2'|'utf-8'|'utf16le'|'utf8')} [encoding]
 */
function getTextSync(name, encoding = 'utf-8') {
    return fs.readFileSync(cachePath + name, { encoding: encoding });
}

/**
 * @param {string} name
 * @param {string} data
 * @param {('ascii'|'base64'|'base64url'|'binary'|'hex'|'latin1'|'ucs-2'|'ucs2'|'utf-8'|'utf16le'|'utf8')} [encoding]
 * @returns {Promise<void>}
 */
function addText(name, data, encoding = 'utf-8') {
    return new Promise(resolve => {
        fs.writeFileSync(cachePath + name, data, { encoding: encoding });
        resolve();
    });
}

/**
 * @param {string} name
 * @param {string} data
 * @param {('ascii'|'base64'|'base64url'|'binary'|'hex'|'latin1'|'ucs-2'|'ucs2'|'utf-8'|'utf16le'|'utf8')} [encoding]
 */
function addTextSync(name, data, encoding = 'utf-8') {
    fs.writeFileSync(cachePath + name, data, { encoding: encoding });
}

/**
 * @param {string} name
 * @returns {Promise<Image>}
 */
function getImage(name) {
    return loadImage(cachePath + name);
}

/**
 * @param {string} name 
 * @param {Image} image
 * @param {('raw'|'image/png'|'image/jpeg'|'application/pdf')} [format]
 * @returns {Promise<void>} 
 */
function addImage(name, image, format) {
    var canvas = new Canvas(image.width, image.height);
    canvas.getContext('2d').drawImage(image, 0, 0);
    return addCanvas(name, canvas, format);
}

/**
 * @param {string} name
 * @returns {Promise<Canvas>}
 */
function getCanvas(name) {
    return new Promise((resolve, reject) => {
        getImage(name).then(image => {
            var canvas = new Canvas(image.width, image.height);
            canvas.getContext('2d').drawImage(image, 0, 0);
            resolve(canvas);
        }, reject);
    });
}


/**
 * @param {string} name 
 * @param {Canvas} canvas 
 * @param {('raw'|'image/png'|'image/jpeg'|'application/pdf')} [format]
 * @returns {Promise<void>}
 */
function addCanvas(name, canvas, format = 'image/png') {
    return add(name, canvas.toBuffer(format));
}

/**
 * @param {string} url
 * @param {string} [name]
 * @param {('raw'|'image/png'|'image/jpeg'|'application/pdf')} [format]
 * @return {Promise<Image>}
 */
function downloadImage(url, name, format = 'image/png') {
    var start = performance.now();

    if (!name) name = path.basename(url);
    if (contains(name)) return getImage(name);
    else return new Promise((resolve, reject) => {    
        console.log(`downloading image: \x1b[33m${name}\x1b[0m, from: \x1b[33m${url}\x1b[0m`);
        loadImage(url).then(image => {
            console.log(`image: \x1b[33m${name}\x1b[0m downloaded in \x1b[33m${Math.round(performance.now() - start) / 1000}\x1b[0m seconds`);

            addImage(name, image, format);
            resolve(image);
        }, reason => reject(reason))
    });
}

/**
 * @param {string} url 
 * @param {string} [name]
 * @param {('png'|'jpeg'|'jpg'|'svg'|'pdf')} [format]
 * @returns {Promise<Canvas>} 
 */
function downloadCanvas(url, name, format = 'png') {
    if (!name) name = path.basename(url);
    return new Promise((resolve, reject) => {
        downloadImage(url, name, format).then(image => {
            var canvas = new Canvas(image.width, image.height);
            canvas.getContext('2d').drawImage(image, 0, 0);
            resolve(canvas);
        }, reason => reject(reason));
    });
}

module.exports = {
    cachePath, getPages, clearPages, contains, getText, getTextSync, addText, addTextSync, getImage, addImage, getCanvas, addCanvas, downloadImage, downloadCanvas
}