const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');
const sanitizer = require('sanitizer');
const User_model = require('./schemas/user');
const Space_model = require('./schemas/space');
const Post_model = require('./schemas/post');
const TfaSession_model = require('./schemas/tfaSession');
const jwt = require('jsonwebtoken');

let {
  jwtKey
} = process.env;

if (!jwtKey) throw 'MISSING JWTKEY ENV VARIABLE';

// TODO
// -
// Add app.use() for requireAuth
// will take headers.authorization
// and turn it into req.user

module.exports = app => {
  app.get('/api/users/:id?', (req, res) => {
    let id = req.params.id

    if (id) {
      User_model.findById(id)
      .select('-password -email') 
      .populate({ path: 'following', select: 'username' })
      .populate({ path: 'followers', select: 'username' })
      .populate('posts following followers')
      .then(user => {
        res.status(200).json(user);
      })
      .catch(err => {
        res.status(404).json({ message: 'Could not find user by this id' });
      });
    } else {
      User_model.find({})
      .select('-password -email') 
      .populate({ path: 'following', select: 'username' })
      .populate({ path: 'followers', select: 'username' })
      .then(users => {
        res.status(200).json(users)
      })
      .catch(err => {
        res.status(404).json({ message: 'Could not find users' })
      });
    }
  });

  app.post('/api/users', (req, res) => {
    let avatar = typeof req.files == 'object' && req.files[0] && req.files[0].fieldname === 'avatar' ? req.files[0] : false;
    let username = typeof(req.body.username) == 'string' && req.body.username.trim().length > 0 ? req.body.username : false;
    let email = req.body.email;
    let emailIsValid = helpers.followsGuidelines('email', email);
    let password = req.body.password;
    let passwordIsValid = helpers.followsGuidelines('password', password);

    if (!emailIsValid.response) return res.status(422).json({ message: emailIsValid.message });
    if (!username) return res.status(422).json({ message: 'Please provide a username' });
    if (!passwordIsValid.response) return res.status(422).json({ message: passwordIsValid.message });

    let hashed = helpers.hashSync(password);
    if (!hashed) return res.status(405).json({ message: "Failed to encrypt password" });

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

    // please upload these to AWS
    if (avatar) {
      userData.avatar.data = fs.readFileSync(avatar.path);
      userData.avatar.contentType = avatar.mimetype;
      fs.unlink(avatar.path, (err) => !!err ? console.log(err) : console.log('deleted the img'));
    };

    userData.save()
    .then(user => {
      var auth_token = jwt.sign({ id: user._id }, jwtKey, {expiresIn: 86400});
      res.status(200).json({ message: 'Created user succesfully', auth_token: auth_token, id: user._id });
    })
    .catch(err => {
      res.status(409).json({ message: 'Could not create user - It probably already exists' })
    });
  });

  app.put('/api/users', async (req, res) => {
    let auth_token = typeof(req.headers.authorization) == 'string' && req.headers.authorization.trim().length > 0 ? req.headers.authorization : false;

    let newUsername = typeof req.body.username == 'string' ?req.body.username : false;
    let newEmail = typeof req.body.email == 'string' ? req.body.email : false;
    let newEmailIsValid = helpers.followsGuidelines('email', newEmail);

    let newPassword = req.body.password != 'undefined' ? req.body.password : false;
    let newPasswordIsValid = helpers.followsGuidelines('password', newPassword);

    let bio = typeof req.body.bio == 'string' ? req.body.bio : false;
    let avatar = typeof req.files === 'object' && req.files[0] ? req.files[0].fieldname == 'avatar' ? req.files[0] : false : false;

    if (!auth_token) return res.status(401).json({ message: 'Must provide auth_token' });

    let decoded = helpers.decodeToken(auth_token);

    if (!decoded.id) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    let userData = await User_model.findById(decoded.id);

    if (!userData) return res.status(404).json({ message: 'Could not find user' });

    /*
      Updating of data
    */

    if (avatar) {
      if (avatar.size > 250 * 1024) return res.status(406).json({message: 'Image is too large'});

      userData.avatar.data = fs.readFileSync(avatar.path);
      userData.avatar.contentType = avatar.mimetype;
      fs.unlink(avatar.path, () => true);
    }
    if (newEmail) {
      if (!newEmailIsValid.response) return res.status(422).json({ message: newEmailIsValid.message });

      sanitizedEmail = sanitizer.sanitize(newEmail)
      
      if (!sanitizedEmail) return res.status(422).json({ message: 'Email must not contain tags' });
      userData.email = sanitizedEmail
    }
    
    if (newUsername) {
      let sanitizedUsername = sanitizer.sanitize(newUsername)
      if (sanitizedUsername.length == 0) {
        return res.status(422).json({ message: 'Username is too short' });
      }
      userData.bio = sanitizedUsername
    }
    
    if (bio) {
      let sanitizedBio = sanitizer.sanitize(bio)
      if (sanitizedBio.length < bio.length) {
        return res.status(422).json({ message: 'Bio cant contain tags' });
      }
      userData.bio = sanitizedBio
    }
    
    if (newPassword) {
      if (newPasswordIsValid.response) {
        userData.password = helpers.hashSync(newPassword)
      } else {
        return res.status(422).json({ message: newPasswordIsValid.message });
      }
    };
    
    try {
      await userData.save();
      res.status(200).json({ message : 'Changes saved' });
    } catch (error) {
      res.status(405).json({ message : 'Could not save changes' });
    }
  });
  app.delete('/api/users', async (req, res) => {
    let auth_token = typeof(req.headers.authorization) == 'string' ? req.headers.authorization : false;
    if (!auth_token) return res.status(422).json({ message:'Missing authorization' });

    let decoded = helpers.decodeToken(auth_token);
    if (!decoded.id) {
      res.status(401).json({ message: 'Invalid session. Please try logging in again.' });
    } else {
      User_model
      .findByIdAndRemove(decoded.id)
      .then(result => res.status(200).json({message: 'Deleted user successfully'}))
      .catch(err => res.status(405).json({message: 'Could not delete user'}));
    }
  });

  app.get('/api/spaces/:id?', (req, res) => {
    let id = req.params.id;
    let limit = !isNaN(Number(req.query.limit)) ? req.query.limit : 100;

    if (id) {
      Space_model.findById(id)
      .limit(limit)
      .populate({ path: 'owner', select: 'username posts followers following' })
      .populate({ path: 'admins', select: 'username posts followers following' })
      .then(space => {
        res.status(200).json(space);
      })
      .catch(err => {
        res.status(404).json({ message: 'WorkSpace not found' });
      });
    } else {
      Space_model.find({})
      .limit(limit)
      .populate({ path: 'owner', select: 'username posts followers following' })
      .populate({ path: 'admins', select: 'username posts followers following' })
      .sort('-likes')
      .then(results => res.status(200).json(results.sort((a, b) => a > b)))
      .catch(err => res.status(404).json({ message: 'Could not find spaces' }));
    }
  });

  app.post('/api/spaces', async (req, res) => {
    let title = typeof(req.body.title) == 'string' && req.body.title.trim().length > 0 ? req.body.title : false;
    let description = typeof(req.body.description) == 'string' && req.body.description.trim().length > 0 ? req.body.description : false;
    let token = typeof(req.headers.token) == 'string' ? req.headers.auhtorization : false;

    if (!title || !description || !token) return res.status(405).json({ message: "Missing field(s)" });

    let decoded = null;

    try {
      decoded = helpers.decodeToken(token);
      if (!decoded.id) return res.status(401).json({ message: 'Invalid session. Please try logging in again.' });
    } catch (error) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    User_model.findOne({_id: decoded.id})
    .then(userData => {
      let spaceData = new Space_model({
        title: sanitizer.sanitize(title),
        description: sanitizer.sanitize(description),
        users: {},
        owner: userData._id,
        admins: {}
      });

      spaceData.save()
      .then(res => {
        res.status(200).json({ message: 'Create Space successfully' });
      })
      .catch(err => {
        if (err) return res.status(409).json({ message: "Space already exists" });
      });
    })
    .catch(err => {
      res.status(404).json({ message:'Could not create space. Perhaps another space with this same name exists' });
    });
  });

  app.put('/api/spaces/:id', async (req, res) => {
    let id = typeof(req.params.id) == 'string' && req.params.id.trim().length > 0 ? req.params.id : false;
    let auth_token = (req.headers.authorization) && req.headers.authorization.length > 10 ? req.headers.authorization : false;
    let description = typeof(req.body.description) == 'string' && req.body.description.trim().length > 0 ? req.body.description : false;
    let userToAdd = typeof(req.body.userToAdd) == 'string' ? req.body.userToAdd : false;
    let userToRemove = typeof(req.body.userToRemove) == 'string' ? req.body.userToRemove : false;

    if (!id || !auth_token) return res.status(422).json({ message: 'Missing Fields' });

    let space = await Space_model.findById(id);
    
    if (!space) return res.status(404).json({ message: 'Could not find space' });

    space.authChangesToken(token, async (res, message) => {
      if (!res) return res.status(401).json({ message });

      if (description) space.description = description;
      if (userToAdd) space.users.push(userToAdd);
      if (userToRemove) space.users = space.users.filter(user => user != userToRemove);

      try {
        await space.save();
        res.status(200).json({message: 'Saved changes'});
      } catch (error) {
        res.status(400).json({ message: 'Could not save changes' });
      }
    });
  });

  app.delete('/api/spaces/:id', async (req, res) => {
    let id = typeof(req.params.id) == 'string' ? req.params.id : false;
    let auth_token = typeof(req.body.authorization) == 'string' && req.body.authorization.trim().length > 0 ? req.body.authorization : false;

    if (!id || !auth_token) return res.status(405).json({ message:'Missing field(s)' });

    let space = await Space_model.findById(id)

    if (!space) return res.status(404).json({message:"Could not delete workspace"});

    space.authChangesToken(auth_token, (res, message) => {
      if (!res) return res.status(401).json({ message });

      Space_model
      .findByIdAndRemove(id)
      .then(data => res.status(200).json({ message: 'Deleted workspace' }))
      .catch(err => res.status(400).json({ message: 'Could not delete workspace' }))
    });
  });

  app.get('/api/spaces/:id/posts', (req, res) => { // find a space's posts
    let spaceId = req.params.id;
    let limit = typeof(req.query.limit) == 'string' && req.query.limit.length > 2 ? req.query.limit : 100;

    Post_model.find({'space': spaceId})
    .populate({ path: 'comments', select: 'users.posts users.followers users.following users.username' })
    .populate({ path: 'author', select: 'posts followers following username' })
    .populate({ path: 'admins', select: 'posts followers following username' })
    .populate({ path: 'owner', select: 'posts followers following username'})
    .sort('+creationTime -likes')
    .limit(limit)
    .then(posts => res.status(200).json(posts))
    .catch(err => res.status(404).json({ message: 'Could not find posts in this Space' }))
  });

  app.get('/api/users/:id/posts', (req, res) => { // find a user's posts
    let limit = typeof(req.query.limit) == 'string' && req.query.limit.length > 2 ? req.query.limit : 10;

    Post_model.find({'author': req.params.id})
    .limit(limit)
    .populate({ path: 'comments', select: 'users.posts users.followers users.following users.username' })
    .populate({ path: 'author', select: 'posts followers following username' })
    .populate({ path: 'admins', select: 'posts followers following username' })
    .populate({ path: 'owner', select: 'posts followers following username'})
    .sort('+creationTime -likes')
    .then(posts => {
      res.status(200).json(posts)
    })
    .catch(err => {
      res.status(404).json({ message: 'This user appears to have no posts' })
    });
  })

  app.get('/api/posts/:id?', async (req, res) => { // find any post
    let postId = req.params.id
    let limit = typeof(req.query.limit) == 'string' && req.query.limit.length > 2 ? req.query.limit : 100;

    if (postId) {
      let post = await Post_model.findById(postId)
        .populate({ path: 'comments', select: 'users.posts users.followers users.following users.username' })
        .populate({ path: 'author', select: 'posts followers following username' })
        .populate({ path: 'admins', select: 'posts followers following username' })
        .populate({ path: 'owner', select: 'posts followers following username'})

      if (!post) return res.status(404).json({ message: 'Could not find post' });

      res.status(200).json(post);
    } else {
      Post_model.find({})
      .populate({ path: 'comments', select: 'users.posts users.followers users.following users.username' })
      .populate({ path: 'author', select: 'posts followers following username' })
      .populate({ path: 'admins', select: 'posts followers following username' })
      .populate({ path: 'owner', select: 'posts followers following username'})
      .sort('-likes -creationTime')
      .limit(limit)
      .then(posts => {
        res.status(200).json(posts)
      })
      .catch(err => {
        res.status(404).json({ message: 'Could not find posts' });
      })
    }
  });

  app.post('/api/spaces/:id/posts', async (req, res) => {
    let spaceId = req.params.id;
    let title = typeof(req.body.title) == 'string' && req.body.title.trim().length > 0 ? req.body.title : false;
    let body = typeof(req.body.body) == 'string' && req.body.body.trim().length > 0 ? req.body.body : false;
    let auth_token = typeof(req.headers.authorization) == 'string' && req.headers.authorization.trim().length > 0 ? req.headers.authorization : false;

    if (!title || !body || !auth_token || !spaceId) return res.status(405).json({message: 'Missing field(s)'});

    if (title.length > 45) return res.status(422).json({message: 'Title is too long'});
    if (body.length > 5520) return res.status(422).json({message: 'Body is too long'});

    let decoded = helpers.decodeToken(auth_token)

    if (!decoded.id) {
      return res.status(401).json({ message: 'Invalid session. Try logging in again' });
    }

    let user = await User_model.findById(decoded.id)
    
    if (!user) return res.status(404).json({ message: 'User creating post could not be found'});

    if (!user.verified) return res.status(401).json({ message: 'You need to verify your account to create a posts!' });

    let space = await Space_model.findOne({_id: spaceId});
    if (!space) return res.status(404).json({ message: 'Could not find space to post in' });
    
    let post = new Post_model({
      title: sanitizer.sanitize(title),
      body: sanitizer.sanitize(body),
      author: user._id,
      space: space._id,
      creationTime: new Date(),
      comments: [],
      likes: []
    });

    user.posts.push(post._id);

    try {
      await user.save() // save changes done to user.posts
    } catch (error) {
      console.log(error)
      return res.status(400).json({ message: 'Could not save post' })
    }

    try {
      await post.save() // Save the new post that was created
      res.status(200).json({ message: 'Create post succesfully', postId: post.id })
    } catch (error) {
      console.log(error)
      res.status(400).json({ message: 'Could not save post' })
    }
  });

  // use params!
  app.put('/api/posts', async (req, res) => { // TODO
    let postId = typeof(req.body.postId) == 'string'&& req.body.postId.trim().length > 0 ? req.body.postId : false;
    let auth_token = typeof(req.headers.authorization) == 'string' && req.headers.authorization.trim().length > 0 ? req.headers.authorization : false;
    let addComment = typeof(req.body.addComment) == 'string' ? req.body.addComment : false; // This will be moved to its own separate route `/users/:id/comment`

    if (!auth_token || !postId) return res.status(401).json({ message: 'No token provided' });

    let decoded = helpers.decodeToken(auth_token);

    let post = await Post_model.findOne({_id: postId});
    if (!post) return res.status(404).json({ message: 'Could not find post to update' });

    if (addComment) {
      if (addComment.length <= 1) return res.status(422).json({ message: 'Comment is too short' });
      if (addComment.length >= 520) return res.status(422).json({ message: 'Comment is too long' });
      let commentObj = {
        user: decoded.id,
        creationTime: new Date(),
        body: sanitizer.sanitize(addComment)
      }

      post.comments.push(commentObj)
    }

    post.save()
    .then(res => {
      res.status(200).json({ message: 'Saved changes' })
    })
    .catch(error => {
      res.status(400).json({ message: 'Could not save changes' })
    });
  });

  app.delete('/api/posts/:id', async (req, res) => {
    let auth_token = typeof(req.headers.authorization) == 'string' && req.headers.authorization.length > 10 ? req.headers.authorization : false;
    let id = req.params.id;

    if (!id || !auth_token) return res.status(422).json({message: 'Missing field(s)'});

    let post = await Post_model.findById(id);
    
    if (!post) return res.status(400).json({ message: 'Could not delete post' });

    post.authChangesToken(auth_token, (res, message) => {
      if (!res) return res.status(401).json({ message })

      Post_model
      .findByIdAndRemove(id)
      .then(data => res.status(200).json({ message: 'Deleted post' }))
      .catch(err => res.status(400).json({ message: 'Could not delete post' }))
    })
  });

  app.get('/api/auth', (req, res) => {
    let auth_token = typeof(req.headers.authorization) == 'string' && req.headers.authorization.length > 2 ? req.headers.authorization : false;

    if (!auth_token) return res.status(405).json({ message:'No auth_token provided' });

    jwt.verify(auth_token, jwtKey, async (err, decoded) => {
      if (err || !decoded) return res.status(401).json({ message: 'This session is not valid. Log in again, please.' })

      let userData = await User_model.findById(decoded.id)
      .select('-password');

      if (!userData) return res.status(404).json({ message: 'Could not find user' });

      res.status(200).json(userData)        
    })
  });

  app.post('/api/auth', async (req, res) => {
    let email = typeof(req.body.email) == 'string' && req.body.email.length > 0 ? req.body.email : false;
    let password = typeof(req.body.password) == 'string' && req.body.password.length > 0 ? req.body.password : false;

    if (!email || !password) return res.status(422).json({message: 'Missing Field(s)'});

    let user = await User_model.findOne({'email': {"$regex" : email, "$options" : "i"} });

    if (!user) return res.status(404).json({message: 'Could not find user'})

    helpers.compare(password, user.password, (err, ok) => {
      if (!ok || err) return res.status(401).json({ message:'Could not authenticate' });

      var token = jwt.sign({ id: user._id }, jwtKey, {expiresIn: 86400 /* expires in 24 hours */});
      res.status(200).json({ message:'Created token', token });
    });
  });

  // this will be replaced by AWS
  app.get('/api/user/:id/image', async (req, res) => {
    let user = await User_model.findById(req.params.id);

    if (!user) return res.status(404).json({ message: 'Could not find user' });

    var buffer = user.avatar.data ? new Buffer(user.avatar.data) : new Buffer(fs.readFileSync(path.join(__dirname + '/../assets/user_default.png')));
    res.status(200).send(buffer, 'binary');
  });

  app.post('/api/verifyEmail', async (req, res) => {
    let userId = typeof(req.body.userId) != 'undefined' && req.body.userId.trim().length > 0 ? req.body.userId : false;

    if (!userId) return res.status(422).json({ message: 'Missing userId' });

    let userData = await User_model.findOne({_id: userId});

    if (!userData) return res.status(404).json({message: 'Could not find user to attempt to verify'});

    if (userData.verified) return res.status(409).json({ message: 'This account is already verified' });

    /* If there is already a TFASession for verifying an account with this users id, remove it */
    let existingSession = await TfaSession_model.find({
      userId: userData.id,
      sessionType: 'ACCOUNT_VERIFICATION'
    })
    if (existingSession) {
      TfaSession_model.findByIdAndRemove(existingSession._id);
    }

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
    if (!TfaSession) return res.status(500).json({message: 'Could not create session'});
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
      res.status(200).json({ message: 'An email was sent to the email address ' + userData.email + ' succesfully. See you there! (expires: ' + expirationDate.toTimeString() + ')'});
    })
    .catch(err => {
      res.status(400).json({ message: 'There was an error when attempting to send a verification session to this email address: Please contact support'})
    });
  });

  app.get('/api/verifyEmail', async (req, res) => {
    let id = req.query.id || false;

    if (!id) return res.status(422).json({ message: 'Missing id field' });

    let verificationSession = await TfaSession_model
    .findOne({
      _id: id,
      sessionType: "ACCOUNT_VERIFICATION"
    });

    if (!verificationSession) return res.status(404).json({ message: 'This session does not exist. It probably has expired' });

    var now = new Date();
    if (verificationSession.expiresIn < now) {
      TfaSession_model.remove({_id: verificationSession._id}).exec();
      return res.status(401).json({ message: 'This session has expired' });
    }
    
    let user = await User_model.findOne({ _id: verificationSession.userId })
    
    if (!user) return res.status(404).json({ message: 'Could not find user to verify' })
    user.verified = true;
      
    try {
      await user.save()
    } catch (error) {
      return res.status(400).json({ message: 'Could not verify account' })
    }
    TfaSession_model.remove({ _id: verificationSession._id }).exec();
    var token = jwt.sign({ id: user._id }, jwtKey, { expiresIn: 86400 /* expires in 24 hours*/ });
    res.status(200).json({ message: 'Account has been verified! Welcome to WorkSpace', token });
  });

  app.get('*', function (req, res){
    res.status(404).send({ message: "Could not find route" });
  });
}
