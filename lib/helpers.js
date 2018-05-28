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
  bcrypt.hash(password, 10, (err,hashed)=> {
    callback(err, hashed)
  })
};

helpers.compare = function (pass, hash, callback) {
  bcrypt.compare(pass, hash, (err,res) => {
    callback(err,res)
  })
}
module.exports = helpers;