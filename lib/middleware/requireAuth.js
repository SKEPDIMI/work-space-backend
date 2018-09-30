const User_model = require('../schemas/user');
const helpers = require('../helpers');

module.exports = async (req, res, next) => {
  let auth_token = typeof(req.headers.authorization) == 'string' && req.headers.authorization.trim().length > 0 ? req.headers.authorization : false;

  if (!auth_token) return res.status(401).json({ message: 'Missing authorization' });

  let decoded = helpers.decodeToken(auth_token);

  if (!decoded || !decoded.id) return res.status(401).json({ message: 'Invalid session. Please try logging in again' });

  let user = await User_model.findById(decoded.id);

  if (!user) return res.status(404).json({ message: 'Could not find user attempting to authenticate.' });

  req.user = user;
  req.authToken = auth_token;

  next();
}