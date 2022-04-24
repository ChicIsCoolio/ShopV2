const { Canvas } = require('skia-canvas');
const { Entry, Shop, Section, getItemShopSync, getItemShop } = require('./ItemShop');

const { downloadImage, contains, getCanvas, addCanvas, getImage, addText, clearResults, clearPages, getText, getPages } = require('./Cache');
const { diffieHellman } = require('crypto');
const resources = require('./resources');

/**
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} fontSize 
 * @param {string} text 
 * @param {number} maxWidth 
 * @param {('BurbankRegular'|'BurbankCondensed')} [font]
 * @returns {{fontSize:number, measure:TextMetrics}}
 */
function limitFontSize(ctx, fontSize, text, maxWidth, font = 'BurbankRegular') {
    ctx.font = `${fontSize}px ${font}`;
    var measure = ctx.measureText(text);

    while (measure.width > maxWidth) {
        ctx.font = `${--fontSize}px ${font}`;
        measure = ctx.measureText(text);
    }

    return { fontSize: fontSize, measure: measure };
}

/**
 * @param {Section} section
 * @returns {{x:number, y:number}[]}
 */
function calculateSection(section) {
    const config = require('../config.json');

    var coordinates = [];

    var x = config.tile.gap;
    var small = 0;

    section.entries.forEach(entry => {
        var y = config.tile.gap;
        var xAdd = config.tile.size[entry.tileSize].width + config.tile.gap;
        
        if (entry.tileSize == 'Small') {
            if (small == 0) xAdd = 0;
            if (small++ == 1) {
                y += config.tile.size[entry.tileSize].height + config.tile.gap;
                small = 0;
            }
        }

        coordinates.push({ x: x, y: y});
        x += xAdd;
    })

    return coordinates;
}

/**
 * @param {number} numSections 
 * @returns {{numPages:number, perPage:number, lastPage:number}}
 */
function calculateSmartPages(numSections) {
    const config = require('../config.json');
    
    if (numSections <= config.smartPages.activateThreshold) return { numPages: 1, perPage: numSections, lastPage: numSections }

    var sectionsPerPage = config.smartPages.sectionsPerPage;

    var pages = Math.ceil(numSections / sectionsPerPage);
    var lastPage = numSections % sectionsPerPage;

    while (pages > config.smartPages.maxPages || lastPage < config.smartPages.minSectionsPerPage) {
        pages = Math.ceil(numSections / ++sectionsPerPage);
        lastPage = numSections % sectionsPerPage;
    }

    return { numPages: pages, perPage: sectionsPerPage, lastPage: lastPage > 0 ? lastPage : sectionsPerPage }
}

/**
 * @param {Section[]} sections
 * @returns {Section[][]}
 */
 function mapPages(sections) {
    var { numPages, perPage, lastPage } = calculateSmartPages(sections.length);

    var result = [];
    var section = 0;
    for (var i = 0; i < numPages; i++) {
        result[i] = [];

        var sectionCount = i == numPages - 1 ? lastPage : perPage;
        for (var j = 0; j < sectionCount; j++, section++) {
            result[i][j] = sections[section];
        }
    }

    return result;
}

/**
 * @param {Shop} shop 
 * @returns {number}
 */
function calculateShopWidth(shop) {
    const config = require('../config.json');

    var maxWidth = 0;
    var currentWidth = 0;

    var small = 0;

    for (var section of shop.sections) {
        currentWidth = config.tile.gap;

        section.entries.forEach(entry => {

            var width = config.tile.size[entry.tileSize].width + config.tile.gap;
            if (entry.tileSize == 'Small') {
                if (small++ == 1) {
                    width = 0;
                    small = 0;
                }
            }

            currentWidth += width;
        });

        maxWidth = Math.max(maxWidth, currentWidth);
    }

    return maxWidth;
}

