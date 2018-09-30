const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sanitizer = require('sanitizer')
const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');
const url = require('url');

let {
  jwtsalt,
  jwtKey
} = process.env;

if (!jwtsalt) throw 'MISSING JWTSALT ENV VARIABLE';
if (!jwtKey) throw 'MISSING JWTKEY ENV VARIABLE';

var top500mostCommonPasswords = Array("123456","password","12345678","1234","pussy","12345","dragon","qwerty","696969","mustang","letmein","baseball","master","michael","football","shadow","monkey","abc123","pass","6969","jordan","harley","ranger","iwantu","jennifer","hunter","2000","test","batman","trustno1","thomas","tigger","robert","access","love","buster","1234567","soccer","hockey","killer","george","sexy","andrew","charlie","superman","asshole","dallas","jessica","panties","pepper","1111","austin","william","daniel","golfer","summer","heather","hammer","yankees","joshua","maggie","biteme","enter","ashley","thunder","cowboy","silver","richard","orange","merlin","michelle","corvette","bigdog","cheese","matthew","121212","patrick","martin","freedom","ginger","blowjob","nicole","sparky","yellow","camaro","secret","dick","falcon","taylor","111111","131313","123123","bitch","hello","scooter","please","","porsche","guitar","chelsea","black","diamond","nascar","jackson","cameron","654321","computer","amanda","wizard","xxxxxxxx","money","phoenix","mickey","bailey","knight","iceman","tigers","purple","andrea","horny","dakota","aaaaaa","player","sunshine","morgan","starwars","boomer","cowboys","edward","charles","girls","booboo","coffee","xxxxxx","bulldog","ncc1701","rabbit","peanut","john","johnny","gandalf","spanky","winter","brandy","compaq","carlos","tennis","james","mike","brandon","fender","anthony","blowme","ferrari","cookie","chicken","maverick","chicago","joseph","diablo","sexsex","hardcore","666666","willie","welcome","chris","panther","yamaha","justin","banana","driver","marine","angels","fishing","david","maddog","hooters","wilson","butthead","dennis","captain","bigdick","chester","smokey","xavier","steven","viking","snoopy","blue","eagles","winner","samantha","house","miller","flower","jack","firebird","butter","united","turtle","steelers","tiffany","zxcvbn","tomcat","golf","bond007","bear","tiger","doctor","gateway","gators","angel","junior","thx1138","porno","badboy","debbie","spider","melissa","booger","1212","flyers","fish","porn","matrix","teens","scooby","jason","walter","cumshot","boston","braves","yankee","lover","barney","victor","tucker","princess","mercedes","5150","doggie","zzzzzz","gunner","horney","bubba","2112","fred","johnson","xxxxx","tits","member","boobs","donald","bigdaddy","bronco","penis","voyager","rangers","birdie","trouble","white","topgun","bigtits","bitches","green","super","qazwsx","magic","lakers","rachel","slayer","scott","2222","asdf","video","london","7777","marlboro","srinivas","internet","action","carter","jasper","monster","teresa","jeremy","11111111","bill","crystal","peter","pussies","cock","beer","rocket","theman","oliver","prince","beach","amateur","7777777","muffin","redsox","star","testing","shannon","murphy","frank","hannah","dave","eagle1","11111","mother","nathan","raiders","steve","forever","angela","viper","ou812","jake","lovers","suckit","gregory","buddy","whatever","young","nicholas","lucky","helpme","jackie","monica","midnight","college","baby","brian","mark","startrek","sierra","leather","232323","4444","beavis","bigcock","happy","sophie","ladies","naughty","giants","booty","blonde","golden","0","fire","sandra","pookie","packers","einstein","dolphins","0","chevy","winston","warrior","sammy","slut","8675309","zxcvbnm","nipples","power","victoria","asdfgh","vagina","toyota","travis","hotdog","paris","rock","xxxx","extreme","redskins","erotic","dirty","ford","freddy","arsenal","access14","wolf","nipple","iloveyou","alex","florida","eric","legend","movie","success","rosebud","jaguar","great","cool","cooper","1313","scorpio","mountain","madison","987654","brazil","lauren","japan","naked","squirt","stars","apple","alexis","aaaa","bonnie","peaches","jasmine","kevin","matt","qwertyui","danielle","beaver","4321","4128","runner","swimming","dolphin","gordon","casper","stupid","shit","saturn","gemini","apples","august","3333","canada","blazer","cumming","hunting","kitty","rainbow","112233","arthur","cream","calvin","shaved","surfer","samson","kelly","paul","mine","king","racing","5555","eagle","hentai","newyork","little","redwings","smith","sticky","cocacola","animal","broncos","private","skippy","marvin","blondes","enjoy","girl","apollo","parker","qwert","time","sydney","women","voodoo","magnum","juice","abgrtyu","777777","dreams","maxwell","music","rush2112","russia","scorpion","rebecca","tester","mistress","phantom","billy","6666","albert");

