/** Function keyByEmail takes an object that has a series of objects containing emails
 * and searchs for an object containing a specific email. On the first instance of that
 * email, the key of the object containing the email is returned. Otherwise, if the email
 * does not exist in any of the objects, then undefined is returned.
 *
 * @param {*} obj is an object containing objects that have email properties in them
 * @param {*} email is a string that is being searched for in the object
 * @returns string or undefined: the corresponding key to the object that contained the email string
 */
const keyByEmail = (obj,email) => {
  for (const key in obj) {
    if (obj[key].email === email) return key;
  }
  return undefined;
};

/** Function generateRandomString generates a random 6 character alpha-numeric string and returns it
 *  @returns string: a 6 character alpha-numberic string
 */
const generateRandomString = function() {
  const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < 6; i++) {
    let randChar = chars.charAt(Math.floor((Math.random() * chars.length)));
    result = `${result}${randChar}`;
  }
  return result;
};

/** Function urlsForUser takes an object that has a series of objects containing user ids
 * and searches them for a specific user id. Each object that contains the specific user id
 * is added to a new object, which is then returned once the parsing has been complete. In
 * the specific case this function is being used, the objects being parsed contain short URL data.
 *
 * @param {*} urls is an object containing each short URL's meta data
 * @param {*} id is a string representing the user id to search for
 * @returns object: contains each short URL and its meta data owned by the user with "id"
 */
const urlsForUser = (urls,id) => {
  const result = {};
  for (const shortURL in urls) {
    if (urls[shortURL].userID === id) {
      result[shortURL] = urls[shortURL];
    }
  }
  return result;
};

module.exports = {
  keyByEmail,
  generateRandomString,
  urlsForUser,
};