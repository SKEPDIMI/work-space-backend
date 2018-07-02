const config = require('../config');
const bcrypt = require('bcrypt');

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
  bcrypt.hash(password, config.salt, (err,hashed) => {
    callback(err, hashed)
  })
};

helpers.hashSync = password => bcrypt.hashSync(password, config.salt);

helpers.compare = function (pass, hash, callback) {
  bcrypt.compare(pass, hash, (err,res) => {
    callback(err,res)
  })
};

helpers.compareSync = (pass, hash) => bcrypt.compareSync(pass, hash);

module.exports = helpers;