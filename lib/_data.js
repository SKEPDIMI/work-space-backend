const bcrypt = require('bcrypt');

const DBusername = process.env.DBusername;
const DBpassword = process.env.DBpassword;

const mongoose = require('mongoose');
const connectionURL = `mongodb://${DBusername}:${DBpassword}@ds235860.mlab.com:35860/work-space`;
mongoose.connect(connectionURL);
var db = mongoose.connection;

var _data = {};

_data.create = function (schema, data, callback) {
      schema.create(data, function (err) {
        callback(err)
      });
}

module.exports = _data;