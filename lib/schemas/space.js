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

var Space = mongoose.model('space', SpaceSchema);
module.exports = Space;