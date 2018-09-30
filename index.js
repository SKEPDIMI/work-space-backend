const url = require('url');
const cors = require('cors');
const mongoose = require('mongoose');
const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

let { DBHost } = process.env;

if (!DBHost) throw 'MISSING DBHOST ENV VARIABLE';

mongoose.connect(DBHost);

var app = express();

app.use(cors());
app.options('*', cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use((req, res, next) => {
  let pathQuery = url.parse(req.url, true);
  req.query = pathQuery.query;
  next();
});
app.use(upload.any());

require('./lib/services/safePopulate')([
  'email',
  'password'
]);
require('./lib/routes')(app);

app.disable('x-powered-by');

morgan('tiny');

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('WORKSPACE API is listening at port ' + PORT))

module.exports = app; // for testing