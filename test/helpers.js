process.env.NODE_ENV = 'test';

helpers = {};

// Require dev dependencies
const config = require('../config');
const jwt = require('jsonwebtoken');
const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../index');
const User = require('../lib/schemas/user');
const Space = require('../lib/schemas/space');
const should = chai.should();

chai.use(chaiHttp);

helpers.signAuthToken = (id) => {
  return jwt.sign({ id }, config.jwtKey, {expiresIn: 86400});
}

helpers.sampleData = {}

helpers.sampleData.user = {
  username: 'john_doe',
  email: 'foo@bar.com',
  password: 'Hello1234!'
}
helpers.sampleData.spaces = [
  { title: 'Node.js', description: 'This is a node.js space', owner: null },
  { title: 'Ruby on Rails', description: 'This is a ROR space', owner: null }
]

helpers.generateSample = (m) => { // will generate sample data to test
  switch(m.toLowerCase()) {
    case "spaces":
      return async () => { // Clear the database and create sample Spaces
        await User.remove({});
        await Space.remove({});

        user = await User.create(helpers.sampleData.user);
    
        helpers.sampleData.spaces.forEach(async spaceData => {
          await Space.create({...spaceData, owner: user._id})
          .then(space => true)
          .catch(err => { throw err });
        });
      }
      break;
  }
}

helpers.chaiRequest = {}
helpers.chaiRequest.get = (path, data, cb) => {
  let request = chai.request(server)
  .get(path)

  for (let header in data.headers) { // SET HTTP HEADERS
    if (data.headers.hasOwnProperty(header)) {
      request.set(header, data.headers[header])
    }
  }

  request
    .end((err, res) => {
      if (err) {
        throw err
      }
      cb(err, res)
    });
}
helpers.chaiRequest.post = (path, data, cb) => {
  let request = chai.request(server)
  .post(path)

  for (let header in data.headers) { // SET HTTP HEADERS
    if (data.headers.hasOwnProperty(header)) {
      request.set(header, data.headers[header])
    }
  }
  
  request
    .send(data.body || {})
    .end((err, res) => {
      if (err) {
        throw err
      }
      cb(err, res)
    });
}
helpers.chaiRequest.put = (path, data, cb) => {
  let request = chai.request(server)
  .put(path)

  for (let header in data.headers) { // SET HTTP HEADERS
    if (data.headers.hasOwnProperty(header)) {
      request.set(header, data.headers[header])
    }
  }
  
  request
    .send(data.body || {})
    .end((err, res) => {
      if (err) {
        throw err
      }
      cb(err, res)
    });
}

module.exports = helpers