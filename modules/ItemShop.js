const { default: axios } = require("axios");
const { createHash } = require("crypto");
const { json, raw } = require("express");
const { Image } = require("canvas");
const Cache = require("./Cache");

class Shop {
     //#region getsets
    /**
     * @type {string}
     */
    hash;

    /**
     * @type {Date}
     */
    date;

    /**
     * @type {Section[]}
     */
    sections;
    //#endregion

    /**
     * @param {Object} builder
     * @param {string} builder.hash
     * @param {Date} builder.date
     * @param {Section[]} builder.sections 
     */
    constructor(builder) {
        this.hash = builder.hash;
        this.date = builder.date;
        this.sections = builder.sections || [];
    }
}

class Section {
    /**
     * @type {string}
     */
    id;

    /**
     * @type {string}
     */
    name;

    /**
     * @type {number}
     */
    index;

    /**
     * @type {number}
     */
    landingPriority;

    /**
     * @type {Entry[]}
     */
    entries;

    /**
     * @param {Object} builder
     * @param {string} builder.id
     * @param {string} builder.name
     * @param {number} builder.index
     * @param {number} builder.landingPriority
     * @param {Entry[]} builder.entries
     */
    constructor(builder) {
        this.id = builder.id;
        this.name = builder.name;
        this.index = builder.index;
        this.landingPriority = builder.landingPriority;
        this.entries = builder.entries || [];
    }

    /**
     * @returns {string}
     */
    hash() {
        return createHash('sha256').update(this.id + ';' + this.entries.map(entry => entry.hash()).join(';')).digest('hex');
    }
}

class Entry {
    /**
     * @type {string}
     */
    id;

    /**
     * @type {string}
     */
    name;

    /**
     * @type {('EFortRarity::Common'|'EFortRarity::Uncommon'|'EFortRarity::Rare'|'EFortRarity::Epic'|'EFortRarity::Legendary'|'EFortRarity::Mythic'|'EFortRarity::Exotic')}
     */
    rarity;

    /**
     * @type {('ColumbusSeries'|'CreatorCollabSeries'|'CubeSeries'|'DCSeries'|'FrozenSeries'|'LavaSeries'|'MarvelSeries'|'PlatformSeries'|'ShadowSeries'|'SlurpSeries')}
     */
    series;

    /**
     * @type {number}
     */
    regularPrice;

    /**
     * @type {number}
     */
    finalPrice;

    /**
     * @type {string}
     */
    bundle;

    /**
     * @type {{value:string, intensity:('Low'|'High'), backendValue:string}}
     */
    banner;

    /**
     * @type {number}
     */
    sortPriority;

    /**
     * @type {('Normal'|'Small'|'DoubleWide')}
     */
    tileSize;

    /**
     * @type {string}
     */
    imageUrl;

    /**
     * @type {string[]}
     */
    categories;

    /**
     * @type {Item[]}
     */
    items;

    /**
     * @param {Object} builder
     * @param {string} builder.id
     * @param {string} builder.name
     * @param {('EFortRarity::Common'|'EFortRarity::Uncommon'|'EFortRarity::Rare'|'EFortRarity::Epic'|'EFortRarity::Legendary'|'EFortRarity::Mythic'|'EFortRarity::Exotic')} builder.rarity
     * @param {('ColumbusSeries'|'CreatorCollabSeries'|'CubeSeries'|'DCSeries'|'FrozenSeries'|'LavaSeries'|'MarvelSeries'|'PlatformSeries'|'ShadowSeries'|'SlurpSeries')} builder.series
     * @param {number} builder.regularPrice
     * @param {number} builder.finalPrice
     * @param {string} builder.bundle
     * @param {{value:string, intensity:('Low'|'High'), backendValue:string}} builder.banner
     * @param {number} builder.sortPriority
     * @param {('Normal'|'Small'|'DoubleWide')} builder.tileSize
     * @param {string} builder.imageUrl
     * @param {Item[]} builder.items
     * @param {string[]} builder.categories
     */
    constructor(builder = {}) {
        this.id = builder.id;
        this.name = builder.name;
        this.rarity = builder.rarity;
        this.series = builder.series;
        this.regularPrice = builder.regularPrice;
        this.finalPrice = builder.finalPrice;
        this.bundle = builder.bundle;
        this.banner = builder.banner;
        this.sortPriority = builder.sortPriority;
        this.tileSize = builder.tileSize;
        this.imageUrl = builder.imageUrl;
        this.categories = builder.categories || [];
        this.items = builder.items || [];
    }

    /**
     * @returns {string}
     */
    hash() {
        return createHash('sha256').update(`${this.tileSize}.${this.id}.${this.finalPrice}.${this.isBundle}.${this.hasBanner ? `${this.banner.backendValue}.${this.banner.intensity}` : false}`).digest('hex');    
    }

    /**
     * @returns {Promise<Image>}
     */
    getImage() {
        return Cache.downloadImage(this.imageUrl, this.id + '.png');
    }
}

class Item {
    /**
     * @type {string}
     */
    id;

    /**
     * @type {string}
     */
    name;

    /**
     * @type {string}
     */
    description;

