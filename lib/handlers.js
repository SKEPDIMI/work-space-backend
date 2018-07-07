const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');
const User = require('./schemas/user');
const Space = require('./schemas/space');
const Post = require('./schemas/post');
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
    User.findOne({ 'email': {"$regex" : email, "$options" : "i"} }, 'email username bio posts', (err, userData) => {
      if (!userData || err) return callback( 406, {message: 'Could not find user'}, 'application/json')
  
      callback(200, userData, 'application/json')
    });
  } else if (id) {
    User.findOne({ _id: id }, 'username bio posts', (err, userData) => {
      if (!userData || err) return callback( 406, {message: 'Could not find user'}, 'application/json')
  
      callback(200, userData, 'application/json')
    });
  } else {
    User.find({})
    .select('username bio posts')
    .sort('-posts')
    .limit(35)
    .then(users => {
      callback(200, users, 'application/json')
    })
    .catch(err => {
      callback( 406, {message: 'Could not find users'}, 'application/json')
    })
  }

};
handlers._users.post = function (data, callback) {
  let password = typeof(data.body.password) != 'undefined' && data.body.password.trim().length > 4 ? data.body.password : false;
  let email = typeof(data.body.email) != 'undefined' && data.body.email.trim().length > 0 ? data.body.email : false;
  let avatar = typeof(data.files[0]) != 'undefined' ? data.files[0].fieldname === 'avatar' ? data.files[0] : false : false;
  let username = typeof(data.body.username) != 'undefined' && data.body.username.trim().length > 0 ? data.body.username : false;

  if (!username || !password || !email) return callback (400, {message: 'Invalid information provided'}, 'application/json')

  helpers.hash(password, (err,hashed)=> {
    if (err || !hashed) return callback(405, {message: "Failed to encrypt password"}, 'application/json');

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
      fs.unlink(avatar.path, () => true);
    };
    User.create(userData, function (err, user) {
      if (err || !user) return callback(400, {message: 'Could not create user - It probably already exists'}, 'application/json');

      var token = jwt.sign({ id: user._id }, config.jwtKey, {expiresIn: 86400 /* expires in 24 hours*/});

      callback(200, {message: 'Created user succesfully', token: token}, 'application/json');
      
    })
  })
};
handlers._users.put = function (data, callback) {
  let password = typeof(data.body.password) != 'undefined' && data.body.password.trim().length > 4 ? data.body.password : false;
  let id = typeof(data.body.id) != 'undefined' && data.body.id.trim().length > 0 ? data.body.id : false;
  let newUsername = typeof(data.body.newUsername) != 'undefined' && data.body.newUsername.trim().length > 0 ? data.body.newUsername : false;
  let newEmail = typeof(data.body.newEmail) != 'undefined' && data.body.newEmail.trim().length > 0 ? data.body.newEmail : false;
  let newPassword = typeof(data.body.newPassword) != 'undefined' && data.body.newpassword.trim().length > 4 ? data.body.newPassword : false;
  let bio = typeof(data.body.bio) != 'undefined' && data.body.bio.trim().length > 0 ? data.body.bio : false;
  let spaces = typeof(data.body.spaces) != 'undefined' && data.body.spaces.trim().length > 0 ? data.body.spaces : false;
  let avatar = typeof(data.files[0]) != 'undefined' ? data.files[0].fieldname == 'avatar' ? data.files[0] : false : false;
  if (!id || !password) return callback(406, { message: 'Must provide email and password' }, 'application/json')

  User.findOne({_id: id})
  .then(userData => {
    let res = helpers.compareSync(password, userData.password);

    if (!res) return callback(406, {message:'Authentication failed'}, 'application/json');

    if (avatar){
      if (avatar.size > 250 * 1024) return callback(406, {message: 'Image is too large'}, 'application.json')
      userData.avatar.data = fs.readFileSync(avatar.path);
      userData.avatar.contentType = avatar.mimetype;
      fs.unlink(avatar.path, () => true);
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
      userData.password = helpers.hashSync(newPassword);
    }
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

  User.findOne({_id : id}, 'email password')
  .then(userData => {
    helpers.compare(password, userData.password, (err,res) => {
      if (err) return callback(406, {message: 'Failed authentication'}, 'application/json')
      User
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
    Space.find({"title": {"$regex" : title, "$options" : "i"}}, (err, results) => {
      if (err) return callback(400, {message: 'WorkSpace not found'}, 'application/json')
      callback(200, results, 'application/json')
    })
  } else if (subscribed) {
    Space.find({"users": {$gte: subscribed}}, (err, results) => {
      if (err) return callback(400, {message: 'WorkSpace not found'}, 'application/json')
      callback(200, results, 'application/json')
    })
  } else if (id) {
    Space.findOne({_id: id}, (err, results) => {
      if (err) return callback(400, {message: 'WorkSpace not found'}, 'application/json')
      callback(200, results, 'application/json')
    })
  } else {
    let query = Space.find({}).limit(20);
    query.exec()
    .then(results => callback(200, results.sort((a, b) => a > b), 'application/json'))
    .catch(err => callback(400, {message: 'Could not find spaces'}, 'application/json'));
  }
};
handlers._spaces.post = function (data, callback) {
  let title = typeof(data.body.title) != 'undefined' && data.body.title.trim().length > 0 ? data.body.title : false;
  let description = typeof(data.body.description) != 'undefined' && data.body.description.trim().length > 0 ? data.body.description : false;
  let id = typeof(data.body.id) != 'undefined' && data.body.id.trim().length > 0 ? data.body.id : false;
  let password = typeof(data.body.password) != 'undefined' && data.body.password.trim().length > 4 ? data.body.password : false;

  if (!title || !description || !id || !password) return callback(405, {message: "Missing field(s)"}, 'application/json')

  User.findOne({_id: id})
  .then(userData => {
    let res = helpers.compareSync(password, userData.password);
    if (!res) return callback(405, {message:'Failed authentication'}, 'application/json')

    let spaceData = {
      title: title.toLowerCase(),
      description: description,
      posts: [],
      users: [],
      owner: email,
      admins: []
    }
    Space.create(spaceData, (err) => {
      if (err) return callback(400, {message: "Space already exists"}, 'application/json')
        
      callback(200, {message: 'Create Space successfully'}, 'application/json')
    })

  })
  .catch(err => {
    callback(404, {message:'Could not create user. Perhaps another user with this same email / username exists'}, 'application/json')
  })
};
handlers._spaces.put = function (data, callback) {
  let id = typeof(data.body.id) != 'undefined' && data.body.id.trim().length > 0 ? data.body.id : false;
  let password = typeof(data.body.password) != 'undefined' && data.body.password.trim().length > 4 ? data.body.password : false;

  let description = typeof(data.body.description) != 'undefined' && data.body.description.trim().length > 0 ? data.body.description : false;
  let userToAdd = typeof(data.body.userToAdd) != 'undefined' ? data.body.userToAdd : false;
  let userToRemove = typeof(data.body.userToRemove) != 'undefined' ? data.body.userToRemove : false;

  if (!id || !email || !password) return callback(400, {message: 'Missing Fields'}, 'application/json');

  Space.findOne({_id: id})
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
}
handlers._spaces.delete = function (data, callback) {
  let id = typeof(data.body.id) != 'undefined' && data.body.id.trim().length > 0 ? data.body.id : false;
  let email = typeof(data.body.email) != 'undefined' && data.body.email.trim().length > 0 ? data.body.email : false;
  let password = typeof(data.body.password) != 'undefined' && data.body.password.trim().length > 4 ? data.body.password : false;

  if (!id || !email || !password) return callback(405, {message:'Missing field(s)'}, 'application/json')

  Space.findOne({_id: id})
  .then(space => {
    space.authChanges(email, password, (res, message) => {
      if (!res) return callback(406, {message}, 'application/json');

      Space
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

  if (!postId && !spaceId) return callback(400, {message: 'Missing field(s)'}, 'application/json');

  if (postId) {
    Post.findOne({_id: postId})
    .then(post => {
      callback(200, post, 'application/json')
    })
    .catch(err => {
      callback(404, {message: 'Could not find post'}, 'application/json')
    })
  } else if (userId) {
    Post.find({author: userId})
    .sort('creationTime helpful')
    .then(posts => {
      callback(200, posts, 'application/json')
    })
    .catch(err => {
      callback(404, {message: 'This user appears to have no posts'}, 'application/json')
    })
  } else if (spaceId) {
    Space.find({_id: spaceId})
    .then(space => {
      Post.find({space: space._id})
      .sort('+creationTime')
      .sort('+helpful')
      .limit(limit)
      .then(posts => callback(200, posts, 'application/json'))
      .catch(err => callback(404, console.log(err), 'application/json'))
    })
    .catch(err => {
      callback(404, {message: 'Could not find posts'}, 'application/json')
    })
  }
}
handlers._posts.post = function (data, callback) {
  let spaceId = typeof(data.body.spaceId) != 'undefined' && data.body.spaceId.trim().length > 0 ? data.body.spaceId : false;
  let title = typeof(data.body.title) != 'undefined' && data.body.title.trim().length > 0 ? data.body.title : false;
  let body = typeof(data.body.body) != 'undefined' && data.body.body.trim().length > 0 ? data.body.body : false;
  let userId = typeof(data.body.userId) != 'undefined' && data.body.userId.trim().length > 0 ? data.body.userId : false;
  let password = typeof(data.body.password) != 'undefined' && data.body.password.trim().length > 4 ? data.body.password : false;

  if (!title || !body || !userId || !password || !spaceId) return callback(405, {message: 'Missing field(s)'}, 'application/json');

  User.findOne({_id: userId})
  .then(user => {
    let res = helpers.compareSync(password, user.password);

    if (!res) return callback(406, {message: 'Failed authentication'}, 'application/json');

    Space.find({_id: spaceId})
    .then(space => {
      let newPost = {
        title,
        body,
        author: user._id,
        creationTime: Date.now(),
        helpful: 0,
        space: spaceId,
        comments: []
      };

      Post.create(newPost)
      .then(res => callback(200, {message: 'Create post succesfully'}))
      .catch(err => callback(400, {message: 'Could not create post'}, 'application/json'))
    })
    .catch(err => {
      callback(400, {message: 'Could not create post'}, 'application/json')
    })
  })
  .catch(err => {
    callback(400, {message: 'Could not create post'}, 'application/json')
  })
}

handlers._posts.put = function (data, callback) {
  let postId = typeof(data.body.postId) != 'undefined' && data.body.postId.trim().length > 0 ? data.body.postId : false;
  let password = typeof(data.body.password) != 'undefined' && data.body.password.trim().length > 4 ? data.body.password : false;
  let userId = typeof(data.body.userId) != 'undefined' && data.body.userId.trim().length > 0 ? data.body.userId : false;
  
  if (!postId || !password || !userId) return callback(406, {message: 'Missing field(s)'}, 'application/json');

  Post.findOne({_id: postId})
  .then(post => {

  })
  .catch(err => {

  })
}

handlers._posts.delete = function (data, callback) {
  let postId = typeof(data.body.postId) != 'undefined' && data.body.postId.trim().length > 0 ? data.body.postId : false;
  let password = typeof(data.body.password) != 'undefined' && data.body.password.trim().length > 4 ? data.body.password : false;
  let userId = typeof(data.body.userId) != 'undefined' && data.body.userId.trim().length > 0 ? data.body.userId : false;
  
  if (!postId || !password || !userId) return callback(406, {message: 'Missing field(s)'}, 'application/json');

  Post.findOne({_id: postId})
  .then(post => {
    post.authChanges(userId, password, (res, message) => {
      if (!res) return callback(400, {message}, 'application/json')

      Post
      .deleteOne({_id: postId})
      .then(data => callback(200, {message: 'Deleted post'}, 'application/json'))
      .catch(err => callback(400, {message: 'Could not delete post'}, 'application/json'))
    })
  })
  .catch(err => {
    callback(400, {message: 'Could not delete post'}, 'application/json')
  })
}

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

  jwt.verify(token, config.jwtKey, (err, decoded) => {
    if (err || !decoded) return callback(406, {message:'Failed to verify token'},'application/json')

    User.findOne({_id:decoded.id}, (err, userData) => {
      userData ? callback(200, userData, 'application/json') : callback(404, {message:'Could not find user'}, 'application/json')
    })
  })
};

handlers._auth.post = function (data, callback) {
  let email = typeof(data.body.email) == 'string' && data.body.email.length > 0 ? data.body.email : false;
  let password = typeof(data.body.password) == 'string' && data.body.password.length > 0 ? data.body.password : false;

  if (!email || !password) return callback(406, {message: 'Missing Field(s)'}, 'application/json');

  User.findOne({'email': {"$regex" : email, "$options" : "i"} })
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
    User.findOne({_id: id}, (err, userData) => {
      if (err || !userData) return callback(404, {message: 'Could not find user'}, 'application/json');

      var buffer = userData.avatar.data ? new Buffer(userData.avatar.data) : new Buffer(fs.readFileSync(path.join(__dirname + '/../assets/user_default.png')));

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
