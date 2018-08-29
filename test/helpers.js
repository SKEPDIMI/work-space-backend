process.env.NODE_ENV = 'test';

helpers = {};

// Require dev dependencies
const config = require('../config');
const jwt = require('jsonwebtoken');
const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../index');
const should = chai.should();

chai.use(chaiHttp);

helpers.signAuthToken = (id) => {
  return jwt.sign({ id }, config.jwtKey, {expiresIn: 86400});
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