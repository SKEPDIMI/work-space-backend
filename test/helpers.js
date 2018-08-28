process.env.NODE_ENV = 'test';

helpers = {};

// Require dev dependencies
const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../index');
const should = chai.should();

chai.use(chaiHttp);

helpers.chaiRequest = {}
helpers.chaiRequest.get = (path, data, cb) => {
  chai.request(server)
    .get(path)
    .end((err, res) => {
      cb(err, res)
    });
}
helpers.chaiRequest.post = (path, data, cb) => {
  chai.request(server)
    .post(path)
    .send(data)
    .end((err, res) => {
      cb(err, res)
    });
}

module.exports = helpers