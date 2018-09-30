const helpers = require('../helpers');
const User = require('./user');
var mongoose = require('mongoose');
var { Schema } = mongoose;

var PostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  space: {
    type: Schema.Types.ObjectId,
    ref: 'space'
  },
  likes: [
    {
      type: Schema.Types.ObjectId,
      ref: 'user'
    }
  ],
  comments: [
    {
      user: {
        type: Schema.Types.ObjectId,
        ref: 'user'
      },
      creationTime: {
        type: String,
        required: true
      },
      body: String
    }
  ],
  author: {
    type: Schema.Types.ObjectId,
    ref: 'user'
  },
  creationTime: {
    type: String,
    required: true
  }
}, { minimize: true });

PostSchema.methods.authChangesToken = function authChangesToken (token, callback) { 
  decoded = helpers.decodeToken(token);
  if (!decoded.id) {
    return callback(false, 'Invalid token')
  }

  User.findById(decoded.id)
  .then(user => {
    if (this.author == user.id) {
      callback(true)
    } else {
      callback(false, 'You are not the owner of this space')
    }
  })
  .catch(err => {
    callback(false, 'Could not find this user')
  })
}

var Post = mongoose.model('post', PostSchema);

module.exports = Post;