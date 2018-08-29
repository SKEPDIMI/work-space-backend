const User = require('../../lib/schemas/user');
const { chaiRequest } = require('../helpers');

describe('PUT /users/:id', () => {
  GlobalUserData = null // will store the user to be tested on
  const authHeaders = () => {
    return {
      authorization: helpers.signAuthToken(GlobalUserData.id)
    }
  }
  const validUserData = {
    username: 'john_doe',
    email: 'foo@bar.com',
    password: 'Hello1234!'
  }

  beforeEach(done => {
    User.remove({})
    .then(() => {
      User.create(validUserData, (err, user) => {
        if (err) {
          throw err
        }
        GlobalUserData = user
        done()
      });
    });
  });

  describe('When no authorization is provided', () => {
    it('should respond with 401', done => {
      chaiRequest.put(`/users/${GlobalUserData.id}`, { body: { username: '' } }, (err, res) => {
        res.should.have.status(401);
        done();
      });
    });
  });

  describe('When bio has script tags', () => {
    it('should return status code 422', done => {
      bio = '<script="xss.com">This is bogus</script>'
      chaiRequest.put(`/users/${GlobalUserData.id}`, { body: {bio}, headers: authHeaders() }, (err, res) => {
        res.should.have.status(422);
        done();
      });
    });
  });
  describe('When username has script tags', () => {
    it('should return status code 422', done => {
      username = '<script="xss.com">This is bogus</script>'
      chaiRequest.put(`/users/${GlobalUserData.id}`, { body: {username}, headers: authHeaders() }, (err, res) => {
        res.should.have.status(422);
        done();
      });
    });
  });
  describe('When email is invalid', () => {
    it('should return status code 422', done => {
      email = 'bad email'
      chaiRequest.put(`/users/${GlobalUserData.id}`, { body: {email}, headers: authHeaders() }, (err, res) => {
        res.should.have.status(422);
        done();
      });
    });
  });
  describe('When password is invalid', () => {
    it('should return status code 422', done => {
      password = 'badpass'
      chaiRequest.put(`/users/${GlobalUserData.id}`, { body: {password}, headers: authHeaders() }, (err, res) => {
        res.should.have.status(422);
        done();
      });
    });
  });
});