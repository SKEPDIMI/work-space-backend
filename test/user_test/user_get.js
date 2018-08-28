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
      chaiRequest.get('/users', {}, (err, res) => {
        res.should.have.status(200)
        res.body.should.be.a('array')
        done()
      })
    })
  });

  describe('GET /users/:id', () => {
    it('should get a single user', done => {
      User.create({ username: 'John Doe', email: 'foo@bar.com', password: '123Hello!' }, (err, user) => {
        if (err) {
          throw err
        }
        chaiRequest.get(`/users/${user.id}`, {}, (err, res) => {
          res.should.have.status(200)
          res.body.should.be.a('object')
          done()
        });
      })
    })
  });
});