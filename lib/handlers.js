const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');
const User_model = require('./schemas/user');
const Space_model = require('./schemas/space');
const Post_model = require('./schemas/post');
const TfaSession_model = require('./schemas/tfaSession');
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
  let email = typeof(data.query.email) != 'undefined' && data.query.email.trim().length > 0 ? data.query.email : false;
  let id = typeof(data.query.id) != 'undefined' && data.query.id.trim().length > 0 ? data.query.id : false;

  if (email) {
    User_model.findOne({ 'email': {"$regex" : email, "$options" : "i"} })
    .populate('posts')
    .select('-password')
    .then(userData => callback(200, userData, 'application/json'))
    .catch(err => callback( 406, {message: 'Could not find user'}, 'application/json'));
  } else if (id) {
    User_model.findOne({ _id: id })
    .populate('posts')
    .select('-password -email')
    .then(userData => callback(200, userData, 'application/json'))
    .catch(err => callback( 406, {message: 'Could not find user'}, 'application/json'));
  } else {
    User_model.find()
    .populate('posts')
    .select('-email -password')
    .sort('-followers')
    .limit(200)
    .then(users => {
      console.log(users)
      callback(200, users, 'application/json')
    })
    .catch(err => {
      callback( 406, {message: 'Could not find users'}, 'application/json')
    });
  };
};

handlers._users.post = (data, callback) => {
  let avatar = typeof(data.files[0]) != 'undefined' ? data.files[0].fieldname === 'avatar' ? data.files[0] : false : false;
  let username = typeof(data.body.username) != 'undefined' && data.body.username.trim().length > 0 ? data.body.username : false;
  let email = data.body.email;
  let emailIsValid = helpers.followsGuidelines('email', email);
  let password = data.body.password;
  let passwordIsValid = helpers.followsGuidelines('password', password);

  if (!emailIsValid.response) return callback(400, { message: emailIsValid.message }, 'application/json');
  if (!username) return callback (400, {message: 'Please provide a username'}, 'application/json');
  if (!passwordIsValid.response) return callback(400, { message: passwordIsValid.message }, 'application/json');

  let hashed = helpers.hashSync(password);
  if (!hashed) return callback(405, { message: "Failed to encrypt password" }, 'application/json');

  var userData = new User_model({
    email,
    username,
    password: hashed,
    bio: '',
    spaces: [],
    avatar: {},
    following: [],
    followers: [],
    verified: false
  });

  if (avatar) {
    userData.avatar.data = fs.readFileSync(avatar.path);
    userData.avatar.contentType = avatar.mimetype;
    fs.unlink(avatar.path, () => true);
  };

  userData.save()
  .then(user => {
    callback(200, { message: 'Created user succesfully', userId: user._id }, 'application/json');
  })
  .catch(err => callback(400, {message: 'Could not create user - It probably already exists'}, 'application/json'));
};

