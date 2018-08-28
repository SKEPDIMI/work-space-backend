const multer = require('multer');
const path = require('path');
const handlers = require('./handlers');
const helpers = require('./helpers');

const routes = [
  {
    path: '/users/:id?',
    handler: handlers.users,
    methods: 'get post put delete'
  },
  {
    path: '/auth',
    handler: handlers.auth,
    methods: 'get post'
  }
];

const upload = multer ({
  dest: path.join(__dirname + '/../uploads')
});

module.exports = app => {
  for (let i = 0; i < routes.length; i ++) { // initialize all routes and link them to their handlers
    let { path, handler, methods } = routes[i];

    methods.split(' ').forEach(method => { // link the correct request methods to the path 'get post' => ['get', 'post']
      app[method](path, upload.array('files'), (req, res) => { // example: app.get('/users/:id', upload.all(), ... )
        let data = helpers.generateReqData(req);
        
        handler[method](data, (statusCode, payload, contentType) => { // example: handlers.users.get(data, cb);
          res.status(statusCode);
          res.contentType(contentType);
      
          if (contentType == 'application/json') {
            res.json(payload)
          } else {
            res.send(payload)
          }
        })
      })
    });
  }
}