/**
 * @param {string} key
 * @returns {string}
 */
function getString(key) {
    return process.env[key];
}

/**
 * @param {string} key
 * @returns {boolean}
 */
function getBoolean(key) {
    return getString(key) && getString(key).toLowerCase() == 'true';
}

/**
 * @param {string} key
 * @returns {number}
 */
function getInt(key) {
    return Number.parseInt(getString(key))
}

/**
 * @param {string} key 
 * @returns {number}
 */
function getFloat(key) {
    return Number.parseFloat(getString(key));
}

module.exports = {
    getString, getBoolean, getInt, getFloat
}