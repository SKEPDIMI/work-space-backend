const helpers = require('../helpers');
const User = require('./user');
var mongoose = require('mongoose');
var { Schema } = mongoose;

var SpaceSchema = new mongoose.Schema({
  title: {
    type: String,
    unique: true,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  users: [],
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'user'
  },
  admins: [
    {
      type: Schema.Types.ObjectId,
      ref: 'user'
    }
  ]
}, { minimize: false });

SpaceSchema.methods.authChangesToken = function authChangesToken (token, callback) { 
  decoded = helpers.decodeToken(token);
  if (!decoded.id) {
    return callback(false, 'Invalid token')
  }

  User.findById(decoded.id)
  .then(user => {
    if (this.owner == user.id) {
      callback(true)
    } else {
      callback(false, 'You are not the owner of this space')
    }
  })
  .catch(err => {
    callback(false, 'Could not find this user')
  })
}

var Space = mongoose.model('space', SpaceSchema);

module.exports = Space;