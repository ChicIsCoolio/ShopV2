const { loadImage, Image } = require('canvas');

module.exports = {
    /**
     * @param {string} name 
     * @param {string} extension 
     * @returns {Promise<Image>}
     */
    getImage: function(name, extension = 'png') {
        return  loadImage(`./resources/${name}.${extension}`);
    }
}