handlers._users.put = function (data, callback) {
  let password = typeof(data.body.password) != 'undefined' && data.body.password.trim().length > 4 ? data.body.password : false;
  let id = typeof(data.body.id) != 'undefined' && data.body.id.trim().length > 0 ? data.body.id : false;
  let newUsername = typeof(data.body.newUsername) != 'undefined' && data.body.newUsername.trim().length > 0 ? data.body.newUsername : false;

  let newEmail = typeof(data.body.newEmail) != 'undefined' && data.body.newEmail.trim().length > 0 ? data.body.newEmail : false;
  let newEmailIsValid = helpers.followsGuidelines('email', newEmail);

  let newPassword = typeof(data.body.newPassword) != 'undefined' && data.body.newpassword.trim().length > 4 ? data.body.newPassword : false;
  let newPasswordIsValid = helpers.followsGuidelines('password', newPassword);

  let bio = typeof(data.body.bio) != 'undefined' && data.body.bio.trim().length > 0 ? data.body.bio : false;
  let spaces = typeof(data.body.spaces) != 'undefined' && data.body.spaces.trim().length > 0 ? data.body.spaces : false;
  let avatar = typeof(data.files[0]) === 'object' ? data.files[0].fieldname == 'avatar' ? data.files[0] : false : false;
  let startFollowing = typeof(data.body.startFollowing) != 'undefined' ? data.body.startFollowing : false;
  let stopFollowing = typeof(data.body.stopFollowing) != 'undefined' ? data.body.stopFollowing : false;

  if (!id || !password) return callback(406, { message: 'Must provide email and password' }, 'application/json')

  User_model.findOne({ _id: id })
  .then(async userData => {
    let res = helpers.compareSync(password, userData.password);

    if (!res) return callback(406, {message:'Authentication failed'}, 'application/json');

    if (avatar){
      if (avatar.size > 250 * 1024) return callback(406, {message: 'Image is too large'}, 'application.json')
      userData.avatar.data = fs.readFileSync(avatar.path);
      userData.avatar.contentType = avatar.mimetype;
      fs.unlink(avatar.path, () => true);
    }
    if (newEmail) {
      if (newEmailIsValid.response) {
        userData.email = newEmail
      } else {
        return callback(400, { message: newEmailIsValid.message }, 'application/json')
      }
    }
    
    if (newUsername) userData.username = newUsername
    
    if (bio) userData.bio = bio
    
    if (spaces) userData.spaces = spaces
    
    if (newPassword) {
      if (newPasswordIsValid.response) {
        userData.password = helpers.hashSync(newPassword)
      } else {
        return callback(400, { message: newPasswordIsValid.message }, 'application/json')
      }
    };
    
    if (startFollowing) {
      const userData2 = await User_model.findOne({_id: startFollowing});
      if (!userData2) return callback(404, {message: 'Could not find user to follow'}, 'application/json');

      userData2.followers.push(id);
      await userData2.save(userData2)
      .then(() => userData.following.push(startFollowing))
      .catch(() => { return callback(405, {message: 'Could not follow user'}, 'application/json') })
    };

    if (stopFollowing) {
      const userData2 = await User_model.findOne({_id: stopFollowing});
      if (!userData2) return callback(404, {message: 'Could not find user to unfollow'}, 'application/json');

      userData2.followers = userData2.followers.filer(u => u != id);
      await userData2.save()
      .then(() => userData.following.filter(u => u != stopFollowing))
      .catch(() => { return callback(405, {message: 'Could not unfollow user'}, 'application/json') })
    };

    userData.save((err, updatedUser) => {
      updatedUser ? callback(200, {message : 'Changes saved'}, 'application/json') : callback(405, {message : 'Could not save changes'})
    });
  })
  .catch(err => {
    callback(404, {message:'Could not find user'}, 'application/json')
  })
};
handlers._users.delete = function (data, callback) {
  let password = typeof(data.body.password) != 'undefined' && data.body.password.trim().length > 4 ? data.body.password : false;
  let id = typeof(data.body.id) != 'undefined' && data.body.id.trim().length > 0 ? data.body.id : false;
  if (!email || !password) return callback(400, {message:'Missing field(s) / Invalid information'}, 'application/json');

  User_model.findOne({_id: id}, 'email password')
  .then(userData => {
    helpers.compare(password, userData.password, (err,res) => {
      if (err) return callback(406, {message: 'Failed authentication'}, 'application/json');

      User_model
      .remove({email : userData.email})
      .exec()
      .then(result => callback(200, {message: 'Deleted user successfully'}, 'application/json'))
      .catch(err => callback(405, {message: 'Could not delete user'}, 'application/json'));
    })
  })
  .catch(err => {
    callback(400, {message:'Could not delete user'}, 'application/json')
  });
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
  let id = typeof(data.query.id) != 'undefined' && data.query.id.trim().length > 0 ? data.query.id : false;

  if (title) {
    Space_model.find({"title": {"$regex" : title, "$options" : "i"}}, (err, results) => {
      if (err) return callback(400, {message: 'WorkSpace not found'}, 'application/json')
      callback(200, results, 'application/json')
    })
  } else if (subscribed) {
    Space_model.find({"users": {$gte: subscribed}}, (err, results) => {
      if (err) return callback(400, {message: 'WorkSpace not found'}, 'application/json')
      callback(200, results, 'application/json')
    })
  } else if (id) {
    Space_model.findOne({_id: id}, (err, result) => {
      if (err) return callback(400, { message: 'WorkSpace not found' }, 'application/json')
      callback(200, result, 'application/json')
    })
  } else {
    Space_model.find({})
    .limit(20)
    .sort('+helpful')
    .then(results => callback(200, results.sort((a, b) => a > b), 'application/json'))
    .catch(err => callback(400, {message: 'Could not find spaces'}, 'application/json'));
  }
};