/**
 * @param {Entry} entry 
 * @param {boolean} [ignoreCache]
 * @returns {Promise<Canvas>} 
 */
function drawEntry(entry, ignoreCache = false) {
    const config = require('../config.json');

    return new Promise(async (resolve, reject) => {
        if (!ignoreCache && contains(entry.hash() + '.png')) resolve(await getCanvas(entry.hash() + '.png'));
        else {
            const start = performance.now();
            console.log(`drawing entry: \x1b[33m${entry.id}\x1b[0m`);

            const width = config.tile.size[entry.tileSize].width;
            const height = config.tile.size[entry.tileSize].height;
            const canvas = new Canvas(width, height);
            const ctx = canvas.getContext('2d');

            var gradient = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, height);
            gradient.addColorStop(0, config.tile.colorA);
            gradient.addColorStop(config.tile.gradientSize, config.tile.colorB);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);

            entry.getImage().then(image => {
                const dif = entry.tileSize == 'Normal' ? height / image.height : width / image.width;
                const imageWidth = image.width * dif;
                const imageHeight = image.height * dif;

                ctx.shadowColor = 'black';
                ctx.shadowBlur = config.tile.panel.shadowBlur;
                ctx.drawImage(image, (width - imageWidth) / 2, 0, imageWidth, imageHeight);

                const rarity = entry.series && config.tile.panel.rarity.colors[entry.series] ? entry.series : entry.rarity;
                var gradient = ctx.createLinearGradient(0, height - config.tile.panel.rarity.heightA, width, height - config.tile.panel.rarity.heightB);
                gradient.addColorStop(0, config.tile.panel.rarity.colors[rarity].color2);
                gradient.addColorStop(0.3, config.tile.panel.rarity.colors[rarity].color1);
                gradient.addColorStop(1, config.tile.panel.rarity.colors[rarity].color2);

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.moveTo(width, height);
                ctx.lineTo(0, height);
                ctx.lineTo(0, height);
                ctx.lineTo(0, height - config.tile.panel.rarity.heightA);
                ctx.lineTo(width, height - config.tile.panel.rarity.heightB);
                ctx.closePath();
                ctx.fill();

                ctx.shadowBlur = 0;
                ctx.fillStyle = config.tile.panel.color;
                ctx.beginPath();
                ctx.moveTo(width, height);
                ctx.lineTo(0, height);
                ctx.lineTo(0, height - config.tile.panel.heightA);
                ctx.lineTo(width, height - config.tile.panel.heightB);
                ctx.closePath();
                ctx.fill();

                resources.getImage('vbuck').then(vbuck => {
                    ctx.font = '60px BurbankRegular';
                    ctx.fillStyle = config.tile.panel.vbuck.color;
                    
                    var vbuckOffsetX = config.tile.panel.vbuck.offsetX;
                    var vbuckOffsetY = config.tile.panel.vbuck.offsetY;
                    var vbuckSize = config.tile.panel.vbuck.size;
                    var priceHeight = ctx.measureText(entry.finalPrice).actualBoundingBoxAscent;

                    var vX = vbuckOffsetX;
                    var vY = height - vbuckSize - vbuckOffsetY;
                    var pX = vbuckSize + vbuckOffsetX;
                    var pY = height - vbuckOffsetY - (vbuckSize - priceHeight) / 2;

                    ctx.drawImage(vbuck, vX, vY, vbuckSize, vbuckSize);
                    ctx.fillText(entry.finalPrice, pX, pY);

                    ctx.fillStyle = config.tile.panel.nameText.textColor;
                    limitFontSize(ctx, config.tile.panel.nameText.defaultFontSize, entry.name, width - config.tile.panel.nameText.offsetX * 2);
                    ctx.fillText(entry.name, config.tile.panel.nameText.offsetX, height - config.tile.panel.nameText.offsetY);

                    if (entry.banner) {
                        var heightA = config.tile.banner.heightA;
                        var heightB = config.tile.banner.heightB;
                        var maxWidth = config.tile.banner.maxWidth;

                        var fontHeightRatio = config.tile.banner.height / config.tile.banner.fontSize;

                        var { fontSize, measure } = limitFontSize(ctx, config.tile.banner.fontSize, entry.banner.value, maxWidth * width - config.tile.banner.borderThickness * 2);
                        maxWidth = measure.width / width + config.tile.banner.borderThickness / width * 2;
                        var actualHeight = fontHeightRatio * fontSize;

                        var step = heightB - heightA;
                        var xMin = width - maxWidth * width + config.tile.banner.offsetX;
                        var xMax = width + config.tile.banner.offsetX;

                        var yMin = step / width * xMin + heightA;
                        var yMax = step / width * xMax + heightA;

                        ctx.shadowBlur = config.tile.banner.shadowBlur;
                        ctx.lineWidth = config.tile.banner.borderThickness;
                        ctx.strokeStyle = config.tile.banner[entry.banner.intensity].borderColor;
                        ctx.fillStyle = config.tile.banner[entry.banner.intensity].color;
                        ctx.beginPath();
                        ctx.moveTo(xMin, height - yMin);
                        ctx.lineTo(xMin - step * actualHeight / width, height - yMin - actualHeight);
                        ctx.lineTo(xMax - step * actualHeight / width, height - yMax - actualHeight);
                        ctx.lineTo(xMax, height - yMax);
                        ctx.closePath();
                        ctx.fill();
                        ctx.shadowBlur = 0;
                        ctx.stroke();


                        ctx.translate(xMin, height - yMin);
                        ctx.rotate(-Math.atan(step / width));
                        ctx.fillStyle = config.tile.banner[entry.banner.intensity].textColor;
                        ctx.fillText(entry.banner.value, config.tile.banner.borderThickness, (actualHeight - measure.actualBoundingBoxAscent) / -2);
                    }
                    
                    addCanvas(entry.hash() + '.png', canvas);
                    console.log(`entry: \x1b[33m${entry.id}\x1b[0m, drawn in: \x1b[33m${Math.round(performance.now() - start) / 1000}\x1b[0m seconds`);  
                    resolve(canvas);                       
                });
            }, reason => reject(reason));
        }
    });
}

