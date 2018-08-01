var mongoose = require('mongoose');
var { Schema } = mongoose;

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
  posts: [
    {
      type: Schema.Types.ObjectId,
      ref: 'post'
    }
  ],
  avatar: {
    data: Buffer,
    contentType: String
  },
  following: [
    {
      type: Schema.Types.ObjectId,
      ref: 'user'
    }
  ],
  followers: [
    {
      type: Schema.Types.ObjectId,
      ref: 'user'
    }
  ],
  verified: {
    type: Boolean,
    require: true
  }
});

var User = mongoose.model('user', UserSchema);

module.exports = User;