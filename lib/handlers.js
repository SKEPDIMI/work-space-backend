const _data = require('./_data');
const helpers = require('./helpers');
const User = require('./schemas/user');

var handlers = {};

handlers.users = function (data, callback) {
  let acceptableMethods = ['get', 'post', 'put', 'delete'];
  let method = data.method;

  if (acceptableMethods.indexOf(method) > -1) {
    handlers._users[method](data, callback);
  } else {
    callback(405, {message: 'Unacceptable Method'}, 'application/json')
  }
  
};
  handlers._users = {};
  handlers._users.get = function (data, callback) {
    let email = typeof(data.headers.email) != 'undefined' && data.headers.email.trim().length >= 0 ? data.headers.email : false;
    let password = typeof(data.headers.password) != 'undefined' && data.headers.password.trim().length >= 0 ? data.headers.password : false;
    
    if (email && password) {
      User.findOne({ 'email': email }, 'email username password bio posts', (err, user) => {
        if (!user || err) {
          return callback( 406, {message: 'Could not find user'}, 'application/json')
        } else {
          helpers.compare(password, user.password, function(err, res) {
            if (!res || err) {
              callback(406, {message:'User authentication failed'}, 'application/json')
            } else if (res) {
              callback(406, user, 'application/json')
            }
          })
        }
      });
    } else {
      callback(406, {message: 'Missing field(s)'}, 'application/json')
    }
  };
  handlers._users.post = function (data, callback) {
    let username = typeof(data.body.username) != 'undefined' && data.body.username.trim().length >= 0 ? data.body.username : false;
    let password = typeof(data.body.password) != 'undefined' && data.body.password.trim().length >= 0 ? data.body.password : false;
    let email = typeof(data.body.email) != 'undefined' && data.body.email.trim().length >= 0 ? data.body.email : false;

    if (username && password && email) {
      helpers.hash(password, (err,hashed)=> {
        var userData = {
          email: email,
          username: username,
          password: hashed,
          bio: '',
          spaces: []
        }
        _data.create(User, userData, (err) => {
          if (err) {
            callback(400, {message: 'Could not create user'}, 'application/json');
          } else {
            callback(200, {message: 'Created user succesfully'}, 'application/json');
          }
        })
      })
    } else {
      callback (400, {message: 'Unfulfilled information has been provided'}, 'application/json')
    }
  };
  handlers._users.put = function (data, callback) {
    
  };
  handlers._users.delete = function (data, callback) {
    
  };
handlers.user = function (data, callback) {
  let acceptableMethod = ['get', 'post', 'put', 'delete'];
  if (acceptableMethod.indexOf(data.method)) {
    handlers//do something
  } else {
    callback(405, {message: 'Unacceptable Method'}, 'application/json')
  }
  
};

handlers.spaces = function (data, callback) {
  let acceptableMethod = ['get', 'post', 'put', 'delete'];
  if (acceptableMethod.indexOf(data.method)) {
    handlers//do something
  } else {
    callback(405, {message: 'Unacceptable Method'}, 'application/json')
  }
  
};
module.exports = handlers;