/**
 * @param {Section} section 
 * @param {boolean} [ignoreCache]
 * @returns {Promise<Canvas>}
 */
function drawSection(section, width, height, ignoreCache = false) {
    return new Promise(async (resolve, reject) => {
        if (!ignoreCache && contains(section.hash() + '.png')) resolve(await getCanvas(section.hash() + '.png'));
        else {
            const start = performance.now();
            console.log(`drawing section: \x1b[33m${section.id}\x1b[0m`);

            const config = require('../config.json');
            const coords = calculateSection(section);

            var canvas = new Canvas(width, height)
            var ctx = canvas.getContext('2d');

            ctx.fillStyle = config.section.titleTextColor;
            limitFontSize(ctx, config.section.titleFontSize, section.name, width);
            ctx.fillText(section.name, config.tile.gap, config.section.titleTextOffset);

            var promises = [];
            section.entries.forEach((entry, i) => {
                var promise = drawEntry(entry, ignoreCache);
                promise.then(canvas => {
                    ctx.drawImage(canvas, coords[i].x, coords[i].y + config.section.titleSize);
                });

                promises.push(promise);
            });

            Promise.allSettled(promises).then(() => {
                addCanvas(section.hash() + '.png', canvas);
                console.log(`section: \x1b[33m${section.id}\x1b[0m, drawn in: \x1b[33m${Math.round(performance.now() - start) / 1000}\x1b[0m seconds`);  
                resolve(canvas);
            }, reject);
        }
    });
}

/**
 * @param {Shop} [shop] 
 * @param {boolean} [ignoreCache] 
 * @returns {Promise<Canvas[]>}
 */