handlers._spaces.post = async function (data, callback) {
  let title = typeof(data.body.title) != 'undefined' && data.body.title.trim().length > 0 ? data.body.title : false;
  let description = typeof(data.body.description) != 'undefined' && data.body.description.trim().length > 0 ? data.body.description : false;
  let token = typeof(data.body.token) != 'undefined' ? data.body.token : false;

  if (!title || !description || !token) return callback(405, {message: "Missing field(s)"}, 'application/json')

  let decoded = null;

  try {
    decoded = await jwt.verify(token, config.jwtKey);
    if (!decoded.id) return callback(400, { message: 'Invalid session. Please try logging in again.' }, 'application/json')
  } catch (error) {
    return callback(400, { message: 'Invalid token' }, 'application/json')
  }

  User_model.findOne({_id: decoded.id})
  .then(userData => {

    let spaceData = new Space_model({
      title,
      description,
      users: {},
      owner: userData._id,
      admins: {}
    });

    spaceData.save()
    .then(res => {
      callback(200, {message: 'Create Space successfully'}, 'application/json')
    })
    .catch(err => {
      if (err) return callback(400, {message: "Space already exists"}, 'application/json')
    })
  })
  .catch(err => {
    callback(404, {message:'Could not create space. Perhaps another space with this same name exists'}, 'application/json')
  });
};

handlers._spaces.put = function (data, callback) {
  let id = typeof(data.body.id) != 'undefined' && data.body.id.trim().length > 0 ? data.body.id : false;
  let password = typeof(data.body.password) != 'undefined' && data.body.password.trim().length > 4 ? data.body.password : false;

  let description = typeof(data.body.description) != 'undefined' && data.body.description.trim().length > 0 ? data.body.description : false;
  let userToAdd = typeof(data.body.userToAdd) != 'undefined' ? data.body.userToAdd : false;
  let userToRemove = typeof(data.body.userToRemove) != 'undefined' ? data.body.userToRemove : false;

  if (!id || !email || !password) return callback(400, {message: 'Missing Fields'}, 'application/json');

  Space_model.findOne({_id: id})
  .then(space => {
    space.authChanges(id, password, (res, message) => {
      if (!res) return callback(406, {message}, 'application/json');

      if (description) space.description = description;
      if (userToAdd) space.users.push(userToAdd);
      if (userToRemove) space.users = space.users.filter(user => user != userToRemove);

      space.save((err) => err ? callback(400, {message: 'Could not save changes'}, 'application/json') : callback(200, {message: 'Saved changes'}, 'application/json'))
    });
  })
  .catch(err => {
    callback(404, {message: 'Could not save changes'}, 'application/json')
  })
};

handlers._spaces.delete = function (data, callback) {
  let id = typeof(data.body.id) != 'undefined' && data.body.id.trim().length > 0 ? data.body.id : false;
  let email = typeof(data.body.email) != 'undefined' && data.body.email.trim().length > 0 ? data.body.email : false;
  let password = typeof(data.body.password) != 'undefined' && data.body.password.trim().length > 4 ? data.body.password : false;

  if (!id || !email || !password) return callback(405, {message:'Missing field(s)'}, 'application/json')

  Space_model.findOne({_id: id})
  .then(space => {
    space.authChanges(email, password, (res, message) => {
      if (!res) return callback(406, {message}, 'application/json');

      Space_model
      .deleteOne({_id: id})
      .then(data => callback(200, {message: 'Deleted workspace'}, 'application/json'))
      .catch(err => callback(400, {message: 'Could not delete workspace'}, 'application/json'))
    })
  })
  .catch(err => {
    callback(404, {message:"Could not delete workspace"}, 'application/json')
  })
};