let helpers = {};

helpers.jsonToObj = function (json) {
  try {
    let obj = JSON.parse(json);
    return obj;
  } catch (e) {
    return {}
  }
};

helpers.hash = function (password, callback) {
  bcrypt.hash(password, jwtsalt, (err, hashed) => {
    callback(err, hashed)
  });
};

helpers.hashSync = password => bcrypt.hashSync(password, jwtsalt);

helpers.compare = function (pass, hash, callback) {
  bcrypt.compare(pass, hash, (err,res) => {
    callback(err,res)
  });
};

helpers.compareSync = (pass, hash) => bcrypt.compareSync(pass, hash);

helpers.followsGuidelines = (type = null, string = false, needsSanitazion = true) => {
  if (typeof string !== 'string') return { isValid: false, message: `Expected string, instead got ${typeof string}.` }
  if (needsSanitazion) string = sanitizer.sanitize(string);

  switch (type.toLowerCase()) {
    case "email":
      if (string.trim().length <= 5) return { response: false, message: 'Email is too short'};
      if (string.length > 64) return { response: false, message: 'Email is too long' };

      const emailRegex = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i

      return emailRegex.test(string.toLowerCase()) ?
      {response: true} : {response: false, message: 'Email is badly formatted'};
      break
    case "password":
      let hasUndercase = (/[a-z]/.test(string));
      let hasUppercase = (/[A-Z]/.test(string));
      let hasNumber = /\d/.test(string);
      let isCommon = top500mostCommonPasswords.includes(string);
      let largerOrEqualTo10 = string.trim().length >= 10;
      let smallerThan128 = string.length < 128;

      let passwordMust = [];
      if (isCommon) passwordMust.push('be less common');
      if (!hasUndercase) passwordMust.push('contain atleast one lowercase letter');
      if (!hasUppercase) passwordMust.push('contain atleast one uppercase letter');
      if (!hasNumber) passwordMust.push('contain atleast one digit');
      if (!largerOrEqualTo10) passwordMust.push('be longer than 10 characters');
      if (!smallerThan128) passwordMust.push('be shorter than 128 characters');

      if (passwordMust.length > 0) {
        let message = 'Password must ' + passwordMust.join(', ') + '.';
        return {response: false, message}
      }
      return { response: true, password: string }
      break;
    default:
      return { response: false, message: 'Invalid type given to verify' }
  };
};

helpers.sendEmail = ({email, subject, text, html}) => new Promise ((resolve, reject) => {
  if (!email) return reject('NO EMAIL PROVIDED');

  let transporter = nodemailer.createTransport(smtpTransport({
    service: 'gmail',
    auth: {
      type: 'oauth2',
      user: 'officialwork.space.noreply@gmail.com', // generated ethereal user
      pass: 'L2qfY.rtbX>W<g+a' // generated ethereal password
    }
  }));

  // setup email data with unicode symbols
  let mailOptions = {
    from: '"WorkSpace" officialwork.space.noreply@gmail.com', // sender address
    to: email, // list of receivers
    subject: subject || 'WorkSpace', // Subject line
    text: text || '', // plain text body
    html: html || '' // html body
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      reject(error)
    } else {
      resolve(info)
    }
  });
});

helpers.generateReqData = req => {
  // will make sure that the req handler recieves correct data from the request
  // data such as headers, params, body and files
  let pathQuery = url.parse(req.url, true);

  return {
    pathname: pathQuery.pathname,
    method: req.method.toLowerCase(),
    headers: req.headers || {},
    params: req.params || {},
    body: req.body || {},
    files: req.files || {},
    query: pathQuery.query || {}
  }
}

helpers.decodeToken = (token) => {
  try {
    let decoded = jwt.verify(token, jwtKey);
    return decoded
  } catch (e) {
    return false
  }
}

module.exports = helpers;