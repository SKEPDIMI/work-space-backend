const helpers = require('../helpers');
const User = require('./user');
var mongoose = require('mongoose');

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
  users: {
    type: Object,
    required: true
  },
  owner: {
    type: Object,
    required: true
  },
  admins: {
    type: Object
  }
}, { minimize: false });

SpaceSchema.methods.authChanges = function authChanges (id, password, callback) { // Will return true if the user is owner and if they have correct credentials
  if (this.owner === id) {
    User.findOne({
      _id : id
    })
    .then(user => {
      helpers.compareSync(password, user.password) ? callback(true) : callback(false, 'Could not authenticate user');
    })
    .catch(err => {
      callback(false, 'Could not find ' + email)
    })
  } else {
    callback(false, 'You are not the owner of this space')
  }
};

var Space = mongoose.model('space', SpaceSchema);

module.exports = Space;