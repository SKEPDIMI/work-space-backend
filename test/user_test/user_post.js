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
  
      chaiRequest.post('/users', { body: user }, (err, res) => {
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
  
      chaiRequest.post('/users', { body: user }, (err, res) => {
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
  
      chaiRequest.post('/users', user, (err, res) => {
        res.should.have.status(422)
        done()
      });
    })
  });
  describe('When user with same email or username exists', () => {
    it('should return 409 status code', done => {
      let userData = {
        username: 'foobar',
        email: 'foo@bar.com',
        password: '1234Hello!'
      }
      User.create(userData, (err) => {
        chaiRequest.post('/users', { body: userData }, (err, res) => {
          res.should.have.status(409)
          done()
        });
      })
    })
  });
  describe('When user has scripts in email or username', () => { // This is to prevent XSS attacks
    it('should return 422 status code', done => {
      let user = {
        email: '<script>this is bogus</script>',
        username: '<script src="xss.com"></script>',
        password: '1234Hello!'
      }
      chaiRequest.post('/users', user, (err, res) => {
        res.should.have.status(422)
        done()
      });
    });
  });
  describe('When request inputs are valid', () => {
    let userData = {
      email: 'foo@bar.com',
      username: 'john_doe123',
      password: '1234Hello!'
    }
    it('should create user', done => {
      chaiRequest.post('/users', { body: userData }, (err, res) => {
        res.should.have.status(200)
        res.body.auth_token.should.be.a('string')
        User.findOne({}, (err, user) => {
          user.should.be.a('object')
          user.username.should.equal(userData.username)
          done()
        });
      });
    });
  });
});