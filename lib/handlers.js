const _data = require('./_data');
const helpers = require('./helpers');

var handlers = {};

handlers.users = function (data, callback) {
  let acceptableMethod = ['get', 'post', 'put', 'delete'];
  let method = data.method;

  if (acceptableMethod.indexOf(method)) {
    console.log(method)
    handlers._users[method](data, callback);
  } else {
    callback(405, {message: 'Unacceptable Method'}, 'application/json')
  }
  
};
  handlers._users = {};
  handlers._users.get = function (data, callback) {

  };
  handlers._users.post = function (data, callback) {
    let username = typeof(data.body.username) != 'undefined' && data.body.username.trim().length >= 0 ? data.body.username : false;
    let password = typeof(data.body.password) != 'undefined' && data.body.password.trim().length >= 0 ? data.body.password : false;
    let email = typeof(data.body.email) != 'undefined' && data.body.email.trim().length >= 0 ? data.body.email : false;

    if (username && password && email) {
      helpers.hash(password, (err,hashed)=> {
        if (err) {
          callback(400, {message:'Internal Error hashing your password'}, 'application/json')
        } else {
          let userData = {
            username:username,
            password:hashed,
            email:email,
            bio:'',
            avatar:'',
            posts:[],
            spaces:[]
          }
          _data.create('users', userData, (err)=> {
            !err ? callback(200, {message:'Created user succesfully'}, 'application/json') : callback(400, {message: 'Could not create user'}, 'application/json')
          })
        }
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