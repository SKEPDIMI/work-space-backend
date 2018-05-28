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
      User.findOne({ 'email': email.toLowerCase() }, 'email username password bio posts', (err, userData) => {
        if (!userData || err) {
          return callback( 406, {message: 'Could not find user'}, 'application/json')
        } else {
          helpers.compare(password, userData.password, ( err, res ) => {
            if (!res || err) {
              callback(406, {message:'User authentication failed'}, 'application/json')
            } else if (res) {
              userData.password = password;
              callback(406, userData, 'application/json')
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
          email: email.toLowerCase(),
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
    let password = typeof(data.body.password) != 'undefined' && data.body.password.trim().length >= 0 ? data.body.password : false;
    let email = typeof(data.body.email) != 'undefined' && data.body.email.trim().length >= 0 ? data.body.email : false;
    
    let newUsername = typeof(data.body.newUsername) != 'undefined' && data.body.newUsername.trim().length >= 0 ? data.body.newUsername : false;
    let newEmail = typeof(data.body.newEmail) != 'undefined' && data.body.newEmail.trim().length >= 0 ? data.body.newEmail : false;
    let newPassword = typeof(data.body.newPassword) != 'undefined' && data.body.newPassword.trim().length >= 0 ? data.body.newPassword : false;
    let bio = typeof(data.body.bio) != 'undefined' && data.body.bio.trim().length >= 0 ? data.body.bio : false;

    if (email && password) {
      User.findOne({'email' : email.toLowerCase() }, 'email password', ( err, userData ) => {
        if (!err && userData){
          helpers.compare(password, userData.password, (err, res) => {
            if (!err && res) {

              if (newEmail) {
                userData.email = newEmail.toLowerCase()
              }

              if (newUsername) {
                userData.username = newUsername
              }

              if (bio) {
                userData.bio = bio
              }

              if (newPassword) {

                helpers.hash(newPassword, (err, hashed) => {
                  if (err) {
                    return callback(406, {message: 'Failed to encrypt password'}, 'application/json')
                  } else {
                    userData.password = hashed

                    User.update({email: email.toLowerCase()}, userData, (err, updatedUser) => {
                      !err ? callback(200, {message : 'Changes saved'}, 'application/json') : callback(405, {message : 'Could not save changes'})
                    })
                  }
                })

              } else {
                User.update({email: email.toLowerCase()}, userData, (err, updatedUser) => {
                  !err ? callback(200, {message : 'Changes saved'}, 'application/json') : callback(405, {message : 'Could not save changes'})
                })
              }
            } else {
              callback(406, {message:'Authentication failed'}, 'application/json')
            }
          })
        } else {
          callback(404, {message:'Could not find user'}, 'application/json')
        }
      })
    } else {
      callback(406, { message: 'missing email or password' }, 'application/json')
    }

  };
  handlers._users.delete = function (data, callback) {
    let password = typeof(data.body.password) != 'undefined' && data.body.password.trim().length >= 0 ? data.body.password : false;
    let email = typeof(data.body.email) != 'undefined' && data.body.email.trim().length >= 0 ? data.body.email : false;

    if (email && password) {
      User.findOne({email : email.toLowerCase()}, 'email password', (err, userData) => {
        helpers.compare(password, userData.password, (err,res) => {
          if (!err && res) {
            User
            .remove({email : email.toLowerCase()})
            .exec()
            .then(result => {
              callback(200, {message: 'Deleted user successfully'}, 'application/json')
            })
            .catch(err => {
              callback(405, {message: 'Could not delete user'}, 'application/json')
            });
          } else {
            callback(400, {message:'Failed authentication'}, 'application/json')
          }
        })
      })

    } else {
      callback(400, {message:'Missing field(s)'}, 'application/json')
    }
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