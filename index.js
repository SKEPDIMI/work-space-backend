const path = require('path');
const url = require('url');
const handlers = require('./lib/handlers');
const helpers = require('./lib/helpers');
const config = require('./config');
const mongoose = require('mongoose');
const express = require('express');
const {StringDecoder} = require('string_decoder');
var morgan = require('morgan')

var app = express();

var connection = mongoose.connect(`mongodb://${config.DBusername}:${config.DBpassword}@ds235860.mlab.com:35860/work-space`)
var PORT = process.env.PORT || 5000;

const routes = {
  '/api/users' : handlers.users,
  '/api/user' : handlers.user,
  '/api/spaces' : handlers.spaces,
  '/api/auth' : handlers.auth
};

app.all('/*', ( req, res ) => {
  let pathQuery = url.parse(req.url, true);
  let pathname = pathQuery.pathname;
  let method = req.method;

  let handler = routes[pathname] ? routes[pathname] : handlers.notfound;

    let buffer = '';
    let decoder = new StringDecoder('utf8');

    req.on('data', data => {
      buffer += decoder.write(data)
    });
    req.on('end', () => {
      buffer += decoder.end();
        let data = {
          pathname: pathname,
          method: method.toLowerCase(),
          headers: req.headers || {},
          body: helpers.jsonToObj(buffer)
        };
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
});

morgan('tiny');

app.listen(PORT, ()=>console.log('port: '+PORT))