function drawShop(shop, ignoreCache = false) {
    return new Promise(async (resolve, reject) => {
        if (!shop) shop = await getItemShop();
        if (!ignoreCache && contains('lastShop') && await getText('lastShop') == shop.hash && getPages().length > 0) {
            var pages = [];
            var names = getPages();
            for (var i in names) {
                pages[i] = await getCanvas(names[i]);
            }

            resolve(pages);
        }
        else {
            await clearPages();

            const start = performance.now();
            console.log(`drawing shop: \x1b[33m${shop.date}\x1b[0m`);

            const config = require('../config.json');
            const width = calculateShopWidth(shop);
            const sectionHeight = config.tile.size.Normal.height + config.tile.gap * 2 + config.section.titleSize;
            
            var promises = []
            var pages = mapPages(shop.sections);
            pages.forEach((page, i) =>
                promises.push(new Promise(async (resolve, reject) => {
                    const height = page.length * sectionHeight + config.tile.gap * 2;
                    var canvas = new Canvas(width, height);
                    var ctx = canvas.getContext('2d');

                    ctx.fillStyle = config.backgroundColor;
                    ctx.fillRect(0, 0, width, height);

                    var promises = [];

                    page.forEach((section, i) => promises.push(new Promise(async (resolve, reject) => {
                        ctx.drawImage(await drawSection(section, width, sectionHeight, ignoreCache), 0, sectionHeight * i)
                        resolve();
                    })));

                    ctx.fillStyle = '#FFFFFF';
                    var { measure } = limitFontSize(ctx, config.smartPages.pageNumberText, `${i + 1} / ${pages.length}`);
                    ctx.fillText(`${i + 1} / ${pages.length}`, (width - measure.width) / 2, height - (config.tile.gap * 3 - measure.actualBoundingBoxAscent) / 2);

                    Promise.allSettled(promises).then(() => resolve(canvas), reject);
                }))
            );

            Promise.allSettled(promises).then(pages => {
                pages.forEach((page, i) => {
                    if (page.status == 'fulfilled') {
                        addCanvas(`__Page${i}.png`, page.value);
                    }
                });
                
                addText('lastShop', shop.hash);
                console.log(`shop: \x1b[33m${shop.date}\x1b[0m, drawn in: \x1b[33m${Math.round(performance.now() - start) / 1000}\x1b[0m seconds`);  
                resolve(pages.map(res => res.value));
            }, reject);
        }
    });
}

module.exports = {
    limitFontSize, drawEntry, drawSection, drawShop
}

// module.exports = {
//     /**
//      * @param {Entry} entry 
//      * @param {} ignoreCache 
//      * @returns 
//      */
//     drawEntry: function(entry, ignoreCache = false) {
//         const config = require('../config.json');
//         const cache = require('./cache');

//         return new Promise((resolve, reject) => {
//             if (false) {}//!ignoreCache && cache.contains(this.hash(entry), 'png')) cache.getImage(this.hash(entry)).then(image => resolve(image), reason => reject(reason));
//             else {
//                 var startTime = performance.now();
//                 console.log(`drawing entry: \x1b[33m${entry.id}\x1b[0m`);

//                 var width = config.tile.size[entry.tileSize].width;
//                 var height = config.tile.size[entry.tileSize].height;

//                 var canvas = new Canvas(width, height);
//                 var ctx = canvas.getContext('2d');

//                 var gradient = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, height);
//                 gradient.addColorStop(0, config.tile.colorA);
//                 gradient.addColorStop(config.tile.gradientSize, config.tile.colorB);
//                 ctx.fillStyle = gradient;

//                 ctx.fillRect(0, 0, width, height);

//                 cache.downloadImage(entry.display.image, entry.id).then(image => {
//                     var dif = height / image.height;
//                     var imageWidth = image.width * dif;
//                     var imageHeight = image.height * dif;
                    