handlers.posts = function (data, callback) {
  let acceptableMethods = ['get', 'post', 'put', 'delete'];
  let method = data.method;

  if (acceptableMethods.indexOf(method) > -1) {
    handlers._posts[method](data, callback);
  } else {
    callback(405, {message: 'Unacceptable Method'}, 'application/json')
  }
};

handlers._posts = {};

handlers._posts.get = function (data, callback) {
  let postId = typeof(data.query.postId) == 'string' && data.query.postId.length > 2 ? data.query.postId : false;
  let spaceId = typeof(data.query.spaceId) == 'string' && data.query.spaceId.length > 2 ? data.query.spaceId : false;
  let userId = typeof(data.query.userId) == 'string' && data.query.userId.length > 2 ? data.query.userId : false;
  let limit = typeof(data.query.limit) == 'string' && data.query.limit.length > 2 ? data.query.limit : 100;

  if (postId) {
    Post_model.findOne({_id: postId})
    .populate('space', '_id title')
    .populate('author', '_id username')
    .then(post => {
      callback(200, post, 'application/json')
    })
    .catch(err => {
      callback(404, { message: 'Could not find post' }, 'application/json')
    });
  } else if (userId) {
    Post_model.find({'author': userId})
    .populate('space', '_id title')
    .populate('author', '_id username')
    .sort('creationTime helpful')
    .then(posts => {
      callback(200, posts, 'application/json')
    })
    .catch(err => {
      callback(404, { message: 'This user appears to have no posts' }, 'application/json')
    });
  } else if (spaceId) {
    Space_model.findOne({_id: spaceId})
    .populate('space', '_id title')
    .populate('author', '_id username')
    .then(space => {
      Post_model.find({'space._id': space._id})
      .sort('+creationTime')
      .sort('+helpful')
      .limit(limit)
      .then(posts => callback(200, posts, 'application/json'))
      .catch(err => callback(404, { message: 'Could not find posts in this Space' }, 'application/json'))
    })
    .catch(err => {
      callback(404, { message: 'Could not find posts' }, 'application/json')
    })
  } else {
    Post_model.find({})
    .sort('+creationTime')
    .sort('+helpful')
    .limit(limit)
    .then(posts => {
      callback(200, posts, 'application/json')
    })
    .catch(err => {
      callback(404, { message: 'Could not find posts' }, 'application/json');
    })
  }
};

handlers._posts.post = async function (data, callback) {
  let spaceId = typeof(data.body.spaceId) != 'undefined' && data.body.spaceId.trim().length > 0 ? data.body.spaceId : false;
  let title = typeof(data.body.title) != 'undefined' && data.body.title.trim().length > 0 ? data.body.title : false;
  let body = typeof(data.body.body) != 'undefined' && data.body.body.trim().length > 0 ? data.body.body : false;
  let token = typeof(data.body.token) !=' undefined' && data.body.token.trim().length > 0 ? data.body.token : false;

  if (!title || !body || !token || !spaceId) return callback(405, {message: 'Missing field(s)'}, 'application/json');

  if (title.length > 45) return callback(400, {message: 'Title is too long'}, 'application/json');
  if (body.length > 520) return callback(400, {message: 'Body is too long'}, 'application/json');

  let decoded = null;

  try {
    decoded = await jwt.verify(token, config.jwtKey);
    if (!decoded.id) return callback(400, { message: 'This session is not valid. Please try logging in again.' }, 'application/json')
  } catch (error) {
    return callback(400, { message: 'Invalid token' }, 'application/json')
  }

  let user = await User_model.findOne({_id: decoded.id})
  
  if (!user) return callback(404, { message: 'User creating post could not be found'}, 'application/json');

  if (!user.verified) return callback(400, { message: 'You need to verify your account to create a posts!' }, 'application/json');

  let space = await Space_model.findOne({_id: spaceId});
  if (!space) return callback(400, { message: 'Could not find space to post in' }, 'application/json');
  
  let newPost = new Post_model({
    title,
    body,
    author: user._id,
    space: space._id,
    creationTime: new Date(),
    comments: {},
    votes: {}
  });

  user.posts.push(newPost);
  user.save() // Save the changes made to the user's `posts` property
  .then(response => {
    newPost.save() // Save the new post that was created
    .then(post => callback(200, { message: 'Create post succesfully', postId: post.id }), 'application/json')
    .catch(err => callback(400, { message: 'Could not save post' }, 'application/json'));
  })
  .catch(err => callback(400, { message: 'Could not save post' }, 'application/json'));
  
};

