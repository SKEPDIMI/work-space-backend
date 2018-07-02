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
    type: Array,
    required: true
  },
  posts: {
    type: Array,
    required: true
  },
  owner: {
    type: Object,
    requied: true
  },
  admins: {
    type: Array
  }
});

SpaceSchema.methods.authChanges = function authChanges (email, password, callback) { // Will return true if the user is owner and if they have correct credentials
  if (this.owner.toLowerCase() === email.toLowerCase()) {
    User.findOne({
      email: {"$regex" : email, "$options" : "i"}
    })
    .then(user => {
      helpers.compareSync(password, user.password) ? callback(true) : callback(false, 'Could not authenticate user');
    })
    .catch(err => {
      console.log(err)
      callback(false, 'Could not find ' + email)
    })
  } else {
    callback(false, 'You are not the owner of this space')
  }
};

var Space = mongoose.model('space', SpaceSchema);

module.exports = Space;