//                     ctx.shadowColor = 'black';
//                     ctx.shadowBlur = config.tile.panel.shadowBlur;
//                     ctx.drawImage(image, (width - imageWidth)/2 + entry.display.scalings.offsetX, (height - imageHeight)/2 + entry.display.scalings.offsetY, imageWidth, imageHeight);

//                     var rarity = config.tile.panel.rarity.colors[entry.simpleRarity] ? entry.simpleRarity : entry.rarity;
//                     var gradient = ctx.createLinearGradient(0, config.tile.panel.rarity.heightA, width + width * 0.05, config.tile.panel.rarity.heightB);
//                     gradient.addColorStop(0, config.tile.panel.rarity.colors[rarity].color5);
//                     gradient.addColorStop(0.15, config.tile.panel.rarity.colors[rarity].color4);
//                     gradient.addColorStop(0.35, config.tile.panel.rarity.colors[rarity].color3);
//                     gradient.addColorStop(0.5, config.tile.panel.rarity.colors[rarity].color2);
//                     gradient.addColorStop(0.75, config.tile.panel.rarity.colors[rarity].color1);
//                     gradient.addColorStop(0.80, config.tile.panel.rarity.colors[rarity].color1);
//                     gradient.addColorStop(0.85, config.tile.panel.rarity.colors[rarity].color2);
//                     gradient.addColorStop(0.90, config.tile.panel.rarity.colors[rarity].color3);
//                     gradient.addColorStop(0.95, config.tile.panel.rarity.colors[rarity].color4);
//                     gradient.addColorStop(1, config.tile.panel.rarity.colors[rarity].color5);

//                     ctx.fillStyle = gradient;
//                     ctx.beginPath();
//                     ctx.moveTo(width, height);
//                     ctx.lineTo(0, height);
//                     ctx.lineTo(0, height - config.tile.panel.rarity.heightA);
//                     ctx.lineTo(width, height - config.tile.panel.rarity.heightB);
//                     ctx.closePath();
//                     ctx.fill();

//                     ctx.shadowBlur = 0;
//                     ctx.fillStyle = config.tile.panel.color;
//                     ctx.beginPath();
//                     ctx.moveTo(width, height);
//                     ctx.lineTo(0, height);
//                     ctx.lineTo(0, height - config.tile.panel.heightA);
//                     ctx.lineTo(width, height - config.tile.panel.heightB);
//                     ctx.closePath();
//                     ctx.fill();
//                     resources.getImage('vbuck').then(vbuck => {
//                         ctx.font = '60px BurbankRegular';
//                         ctx.fillStyle = config.tile.panel.vbuck.color;
                        
//                         var vbuckOffsetX = config.tile.panel.vbuck.offsetX;
//                         var vbuckOffsetY = config.tile.panel.vbuck.offsetY;
//                         var vbuckSize = config.tile.panel.vbuck.size;
//                         var priceHeight = ctx.measureText(entry.finalPrice).actualBoundingBoxAscent;

//                         var vX = vbuckOffsetX;
//                         var vY = height - vbuckSize - vbuckOffsetY;
//                         var pX = vbuckSize + vbuckOffsetX;
//                         var pY = height - vbuckOffsetY - (vbuckSize - priceHeight) / 2;

//                         ctx.drawImage(vbuck, vX, vY, vbuckSize, vbuckSize);
//                         ctx.fillText(entry.finalPrice, pX, pY);

//                         ctx.fillStyle = config.tile.panel.nameText.textColor;
//                         this.limitedFontSize(ctx, config.tile.panel.nameText.defaultFontSize, entry.name, width - config.tile.panel.nameText.offsetX * 2);
//                         ctx.fillText(entry.name, config.tile.panel.nameText.offsetX, height - config.tile.panel.nameText.offsetY);