handlers._posts.put = function (data, callback) { // TODO THIS PLS DONT FORGET
  let postId = typeof(data.body.postId) != 'undefined' && data.body.postId.trim().length > 0 ? data.body.postId : false;
  let password = typeof(data.body.password) != 'undefined' && data.body.password.trim().length > 4 ? data.body.password : false;
  let userId = typeof(data.body.userId) != 'undefined' && data.body.userId.trim().length > 0 ? data.body.userId : false;
  
  if (!postId || !password || !userId) return callback(406, {message: 'Missing field(s)'}, 'application/json');

  Post_model.findOne({_id: postId})
  .then(post => {

  })
  .catch(err => {

  });
};

handlers._posts.delete = function (data, callback) {
  let postId = typeof(data.body.postId) != 'undefined' && data.body.postId.trim().length > 0 ? data.body.postId : false;
  let password = typeof(data.body.password) != 'undefined' && data.body.password.trim().length > 4 ? data.body.password : false;
  let userId = typeof(data.body.userId) != 'undefined' && data.body.userId.trim().length > 0 ? data.body.userId : false;
  
  if (!postId || !password || !userId) return callback(406, {message: 'Missing field(s)'}, 'application/json');

  Post_model.findOne({_id: postId})
  .then(post => {
    post.authChanges(userId, password, (res, message) => {
      if (!res) return callback(400, {message}, 'application/json')

      Post_model
      .deleteOne({_id: postId})
      .then(data => callback(200, {message: 'Deleted post'}, 'application/json'))
      .catch(err => callback(400, {message: 'Could not delete post'}, 'application/json'))
    })
  })
  .catch(err => {
    callback(400, {message: 'Could not delete post'}, 'application/json')
  })
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

  if (!token) return callback(405, {message:'No token provided'}, 'application/json')

  jwt.verify(token, config.jwtKey, async (err, decoded) => {
    if (err || !decoded) return callback(406, { message: 'This session is not valid.' },'application/json')

    let userData = await User_model.findOne({_id: decoded.id})
    .select('-password');

    userData ?
      callback(200, userData, 'application/json')
      :
      callback(404, {message: 'Could not find user'}, 'application/json');
  })
};

handlers._auth.post = function (data, callback) {
  let email = typeof(data.body.email) == 'string' && data.body.email.length > 0 ? data.body.email : false;
  let password = typeof(data.body.password) == 'string' && data.body.password.length > 0 ? data.body.password : false;

  if (!email || !password) return callback(406, {message: 'Missing Field(s)'}, 'application/json');

  User_model.findOne({'email': {"$regex" : email, "$options" : "i"} })
  .then(userData => {
    helpers.compare(password, userData.password, (err, res) => {
      if (!res || err) return callback(406, {message:'Could not authenticate'}, 'application/json')

      var token = jwt.sign({ id: userData._id }, config.jwtKey, {expiresIn: 86400 /* expires in 24 hours */});
      callback(200, {message:'Created token', token}, 'application/json');
    })
  })
  .catch(err => callback(404, {message: 'Could not find user'}, 'application/json'))
};

handlers.userImage = function (data, callback) {
  const id = typeof(data.query.id) != 'undefined' ? data.query.id : false;

  if (id) {
    User_model.findOne({_id: id}, (err, userData) => {
      if (err || !userData) return callback(404, {message: 'Could not find user'}, 'application/json');

      var buffer = userData.avatar.data ? new Buffer(userData.avatar.data) : new Buffer(fs.readFileSync(path.join(__dirname + '/../assets/user_default.png')));

      callback(200, buffer, 'binary');
    })
  } else {
    callback(400, {message: 'Missing user id'})
  }
};

