var mongoose = require('mongoose');

var UserSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  username: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
  },
  bio: {
    type: String
  },
  posts: {
    type: Array
  },
  avatar: {
    data: Buffer,
    contentType: String
  }
});

var User = mongoose.model('user', UserSchema);

module.exports = User;