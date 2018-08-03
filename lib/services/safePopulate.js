/**
 * `.safePopulate` will populate a document's
 * properties unless they should not be shown (unsafe).
 * 
 * Example:
 * ```
 * User_model.findById('1234')
 * .safePopulate('followers', 'username password')
 * .then(user => {
 *   let followingUser = user.followers[0];
 * 
 *   console.log(followingUser.password) // undefined
 * });
 * ```
 * 
 * This is to prevent 
 * 1) Populating all queries automatically upon request
 * 2) Checking if an incoming request has asked for unsafe fields every time
 * 
 * POPULATING MULTIPLE PROPS
 * =
 * User_model.findById('1234')
 * .safePopulate({
 *  followers: 'username password',
 *  posts: 'space'
 * })
 * .then(user => {
 *   console.log(user.followers[0].password) // undefined
 *   console.log(user.posts[0].space.title != 'undefined') // true
 * });
 */

const mongoose = require('mongoose');

module.exports = function(unsafe_selects) {
  if (!Array.isArray(unsafe_selects)) {
    throw 'Expected unsafe_selects to be an array, instead got ' + typeof unsafe_selects
  }
  mongoose.Query.prototype.safePopulate = function(path, select) {
    let acceptable_typeof_path = ['string', 'object'];
    let typeof_path = typeof path;
    let typeof_select = typeof select;
  
    if (path === {} || path === '') return this;

    if (!acceptable_typeof_path.includes(typeof_path)) {
      console.error('.safePopulate first arguments must be a string or object')
      return this
    }
  
    if (typeof_path == 'string') {
      if (typeof_select != 'string') {
        return this
      } else {
        let select_array = select.split(' ');
  
        let safe_select = select_array
          .filter(p => !unsafe_selects.includes(p))
          .join(' ');
        this.populate(path, safe_select);
      }
    } else if (typeof_path == 'object') {
      for (let prop in path) {
        let select = path[prop];
        let select_array = select.split(' ');
  
        let safe_select = select_array
          .filter(p => !unsafe_selects.includes(p))
          .join(' ');
        this.populate(prop, safe_select);
      }
    }
  
    return this
  }
}

