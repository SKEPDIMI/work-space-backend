const path = require('path');
const url = require('url');
const cors = require('cors');
const handlers = require('./lib/handlers');
const config = require('./config');
const mongoose = require('mongoose');
const express = require('express');
const morgan = require('morgan')
const multer  = require('multer');
var cookieParser = require('cookie-parser');

console.log("Initializing API >>>");

require('./lib/services/safePopulate')([
  'email',
  'password'
]);
var app = express();

mongoose.connect(config.DBHost);

app.use(express.json());
app.use(cookieParser());
app.use(cors())
app.options('*', cors())

require('./lib/routes')(app);

app.disable( 'x-powered-by' );

const upload = multer ({
  dest: path.join(__dirname + '/uploads')
});

const routes = {
  // '/api/users' : handlers.users,
  '/api/spaces' : handlers.spaces,
  '/api/posts' : handlers.posts,
  // '/api/auth' : handlers.auth,
  '/api/user/image' : handlers.userImage,
  // '/api/verifyEmail' : handlers.emailVerification
};

app.get('/cookie',function(req, res){
  var cookie_name = 'fennamfd';
  res.cookie(cookie_name , 'cookie_value').send('Cookie is set');
});

app.all('*', upload.array('avatar'), ( req, res ) => { // All requests are passed onto handlers
  let pathQuery = url.parse(req.url, true);
  let pathname = pathQuery.pathname;
  let query = pathQuery.query;
  let method = req.method;

  let handler = routes[pathname] ? routes[pathname] : handlers.notfound;

  let data = {
    pathname: pathname,
    method: method.toLowerCase(),
    headers: req.headers || {},
    body: req.body || {},
    files: req.files || {},
    query: query || []
  };
  
  handler(data, ( statusCode = 418, payload = {}, contentType = 'text/plain' ) => { // And the response from these handlers is sent back
    res.status(statusCode);
    res.contentType(contentType);

    if (contentType == 'application/json') {
      res.json(payload)
    } else {
      res.send(payload)
    }
  })
});

morgan('tiny');

var PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('WORKSPACE API is listening at port ' + PORT))

module.exports = app; // for testing