    /**
     * @type {string}
     */
    type;

    /**
     * @type {('EFortRarity::Common'|'EFortRarity::Uncommon'|'EFortRarity::Rare'|'EFortRarity::Epic'|'EFortRarity::Legendary'|'EFortRarity::Mythic'|'EFortRarity::Exotic')}
     */
    rarity;

    /**
     * @type {('ColumbusSeries'|'CreatorCollabSeries'|'CubeSeries'|'DCSeries'|'FrozenSeries'|'LavaSeries'|'MarvelSeries'|'PlatformSeries'|'ShadowSeries'|'SlurpSeries')}
     */
    series;

    /**
     * @type {string}
     */
    set;

    /**
     * @type {{chapter:number, season:number}}
     */
    introduction;

    /**
     * @type {Date}
     */
    lastShop;
    
    /**
     * @param {Object} builder
     * @param {string} builder.id
     * @param {string} builder.name
     * @param {string} builder.description
     * @param {string} builder.type
     * @param {('EFortRarity::Common'|'EFortRarity::Uncommon'|'EFortRarity::Rare'|'EFortRarity::Epic'|'EFortRarity::Legendary'|'EFortRarity::Mythic'|'EFortRarity::Exotic')} builder.rarity
     * @param {('ColumbusSeries'|'CreatorCollabSeries'|'CubeSeries'|'DCSeries'|'FrozenSeries'|'LavaSeries'|'MarvelSeries'|'PlatformSeries'|'ShadowSeries'|'SlurpSeries')} builder.series
     * @param {string} builder.set
     * @param {{chapter:number, season:number}} builder.introduction
     * @param {Date} builder.lastShop
     */
    constructor(builder) {
        this.id = builder.id;
        this.name = builder.name;
        this.description = builder.description;
        this.type = builder.type;
        this.rarity = builder.rarity;
        this.series = builder.series;
        this.set = builder.set;
        this.introduction = builder.introduction;
        this.lastShop = builder.lastShop;
    }
}

/**
 * @param {Object} sections 
 * @param  {Object[]} rawEntries 
 * @returns 
 */
function resolveSections(sections, rawEntries) {
    if (!sections) sections = {};
    if (rawEntries) {
        rawEntries.forEach(rawEntry => {
            if (!sections[rawEntry.sectionId]) sections[rawEntry.sectionId] = new Section({
                id: rawEntry.sectionId,
                name: rawEntry.section.name,
                index: rawEntry.section.index,
                landingPriority: rawEntry.section.landingPriority,
                entries: []
            });

            var entry = new Entry({
                id: `${rawEntry.items[0].id}${rawEntry.bundle != null ? '-Bundle' : ''}`,
                name: rawEntry.bundle ? rawEntry.bundle.name : rawEntry.items[0].name,
                rarity: rawEntry.items[0].rarity.backendValue,
                series: rawEntry.items[0].series ? rawEntry.items[0].series.backendValue : null,
                regularPrice: rawEntry.regularPrice,
                finalPrice: rawEntry.finalPrice,
                bundle: rawEntry.bundle ? rawEntry.bundle.name : null,
                banner: rawEntry.banner,
                sortPriority: rawEntry.sortPriority,
                categories: rawEntry.categories,
                tileSize: rawEntry.tileSize,
                imageUrl: rawEntry.newDisplayAsset ? rawEntry.newDisplayAsset.materialInstances[0].images.OfferImage : rawEntry.items[0].images.featured || rawEntry.items[0].images.icon,
                items: []
            });

            rawEntry.items.forEach(item => {
                if (item.introduction) {
                    delete item.introduction.text;
                    delete item.introduction.backendValue;
                }

                entry.items.push(new Item({
                    id: item.id,
                    name: item.name,
                    description: item.description,
                    type: item.type.displayValue,
                    rarity: item.rarity.backendValue,
                    series: item.series ? item.series.backendValue : null,
                    set: item.set,
                    introduction: item.introduction,
                    lastShop: item.shopHistory[item.shopHistory.length - 1]
                }));
            });

            sections[rawEntry.sectionId].entries.push(entry);
            sections[rawEntry.sectionId].entries.sort((a, b) => a.sortPriority < b.sortPriority ? 1 : a.sortPriority > b.sortPriority ? -1 : 0);
        });
    }

    return sections;
}

/**
 * @param {Date} [date] 
 * @param {boolean} [ignoreCache]
 * @returns {Promise<Shop>}
 */
function getItemShop(date, ignoreCache = false) {
    return new Promise((resolve, reject) => {
        axios.get('https://fortnite-api.com/v2/shop/br/combined').then(shop => {
            var sections = Object.values(resolveSections(resolveSections(null, shop.data.data.featured.entries), shop.data.data.daily.entries))
                            .sort((a, b) => a.index > b.index ? 1 : a.index < b.index ? -1 : 0);

            var result = new Shop({
                hash: shop.data.data.hash,
                date: new Date(shop.data.data.date),
                sections: sections
            });

            resolve(result);
        }, reason => reject(reason));
    });
}

module.exports = {
    Shop, Section, Entry, Item, resolveSections, getItemShop
}