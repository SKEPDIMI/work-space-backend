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
});