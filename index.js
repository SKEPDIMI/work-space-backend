const path = require('path');
const url = require('url');
const cors = require('cors');
const handlers = require('./lib/handlers');
const helpers = require('./lib/helpers');
const config = require('./config');
const mongoose = require('mongoose');
const express = require('express');
const morgan = require('morgan')
const bodyParser = require('body-parser');
var multer  = require('multer');

var app = express();

var connection = mongoose.connect(`mongodb:\/\/${config.DBusername}:${config.DBpassword}@ds235860.mlab.com:35860/work-space`)
var PORT = process.env.PORT || 5000;

app.use(cors())
app.options('*', cors())

app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

const routes = {
  '/api/users' : handlers.users,
  '/api/user' : handlers.user,
  '/api/spaces' : handlers.spaces,
  '/api/auth' : handlers.auth
};

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log(req.body.internalUserID) // YAY, IT'S POPULATED
    cb(null, 'listing-pics/')
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now())
  }
});

var upload = multer({ storage: storage });

app.all('/*', upload.any(), ( req, res ) => {
  let pathQuery = url.parse(req.url, true);
  let pathname = pathQuery.pathname;
  let method = req.method;

  let handler = routes[pathname] ? routes[pathname] : handlers.notfound;

          let data = {
            pathname: pathname,
            method: method.toLowerCase(),
            headers: req.headers || {},
            body: req.body
          };

        /**
         * @param {number} statusCode
         * @param {Object} payload
         * @param {string} contentType
         */
          handler(data, ( statusCode, payload, contentType ) => {
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

app.listen(PORT, ()=>console.log('port: '+PORT))
