const User = require('../../lib/schemas/user');
const { chaiRequest } = require('../helpers');

describe('POST users', () => {
  beforeEach(done => { // Clear the database before each test
    User.remove({}, err =>  {
      done()
    })
  });

  describe('When invalid username', () => {
    it ('returns 422 status code', done => {
      let user = {
        username: '',
        email: 'foo@bar.com',
        password: 'fjdbb9G74u2hc'
      }
  
      chaiRequest.post('/api/users', user, (err, res) => {
        res.should.have.status(422)
        done()
      });
    })
  });
  describe('When invalid email', () => {
    it ('returns 422 status code', done => {
      let user = {
        username: 'johndoe',
        email: 'foobarcom',
        password: 'fjdbb9G74u2hc'
      }
  
      chaiRequest.post('/api/users', user, (err, res) => {
        res.should.have.status(422)
        done()
      });
    })
  });
  describe('When invalid password', () => {
    it ('returns 422 status code', done => {
      let user = {
        username: 'johndoe',
        email: 'foo@bar.com',
        password: ''
      }
  
      chaiRequest.post('/api/users', user, (err, res) => {
        res.should.have.status(422)
        done()
      });
    })
  });
});