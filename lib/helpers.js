const pbkdf2 = require('pbkdf2')

let helpers = {};
helpers.jsonToObj = function (json) {
  try {
    let obj = JSON.parse(json);
    return obj;
  } catch (e) {
    return {}
  }
};
helpers.hash = function (password, callback) {
  pbkdf2.pbkdf2(password, 'salt', 1, 32, 'sha512', (err, derivedKey) => callback(err, derivedKey.toString('hex')));
};

module.exports = helpers;