const DBusername = process.env.DBusername;
const DBpassword = process.env.DBpassword;

const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;
const connectionURL = `mongodb://${DBusername}:${DBpassword}@ds235860.mlab.com:35860/work-space`;

var _data = {};

_data.create = function (collection, data, callback) {
  MongoClient.connect(connectionURL, function(err, db) {
    if (err) throw err;
    var dbo = db.db("work-space");
    dbo.collection(collection).insertOne(data, function(err, res) {
      callback(err)
      db.close();
    });
  }); 
}

module.exports = _data;