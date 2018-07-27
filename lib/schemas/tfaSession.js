var mongoose = require('mongoose');

var TFASessionSchema = new mongoose.Schema({
  userId: {
    required: true,
    type: String
  },
  sessionType: {
    required: true,
    type: String
  },
  expiresIn: {
    type: Date,
    required: true
  }
});

var TfaSession = mongoose.model('tfasession', TFASessionSchema);

module.exports = TfaSession;