//                         if (entry.banner) {
//                             var heightA = config.tile.banner.heightA;
//                             var heightB = config.tile.banner.heightB;
//                             var maxWidth = config.tile.banner.maxWidth;

//                             var fontHeightRatio = config.tile.banner.height / config.tile.banner.fontSize;

//                             var [fontSize, measure] = this.limitedFontSize(ctx, config.tile.banner.fontSize, entry.banner.value, maxWidth * width - config.tile.banner.borderThickness * 2);
//                             maxWidth = measure.width / width + config.tile.banner.borderThickness / width * 2;
//                             var actualHeight = fontHeightRatio * fontSize;

//                             var step = heightB - heightA;
//                             var xMin = width - maxWidth * width + config.tile.banner.offsetX;
//                             var xMax = width + config.tile.banner.offsetX;

//                             var yMin = step / width * xMin + heightA;
//                             var yMax = step / width * xMax + heightA;

//                             ctx.shadowBlur = config.tile.banner.shadowBlur;
//                             ctx.lineWidth = config.tile.banner.borderThickness;
//                             ctx.strokeStyle = config.tile.banner[entry.banner.intensity].borderColor;
//                             ctx.fillStyle = config.tile.banner[entry.banner.intensity].color;
//                             ctx.beginPath();
//                             ctx.moveTo(xMin, height - yMin);
//                             ctx.lineTo(xMin - step * actualHeight / width, height - yMin - actualHeight);
//                             ctx.lineTo(xMax - step * actualHeight / width, height - yMax - actualHeight);
//                             ctx.lineTo(xMax, height - yMax);
//                             ctx.closePath();
//                             ctx.fill();
//                             ctx.shadowBlur = 0;
//                             ctx.stroke();

//                             ctx.translate(xMin, height - yMin);
//                             ctx.rotate(-Math.atan(step / width));
//                             ctx.fillStyle = config.tile.banner[entry.banner.intensity].textColor;
//                             ctx.fillText(entry.banner.value,config.tile.banner.borderThickness, (actualHeight - measure.actualBoundingBoxAscent) / -2);
//                         }

//                         cache.addImage(this.hash(entry), canvas);
//                         console.log(`drawing entry finished: \x1b[33m${entry.id}\x1b[0m, in: \x1b[33m${Math.round(performance.now() - startTime) / 1000}\x1b[0m seconds`);
//                         resolve(canvas);
//                     });
//                 }, reason => reject(reason));
//             }
//         });
//     },
//     drawSection: function(section, ignoreCache = false) {
//         const cache = require('./cache');

//         var startTime = performance.now();
        
//         console.log(`drawing section start: ${section.id}`);
//         return new Promise((resolve, reject) => {
//             if (section == null)  reject("section is null");
//             else {
//                 var promises = [];
            
//                 for (const [i, entry] of section.entries.entries()) {
//                     promises.push(this.drawEntry(entry, ignoreCache));
                    
//                     if (i == section.entries.length - 1) Promise.all(promises).then(images => {
//                         cache.addImage('last', images[0]);
//                         resolve();
//                     });
//                 }
//             }
//         });
//     },
//     drawShop: function(storefront, ignoreCache = false) {
//         var startTime = performance.now();

//         console.log("drawing shop start")
//         return new Promise((resolve, reject) => {
//             new Promise((r, j) => { if (storefront == null) storefront = shop.getCurrent().then(shop => r(shop)); else r(storefront) })
//             .then(async s => { storefront = s;
//                 var promises = [];

//                 for (const [i, section] of storefront.sections.entries()) {
//                     promises.push(this.drawSection(section, ignoreCache));

//                     if (i == storefront.sections.length - 1) Promise.all(promises).then(() => {
//                         console.log(`drawing shop finished in: \x1b[33m${Math.round(performance.now() - startTime) / 1000}\x1b[0m seconds`)
//                         resolve();
//                     });
//                 }
//             }, reason => reject(reason));
//         });
//     }
// }