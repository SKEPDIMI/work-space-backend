const config = {
  jwtKey : 'if5jfvi4', // the key we use to encrypt jwt tokens
  
  DBHost: process.env.NODE_ENV == 'production' ? // database for testing & development / production
    `mongodb:\/\/${this.DBusername}:${this.DBpassword}@ds235860.mlab.com:35860/work-space` :
    'mongodb://localhost/work-space',
  DBusername: 'admin',
  DBpassword: '8ce70ac8ece252cc48a2fb875fd69f589c0ba0e53cc62c76241e81529dfb2b1f',

  salt: 10
}

module.exports = config