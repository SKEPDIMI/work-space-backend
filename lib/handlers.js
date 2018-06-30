const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');
const User = require('./schemas/user');
const Space = require('./schemas/space');
const jwt = require('jsonwebtoken');
const config = require('../config');

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
    let email = typeof(data.headers.email) != 'undefined' && data.headers.email.trim().length > 0 ? data.headers.email : false;
    let password = typeof(data.headers.password) != 'undefined' && data.headers.password.trim().length > 4 ? data.headers.password : false;

    if (email && password) {
      User.findOne({ 'email': {"$regex" : email, "$options" : "i"} }, 'email username password bio posts', (err, userData) => {
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
    let username = typeof(data.body.username) != 'undefined' && data.body.username.trim().length > 0 ? data.body.username : false;
    let password = typeof(data.body.password) != 'undefined' && data.body.password.trim().length > 4 ? data.body.password : false;
    let email = typeof(data.body.email) != 'undefined' && data.body.email.trim().length > 0 ? data.body.email : false;
    let avatar = typeof(data.files[0]) != 'undefined' ? data.files[0].fieldname === 'avatar' ? data.files[0] : false : false;

    if (username && password && email) {
      helpers.hash(password, (err,hashed)=> {
        if (!err && hashed) {
          var userData = {
            email: email,
            username: username,
            password: hashed,
            bio: '',
            spaces: [],
            avatar: {}
          };

          if (avatar) {
            userData.avatar.data = fs.readFileSync(avatar.path);
            userData.avatar.contentType = avatar.mimetype;
            fs.unlink(avatar.path, ()=>{
              console.log('Deleted from uploads')
            });
          };

          User.create(userData, function (err, user) {
            if (err || !user) {
              callback(400, {message: 'Could not create user - It probably already exists'}, 'application/json');
            } else {
              var token = jwt.sign({ id: user._id }, config.jwtKey, {
                expiresIn: 86400 // expires in 24 hours
              });
              callback(200, {message: 'Created user succesfully', token: token}, 'application/json');
            }
          })
        } else {
          callback(405, {message: "Failed to encrypt password"}, 'application/json')
        }
      })
    } else {
      callback (400, {message: 'Invalid information provided'}, 'application/json')
    }
  };

  handlers._users.put = function (data, callback) {
    let password = typeof(data.body.password) != 'undefined' && data.body.password.trim().length > 4 ? data.body.password : false;
    let email = typeof(data.body.email) != 'undefined' && data.body.email.trim().length > 0 ? data.body.email : false;

    //let avatar = typeof(data.form.avatar) != 'undefined' ? data.body.avatar : false;
    let newUsername = typeof(data.body.newUsername) != 'undefined' && data.body.newUsername.trim().length > 0 ? data.body.newUsername : false;
    let newEmail = typeof(data.body.newEmail) != 'undefined' && data.body.newEmail.trim().length > 0 ? data.body.newEmail : false;
    let newPassword = typeof(data.body.newPassword) != 'undefined' && data.body.newpassword.trim().length > 4 ? data.body.newPassword : false;
    let bio = typeof(data.body.bio) != 'undefined' && data.body.bio.trim().length > 0 ? data.body.bio : false;
    let spaces = typeof(data.body.spaces) != 'undefined' && data.body.spaces.trim().length > 0 ? data.body.spaces : false;
    let avatar = typeof(data.files[0]) != 'undefined' ? data.files[0].fieldname == 'avatar' ? data.files[0] : false : false
    if (email && password) {
      User.findOne({'email' : {"$regex" : email, "$options" : "i"} }, 'email password', ( err, userData ) => {
        if (!err && userData){
          helpers.compare(password, userData.password, (err, res) => {
            if (!err && res) {
              if (avatar){
                userData.avatar.data = fs.readFileSync(avatar.path);
                userData.avatar.contentType = avatar.mimetype;
                fs.unlink(avatar.path, () => {
                  console.log('Deleted image')
                });
              }
              if (newEmail) {
                userData.email = newEmail
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
                    userData.password = hashed;

                    User.update({email: {"$regex" : email, "$options" : "i"}}, userData, (err, updatedUser) => {
                      !err ? callback(200, {message : 'Changes saved'}, 'application/json') : callback(405, {message : 'Could not save changes'})
                    })
                  }
                })

              } else {
                User.update({email: {"$regex" : email, "$options" : "i"}}, userData, (err, updatedUser) => {
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
      callback(406, { message: 'Must provide email and password' }, 'application/json')
    }

  };
  handlers._users.delete = function (data, callback) {
    let password = typeof(data.body.password) != 'undefined' && data.body.password.trim().length > 4 ? data.body.password : false;
    let email = typeof(data.body.email) != 'undefined' && data.body.email.trim().length > 0 ? data.body.email : false;

    if (email && password) {
      User.findOne({email : {"$regex" : email, "$options" : "i"}}, 'email password', (err, userData) => {
        helpers.compare(password, userData.password, (err,res) => {
          if (!err && res) {
            User
            .remove({email : userData.email})
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
      callback(400, {message:'Missing field(s) / Invalid information'}, 'application/json')
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
    let title = typeof(data.query.title) != 'undefined' && data.query.title.trim().length > 0 ? data.query.title : false;
    let subscribed = typeof(data.query.subscribed) != 'underfined' && !isNaN(Number(data.query.subscribed)) ? String(data.query.subscribed) : false; // This number is turned into a string because thats how its stored on MDB

    if (title || subscribed) {
      if (title && subscribed) {
        Space.find({"title": {"$regex" : title, "$options" : "i"}}, (err, results) => {
          if (!err && results) {
            callback(200, results.find((space) => space.users >= subscribed), 'application/json')
          } else {
            callback(400, {message: 'WorkSpace not found'}, 'application/json')
          }
        })
      } else if (title) {
        Space.find({"title": {"$regex" : title, "$options" : "i"}}, (err, results) => {
          if (!err && results) {
            callback(200, results, 'application/json')
          } else {
            callback(400, {message: 'WorkSpace not found'}, 'application/json')
          }
        })
      } else if (subscribed) {
        Space.find({"users": {$gte: subscribed}}, (err, results) => {
          if (!err && results) {
            callback(200, results, 'application/json')
          } else {
            callback(400, {message: 'WorkSpace not found'}, 'application/json')
          }
        })
      }
    } else {
      callback(400, {message: 'Missing field(s)'}, 'application/json')
    }
  };
  handlers._spaces.post = function (data, callback) {
    let title = typeof(data.body.title) != 'undefined' && data.body.title.trim().length > 0 ? data.body.title : false;
    let description = typeof(data.body.description) != 'undefined' && data.body.description.trim().length > 0 ? data.body.description : false;
    let email = typeof(data.body.email) != 'undefined' && data.body.email.trim().length > 0 ? data.body.email : false;
    let password = typeof(data.body.password) != 'undefined' && data.body.password.trim().length > 4 ? data.body.password : false;
    if (title && description && email && password) {

      User.findOne({email:{"$regex" : email, "$options" : "i"}}, (err, userData) => {
        if (!err && userData) {
          helpers.compare(password, userData.password, (err,res) => {
            if (!err && res) {

              let spaceData = {
                title: title.toLowerCase(),
                description: description,
                posts: [],
                users: [],
                owner: email,
                admins: []
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
    let title = typeof(data.body.title) != 'undefined' && data.body.title.trim().length > 0 ? data.body.title : false;

    let email = typeof(data.body.email) != 'undefined' && data.body.email.trim().length > 0 ? data.body.email : false;
    let password = typeof(data.body.password) != 'undefined' && data.body.password.trim().length > 4 ? data.body.password : false;

    let description = typeof(data.body.description) != 'undefined' && data.body.description.trim().length > 0 ? data.body.description : false;

    let userToAdd = typeof(data.body.userToAdd) == 'object' ? data.body.userToAdd : false;
    let userToRemove = typeof(data.body.userToRemove) == 'object' ? data.body.userToRemove : false;

    if (title && email && password) {
      User.findOne({email:{"$regex" : email, "$options" : "i"}}, (err, userData) => {//Firstly, authenticate this user
        if (!err && userData) {
          helpers.compare(password, userData.password, (err, res) => {//make sure they are real
            if (!err && res) {
              Space.findOne({title:title.toLowerCase()}, (err, spaceData) => {//find the space
                if (!err && spaceData) {
                  if ( spaceData.admins.find(function (obj) { return obj.email.toLowerCase() === email.toLowerCase(); }) || spaceData.owner == email ) {//and find if they are an owner / admin
                        if (!err && res) {
                          let asyncFunctionsToCall = 0;
                          let asyncFunctionsFinished = 0;
                          let unsuccessfulChanges = [];
                          let funnelFunction = function () {

                            if (asyncFunctionsFinished != asyncFunctionsToCall){
                              return
                            }
                              if (description) {
                                spaceData.description = description
                              }

                              spaceData.save((err)=>{
                                if (!err) {
                                  if (unsuccessfulChanges.length >= 1) {
                                    callback(400, {message: 'Failed to save ' + unsuccessfulChanges.length + ' change(s)'}, 'application/json')
                                  } else [
                                    callback(200, {message:'Saved changes'}, 'application/json')
                                  ]
                                } else {
                                  callback(405, {message:'Could not save changed'}, 'application/json')
                                }
                              })
                          }

                          if (userToAdd) {//FIRST ASYNC CALL
                            asyncFunctionsToCall++

                            User.findOne({email: userToAdd.email.toLowerCase()}, 'email', (err, userData) => {
                              if(!err && userData) {
                                    if (spaceData.users.indexOf(userData.email) > -1) {
                                      unsuccessfulChanges.push('Adding user : Already a user in the spaces')
                                    } else {
                                      spaceData.users.push(userData.email);
                                    }

                                  asyncFunctionsFinished++;
                                  funnelFunction();
                              } else {
                                unsuccessfulChanges.push('Adding user : Could not find user');
                                asyncFunctionsFinished++;
                                funnelFunction();
                              }
                            });
                          };

                          if (userToRemove) {//SECOND ASYNC CALL
                            asyncFunctionsToCall++

                            User.findOne({email: userToRemove.email.toLowerCase()}, (err, userData) => {
                              if(!err && userData) {
                                if(spaceData.users.indexOf(userData.email) > -1){
                                  let indexOfUser = spaceData.users.indexOf(userData.email)
                                  spaceData.users.splice(indexOfUser, 1)
                                } else {
                                  unsuccessfulChanges.push('Removing user : User is not in the space')
                                }
                              } else {
                                unsuccessfulChanges.push('Removing user : Could not find user')
                              }

                              asyncFunctionsFinished++
                              funnelFunction()
                            });
                          };
                        } else {
                          unsuccessfulChanges.push('Could not find the user requested to remove')
                          asyncFunctionsFinished++;
                          funnelFunction();
                        }
                  } else {
                    callback(405, {message:'You dont have permission to delete this space'}, 'application/json')
                  }
                } else {
                  callback(404, {message:'Could not find space'}, 'application/json')
                }
              })
            } else {
              callback(405, {message:'Failed authentication'}, 'application/json')
            }
          })
        } else {
          callback(404,{message:'User not found'}, 'application/json')
        }
      })
    } else {
      callback(400, {message:'Missing Fields'}, 'application/json')
    }
  };
  handlers._spaces.delete = function (data, callback) {
    let title = typeof(data.body.title) != 'undefined' && data.body.title.trim().length > 0 ? data.body.title : false;

    let email = typeof(data.body.email) != 'undefined' && data.body.email.trim().length > 0 ? data.body.email : false;
    let password = typeof(data.body.password) != 'undefined' && data.body.password.trim().length > 4 ? data.body.password : false;

    if (title && email && password) {
      User.findOne({email:{"$regex" : email, "$options" : "i"}},(err,userData) => {
        if (!err && userData) {
          helpers.compare(password, userData.password, (err,res) => {
            if (!err && res) {
              Space.findOne({title:title.toLowerCase()}, (err,spaceData) => {
                if (!err && spaceData) {
                  if (spaceData.owner == email) {
                    Space.deleteOne({title:spaceData.title}, (err) => {
                      if (!err) {
                        callback(200, {message:'Deleted workspace'}, 'application/json')
                      } else {
                        callback(406,{message:'Could not delete workspace'}, 'application/json')
                      }
                    })
                  } else {
                    callback(405, {message:'You are not the owner of this WorkSpace'}, 'application/json')
                  }
                } else {
                  callback(404, {message:"Could not find Workspace"}, 'application/json')
                }
              })
            } else {
              callback(405, {message:"Failed authentication"}, 'application/json')
            }
          })
        } else {
          callback(404, {message:"Could not find user"}, 'application/json')
        }
      })
    } else {
      callback(405, {message:'Missing field(s)'}, 'application/json')
    }
  };

handlers.auth = function (data, callback) {
  let acceptableMethods = ['get', 'post'];
  let method = data.method;

  if (acceptableMethods.indexOf(method) > -1) {
    handlers._auth[method](data, callback);
  } else {
    callback(405, {message: 'Unacceptable Method'}, 'application/json')
  }
};
handlers._auth = {};

handlers._auth.get = function (data, callback) {
  let token = typeof(data.query.token) == 'string' && data.query.token.length > 2 ? data.query.token : false;

  if (token) {
    jwt.verify(token, config.jwtKey, (err, decoded) => {
      if (!err && decoded) {
        User.findOne({_id:decoded.id}, (err, userData) => {
          if (userData && !err) {
            callback(200, userData, 'application/json')
          } else {
            callback(404, {message:'Could not find user'}, 'application/json')
          }
        })
      } else {
        callback(406, {message:'Failed to verify token'},'application/json')
      }
    })
  } else {
    callback(405, {message:'No token provided'}, 'application/json')
  }
};

  handlers._auth.post = function (data, callback) {
      let email = typeof(data.body.email) == 'string' && data.body.email.length > 0 ? data.body.email : false;
      let password = typeof(data.body.password) == 'string' && data.body.password.length > 0 ? data.body.password : false;

      if (email && password) {
        User.findOne({email: {"$regex": email, "$options":"i"}}, (err, userData) => {
          console.log(err)
          if (!err && userData) {
            helpers.compare(password, userData.password, (err, res) => {
              if (!err && res) {

                var token = jwt.sign({ id: userData._id }, config.jwtKey, {
                  expiresIn: 86400 // expires in 24 hours
                });

                callback(200, {message:'Created token', token:token}, 'application/json');

              } else {
                callback(406, {message:'Could not authenticate'}, 'application/json')
              }
            })
          } else {
            callback(404, {message: 'Could not find user'}, 'application/json')
          }
        })
      } else {
        callback(406, {message: 'Missing Field(s)'}, 'application/json')
      }
  };

handlers.userImage = function (data, callback) {
  const email = typeof(data.query.email) != 'undefined' ? data.query.email : false;

  if (email) {
    User.findOne({email}, (err, userData) => {
      if (err || !userData) return callback(404, {message: 'Could not find user'}, 'application/json');

      var buffer = userData.avatar ? new Buffer(userData.avatar.data) : new Buffer(fs.readFileSync(path.join(__dirname + '/../assets/user_default.png')));

      callback(200, buffer, 'binary');
    })
  } else {
    callback(400, {message: 'Missing fields for email'})
  }
};
handlers.notfound = function(data, callback){
  callback(404, {message:"Could not find route"}, 'application/json');
};

module.exports = handlers;
