const Space = require('../../lib/schemas/space');
const { chaiRequest, generateSample } = require('../helpers');
const querystring = require('querystring');

describe('GET Spaces', () => {
  GlobalSpaceData = null;

  before(generateSample('spaces'));
  beforeEach(async () => {
    GlobalSpaceData = await Space.findOne({});
  });

  describe('GET /spaces', () => {
    it('should get all spaces', done => {
      chaiRequest.get('/spaces', {}, (err, res) => {
        res.should.have.status(200);
        res.body.should.be.a('array');
        res.body.length.should.equal(helpers.sampleData.spaces.length);
        done();
      });
    });
  });
  describe('GET /spaces/:id', () => {
    it('should get space data', done => {
      chaiRequest.get(`/spaces/${GlobalSpaceData.id}`, {}, (err, res) => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        res.body._id.should.equal(GlobalSpaceData.id);
        done();
      });
    });
  });
  describe('GET /spaces/:id POPULATED', () => {
    describe('When populating owner', () => {
      it('should show owner data', done => {
        let query = querystring.stringify({ population: 'owner' });

        chaiRequest.get(
          `/spaces/${GlobalSpaceData.id}?${query}`,
          {},
          (err, res) => {
            res.should.have.status(200);
            res.body.owner.should.be.a('object');
            res.body.owner.username.should.be.a('string');
            done();
          }
        );
      });
    });
    describe('When populating users', () => {
      it('should show owner data', done => {
        let query = querystring.stringify({ population: 'users' });

        chaiRequest.get(
          `/spaces/${GlobalSpaceData.id}?${query}`,
          {},
          (err, res) => {
            res.should.have.status(200);
            res.body.users.should.be.a('array');
            done();
          }
        );
      });
    });
  });
});