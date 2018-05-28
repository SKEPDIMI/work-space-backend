const helpers = require('./helpers');
const User = require('./schemas/user');
const Space = require('./schemas/space');

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
        if (!err && hashed) {
          var userData = new User ({
            email: email.toLowerCase(),
            username: username,
            password: hashed,
            bio: '',
            spaces: []
          })
          console.log('1')
          userData.save(function (err, res) {
            console.log('2')
            if (err) {
              callback(400, {message: 'Could not create user'}, 'application/json');
            } else {
              callback(200, {message: 'Created user succesfully'}, 'application/json');
            }
          })
          console.log('3')
        } else {
          callback(405, {message: "failed to encrypt"}, 'application/json')
        }
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
    let spaces = typeof(data.body.spaces) != 'undefined' && data.body.spaces.trim().length >= 0 ? data.body.spaces : false;

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

              if (spaces) {
                userData.spaces = spaces
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

handlers.spaces = function (data, callback) {
  let method = data.method;
  let acceptableMethods = ['get', 'post', 'put', 'delete'];
  if (acceptableMethods.indexOf(method) > -1) {
    handlers._spaces[method](data, callback);
  } else {
    callback(405, {message: 'Unacceptable Method'}, 'application/json')
  }
};

  handlers._spaces = {};
  handlers._spaces.get = function (data, callback) {
    let title = typeof(data.headers.title) != 'undefined' && data.headers.title.trim().length >= 0 ? data.headers.title : false;
    
    if (title) {
      Space.find({"title": {"$regex" : title, "$options" : "i"}}, 'title description posts users', (err, results) => {
        if (!err && results) {
          callback(200, results, 'application/json')
        } else {
          callback(400, {message: 'WorkSpace not found'}, 'application/json')
        }
      })
    } else {
      callback(400, {message: 'Missing field(s)'}, 'application/json')
    }
  };
  handlers._spaces.post = function (data, callback) {//@TODO: Add authentication
    let title = typeof(data.body.title) != 'undefined' && data.body.title.trim().length >= 0 ? data.body.title : false;
    let description = typeof(data.body.description) != 'undefined' && data.body.description.trim().length >= 0 ? data.body.description : false;
    let email = typeof(data.body.email) != 'undefined' && data.body.email.trim().length >= 0 ? data.body.email : false;
    let password = typeof(data.body.password) != 'undefined' && data.body.password.trim().length >= 0 ? data.body.password : false;
    if (title && description && email && password) {
      
      User.findOne({email:email.toLowerCase()}, (err, userData) => {
        if (!err && userData) {
          helpers.compare(password, userData.password, (err,res) => {
            if (!err && res) {

              let spaceData = {
                title: title.toLowerCase(),
                description: description,
                posts: [],
                users: [],
                admins: [
                  {email:email, password:userData.password}
                ]
              }
              Space.create(spaceData, (err) => {
                if (err) {
                  callback(400, {message: "Space already exists"}, 'application/json')
                } else {
                  callback(200, {message: 'Create Space successfully'}, 'application/json')
                }
              })

            } else {
              callback(405, {message:'Failed authentication'}, 'application/json')
            }
          })
        } else {
          callback(404, {message:'Could not find user'}, 'application/json')
        }
      })
      
    } else {
      callback(405, {message: "Missing field(s)"}, 'application/json')
    }
  };
  handlers._spaces.put = function (data, callback) {
    let title = typeof(data.body.title) != 'undefined' && data.body.title.trim().length >= 0 ? data.body.title : false;

    let email = typeof(data.body.email) != 'undefined' && data.body.email.trim().length >= 0 ? data.body.email : false;
    let password = typeof(data.body.password) != 'undefined' && data.body.password.trim().length >= 0 ? data.body.password : false;

    let newDescription = typeof(data.body.newDescription) != 'undefined' && data.body.newDescription.trim().length >= 0 ? data.body.newDescription : false;
    let newUsers = typeof(data.body.newUsers) != 'undefined' && data.body.newUsers.trim().length >= 0 ? data.body.newUsers : false;
    let newPosts = typeof(data.body.newPosts) != 'undefined' && data.body.newPosts.trim().length >= 0 ? data.body.newPosts : false;

    if (title && email && password) {
      Space.findOne({title:title.toLowerCase()}, (err, spaceData) => {
        if (!err && spaceData) {

          let adminsList = spaceData.admins;

          if ( adminsList.find(function (obj) { return obj.email === email.toLowerCase(); }) ) {
            User.findOne({email: email.toLowerCase()}, (err,userData) => {
              helpers.compare(password, userData.password, (err,res) => {
                if (!err && res) {

                  if (newDescription) {
                    spaceData.description = newDescription
                  }
                  if (newUsers) {
                    spaceData.users = newUsers
                  }
                  if (newPosts) {
                    spaceData.posts = newPosts
                  }
                
                  spaceData.save((err)=>{
                    !err ? callback(200, {message:'Saved'},'application/json') : callback(405, {message:'Could not save changes'})
                  })
                } else {
                  callback(405, {message:'Authentication failed'}, 'application/json')
                }
              })
            })
          } else {
            callback(405, {message:'You dont have permission to delete this space'}, 'application/json')
          }
        } else {
          callback(404, {message:'Could not find space'}, 'application/json')
        }
      })
    } else {
      callback(400, {message:'Missing Fields'}, 'application/json')
    }
  };
  handlers._spaces.delete = function (data, callback) {

  };
module.exports = handlers;