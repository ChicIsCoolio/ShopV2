const { loadImage } = require('skia-canvas');

module.exports = {
    getImage: function(name, extension = 'png') {
        return new Promise((resolve, reject) => {
            loadImage(`./resources/${name}.${extension}`).then(image => resolve(image), reason => reject(reason));
        });
    }
}