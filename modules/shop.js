const cache = require('./cacheOld');
const axios = require('axios').default;
const { Entry } = require('./ItemShop');

function fillSections(sections, entries) {
    if (sections == null) sections = {};
    if (entries != null) {
        entries.forEach(entry => {
            if (sections[entry.sectionId] == null) sections[entry.sectionId] = {
                id: entry.sectionId,
                name: entry.section.name,
                index: entry.section.index,
                landingPriority: entry.section.landingPriority,
                entries: []
            };

            var entr = new Entry({
                id: `${entry.items[0].id}${entry.bundle != null ? '-Bundle' : ''}`,
                name: entry.bundle == null ? entry.items[0].name : entry.bundle.name,
                rarity: entry.items[0].rarity.backendValue,
                regularPrice: entry.regularPrice,
                finalPrice: entry.finalPrice,
                bundle: entry.bundle == null ? null : entry.bundle.name,
                banner: entry.banner,
                sortPriority: entry.sortPriority,
                categories: entry.categories,
                tileSize: entry.tileSize,
                imageUrl: entry.newDisplayAsset != null ? entry.newDisplayAsset.materialInstances[0].images.OfferImage : entry.items[0].images.featured || entry.items[0].images.icon
            });

            var e = {
                id: `${entry.items[0].id}${entry.bundle != null ? '-Bundle' : ''}`,
                name: entry.bundle == null ? entry.items[0].name : entry.bundle.name,
                rarity: entry.items[0].rarity.backendValue,
                simpleRarity: entry.items[0].rarity.value,
                regularPrice: entry.regularPrice,
                finalPrice: entry.finalPrice,
                bundle: entry.bundle == null ? null : entry.bundle.name,
                banner: entry.banner,
                sortPriority: entry.sortPriority,
                categories: entry.categories,
                tileSize: entry.tileSize,
                items: [],
                display: {}
            };

            entry.items.forEach(item => {
                e.items.push({
                    id: item.id,
                    name: item.name,
                    description: item.description,
                    type: item.type.displayValue,
                    rarity: item.rarity.backendValue,
                    series: item.series == null ? null : {
                        value: item.series.value,
                        image: item.series.image
                    },
                    set: item.set == null ? null : item.set.value,
                    introduction: {
                        chapter: item.introduction.chapter,
                        season: item.introduction.season
                    },
                    lastShop: item.shopHistory[item.shopHistory.length - 1]
                });
            });

            if (entry.newDisplayAsset != null && entry.newDisplayAsset.materialInstances[0] != null) {
                e.display.image = entry.newDisplayAsset.materialInstances[0].images.OfferImage;
                e.display.colors = entry.newDisplayAsset.materialInstances[0].colors;
                e.display.scalings = {
                    offsetX: entry.newDisplayAsset.materialInstances[0].scalings.OffsetImage_X,
                    offsetY: entry.newDisplayAsset.materialInstances[0].scalings.OffsetImage_Y,
                    zoom: entry.newDisplayAsset.materialInstances[0].scalings.ZoomImage_Percent
                };
                e.display.flags = entry.newDisplayAsset.materialInstances[0].flags;
            }
            else {
                e.display.image = entry.items[0].images.featured || entry.items[0].images.icon;
                e.display.colors = {};
                e.display.scalings = {
                    offsetX: 0,
                    offsetY: 0,
                    zoom: 0
                };
                e.display.flags = {};
            }

            sections[entry.sectionId].entries.push(e);
        });
    }

    return sections;
}

module.exports = {
    getCurrent: function () {
        return new Promise((resolve, reject) => {
            axios.get('https://fortnite-api.com/v2/shop/br/combined').then(shop => {
                if (cache.contains(shop.data.data.hash)) resolve(JSON.parse(cache.get(shop.data.data.hash)));

                var sections = Object.values(fillSections(fillSections(null, shop.data.data.featured.entries), shop.data.data.daily.entries))
                    .sort((a, b) => {
                        return a.index > b.index ? 1 : a.index < b.index ? -1 : 0;
                    });

                var result = {
                    hash: shop.data.data.hash,
                    date: shop.data.data.date,
                    sections: sections
                };

                var jsonResult = JSON.stringify(result);
                cache.add(shop.data.data.hash, jsonResult)

                resolve(result);
            }).catch(err => reject(err));
        });
    }
}