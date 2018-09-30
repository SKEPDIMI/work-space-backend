const User = require('../../lib/schemas/user');
const { chaiRequest } = require('../helpers');

describe('GET Users', () => {
  beforeEach(done => { // Clear the database before each test
    User.remove({}, err =>  {
      done()
    })
  });

  describe('GET /users', () => {
    it('should get all users', done => {
      chaiRequest.get('/api/users', {}, (err, res) => {
        res.should.have.status(200)
        res.body.should.be.a('array')
        done()
      })
    })
  });

  describe('GET /users/:id', () => {
    describe('when user exists', () => {
      it('should get a single user', done => {
        User.create({ username: 'John Doe', email: 'foo@bar.com', password: '123Hello!' }, (err, user) => {
          if (err) {
            throw err
          }
          chaiRequest.get(`/api/users/${user.id}`, {}, (err, res) => {
            res.should.have.status(200)
            res.body.should.be.a('object')
            res.body.username.should.equal(user.username)
            done()
          });
        })
      })
    });

    describe('when user does not exist', () => {
      it('should return a 404 status code', done => {
        chaiRequest.get('/api/users/1', {}, (err, res) => {
          res.should.have.status(404)
          res.body.should.be.a('object')
          done()
        });
      })
    });
  });
});