handlers.emailVerification = function (data, callback) {
  let acceptableMethods = ['get', 'post'];
  let method = data.method;

  if (acceptableMethods.indexOf(method) > -1) {
    handlers._emailVerification[method](data, callback);
  } else {
    callback(405, {message: 'Unacceptable Method'}, 'application/json')
  }
};

handlers._emailVerification = {};

handlers._emailVerification.post = async function (data, callback) {
  let userId = typeof(data.body.userId) != 'undefined' && data.body.userId.trim().length > 0 ? data.body.userId : false;

  if (!userId) return callback(400, {message: 'Missing userId'}, 'application/json');

  User_model.findOne({_id: userId})
  .then(async userData => {
    if (userData.verified) return callback(400, { message: 'This account is already verified' }, 'application/json');

    /* If there is already a TFASession for verifying an account with this users id, remove it */
    TfaSession_model.find({
      userId: userData.id,
      sessionType: 'ACCOUNT_VERIFICATION'
    })
    .then(existingTfaSession => {
      TfaSession_model
      .remove({_id: existingTfaSession._id})
      .exec()
    })
    .catch(err => {
      /* There is not existing session, keep going */
    });

    /* Create an expiration date, one hour from now */
    var now = new Date();
    var expirationDate = new Date(now.getTime() + 1 * 3600000);

    /* Create the session */
    let TfaSession = await TfaSession_model.create({
      expiresIn: expirationDate,
      sessionType: 'ACCOUNT_VERIFICATION',
      userId
    });

    /* Error handling */
    if (!TfaSession) return callback(500, {message: 'Could not create session'}, 'application/json')

    /*
      Send the user an email that
      leads to the website's `verifyemail`
      route, with the session's id in it.
    */
    helpers.sendEmail({
      email: userData.email,
      subject: 'WorkSpace Account verification',
      html: '<h1>Hello, ' + userData.username + '!</h1><hr/> You have succesfully created a WorkSpace account. Please click <a href="https://work-space.netlify.com/verifyemail/' + TfaSession._id + '">here</a> to verify your account. <br/> <small>Didn\'t create a WorkSpace account? It\'s likely someone just typed your email in by accident. Feel free to ignore this message.</small><br/> <bold>-WorkSpace</bold>'
    })
    .then(info => {
      callback(200, { message: 'An email was sent to the email address ' + userData.email + ' succesfully. See you there! (expires: ' + expirationDate.toTimeString() + ')'}, 'application/json');
    })
    .catch(err => {
      callback(400, { message: 'There was an error when attempting to send a verification session to this email address'}, 'application/json')
    });
  })
  .catch(err => {
    callback(404, {message: 'Could not find user to attempt to verify'}, 'application/json')
  });
};

handlers._emailVerification.get = async function (data, callback) {
  let id = data.query.id || false;

  if (!id) return callback(400, { message: 'Missing id field' }, 'application/json');

  let verificationSession = await TfaSession_model
  .findOne({
    _id: id,
    sessionType: "ACCOUNT_VERIFICATION"
  });

  if (!verificationSession) return callback(404, { message: 'This session does not exist. It probably has expired' }, 'application/json');

  var now = new Date();
  if (verificationSession.expiresIn < now) {
    TfaSession_model.remove({_id: verificationSession._id}).exec()
    return callback(400, { message: 'This session has expired' }, 'application/json')
  }
  
  User_model.findOne({_id: verificationSession.userId})
  .then(userData => {
    userData.verified = true;
    
    userData
    .save()
    .then(res => {
      TfaSession_model.remove({_id: verificationSession._id}).exec();

      var token = jwt.sign({ id: userData._id }, config.jwtKey, { expiresIn: 86400 /* expires in 24 hours*/ });
      callback(200, { message: 'Account has been verified! Welcome to WorkSpace', token }, 'application/json');
    })
    .catch(err => callback(400, { message: 'Could not verify account' }, 'application/json'));
  })
  .catch(err => {
    callback(404, { message: 'Could not find user to verify' }, 'application/json')
  });
};

handlers.notfound = function (data, callback){
  callback(404, {message:"Could not find route"}, 'application/json');
};

module.exports = handlers;
