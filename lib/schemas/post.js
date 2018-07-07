const helpers = require('../helpers');
const User = require('./user');
var mongoose = require('mongoose');

var PostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  helpful: {
    type: Number,
    required: true
  },
  comments: {
    type: Array,
    required: true
  },
  author: {
    type: String,
    required: true
  },
  creationTime: {
    type: String
  }
});

PostSchema.methods.authChanges = function authChanges (id, password, callback) { // Will return true if the user is owner and if they have correct credentials
  if (this.author === id) {
    User.findOne({
      _id: id
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

var Post = mongoose.model('post', PostSchema);

module.exports = Post;