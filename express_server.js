const express = require('express');
const app = express();
const PORT = 8080; // default port 8080
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

// HELPER FUNCTIONS

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

/** Function urlsForUser takes an object that has a series of objects containing user ids
 * and searches them for a specific user id. Each object that contains the specific user id
 * is added to a new object, which is then returned once the parsing has been complete. In
 * the specific case this function is being used, the objects being parsed contain short URL data.
 *
 * @param {*} urls is the object containing each short URL's meta data
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

// NET CODE

// Using middleware
app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: true}));

// Setting ejs (Embedded JavaScript templating) as the template engine
app.set('view engine','ejs');

// Object containing shortURL objects (filled with corresponding longURLs, userIDs, and meta data about the short link)
const urlDatabase = {
  "b2xVn2": {
    longURL: "http://www.lighthouselabs.ca",
    userID: "Pk5tKY",
    dateCreated: new Date().toUTCString(),
    numVisits: 0,
    uniqVisits: 0,
  },
  "9sm5xK": {
    longURL: "http://www.google.com",
    userID: "Pk5tKY",
    dateCreated: new Date().toUTCString(),
    numVisits: 0,
    uniqVisits: 0,
  },
};

// Object containing userID objects (filled with ids, emails, and passwords)
const users = {
  "Pk5tKY": {
    id: "Pk5tKY",
    email: "test@test.com",
    password: "test",
  },
};

// EVENT HANDLERS

// GET /
app.get("/", (req, res) => {
  if (!req.cookies["user_id"] && !users[req.cookies["user_id"]]) {
    return res.redirect('/login');
  }
  res.redirect('/urls');
});

// GET /urls
app.get("/urls", (req, res) => {
  if (!users[req.cookies["user_id"]]) {
    return res.render('urls_index');
  }
  const userURLs = urlsForUser(urlDatabase,users[req.cookies["user_id"]].id);
  const templateVars = { user: users[req.cookies["user_id"]], urls: userURLs };
  res.render('urls_index', templateVars);
});

// POST /urls
app.post("/urls", (req, res) => {
  if (!req.cookies["user_id"] && !users[req.cookies["user_id"]]) {
    return res.status(401).send("Error 401: cannot create a shortURL while not logged in");
  }
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = {
    longURL: req.body.longURL,
    userID: req.cookies["user_id"],
    dateCreated: new Date().toUTCString(),
    numVisits: 0,
    uniqVisits: 0,
  };
  res.redirect(`/urls/${shortURL}`);
});

// GET /register
app.get("/register", (req, res) => {
  if (req.cookies["user_id"] && users[req.cookies["user_id"]]) {
    return res.redirect('/urls');
  }
  const templateVars = { user: users[req.cookies["user_id"]] };
  res.render('urls_register', templateVars);
});

// POST /register
app.post("/register", (req, res) => {
  if (!req.body.email || !req.body.password) {
    return res.status(400).send('error 400: bad input: email and password must have values');
  }
  if (keyByEmail(users,req.body.email)) { // assumed that no keys can be falsey in this case
    return res.status(400).send('error 400: email is already registered');
  }
  const newUser = {
    id: generateRandomString(),
    email: req.body.email,
    password: req.body.password,
  };
  users[newUser.id] = newUser;
  res.cookie('user_id',newUser.id).redirect('/urls');
});

// GET /login
app.get('/login', (req, res) => {
  if (req.cookies["user_id"] && users[req.cookies["user_id"]]) {
    return res.redirect('/urls');
  }
  res.render('urls_login');
});

// POST /login
app.post("/login", (req, res) => {
  const userID = keyByEmail(users,req.body.email);
  if (userID === undefined) {
    return res.status(403).send("Error 403: email and password mismatch"); // purposefully vague error
  }
  if (users[userID].password !== req.body.password) {
    return res.status(403).send("Error 403: email and password mismatch");
  }
  res.cookie('user_id', userID).redirect("/urls");
});

// POST /logout
app.post("/logout", (req, res) => {
  res.clearCookie('user_id').redirect("/urls");
});

// GET /urls/new
app.get("/urls/new", (req, res) => {
  if (!req.cookies["user_id"]) {
    return res.redirect('/login');
  }
  const templateVars = { user: users[req.cookies["user_id"]] };
  res.render("urls_new", templateVars);
});

// GET /urls/:shortURL
app.get("/urls/:shortURL", (req, res) => {
  if (!urlDatabase[req.params.shortURL]) {
    return res.status(404).send("Error 404: short URL not found");
  }
  if (!users[req.cookies["user_id"]] ||
      users[req.cookies["user_id"]].id !== urlDatabase[req.params.shortURL].userID) {
    return res.status(401).send("Error 401: unauthorized access to short URL page");
  }
  const templateVars = {
    user: users[req.cookies["user_id"]],
    shortURL: req.params.shortURL,
    longURL: urlDatabase[req.params.shortURL].longURL,
    date: urlDatabase[req.params.shortURL].dateCreated,
    numVisits: urlDatabase[req.params.shortURL].numVisits,
    uniqVisits: urlDatabase[req.params.shortURL].uniqVisits,
  };
  res.render("urls_show", templateVars);
});

// POST /urls/:shortURL
app.post("/urls/:shortURL", (req, res) => {
  if (!users[req.cookies["user_id"]] ||
      users[req.cookies["user_id"]].id !== urlDatabase[req.params.shortURL].userID) {
    return res.status(401).send("Error 401: unauthorized access to edit short URL page");
  }
  const shortURL = req.params.shortURL;
  urlDatabase[shortURL]["longURL"] = req.body.longURL;
  res.redirect("/urls");
});

// POST /urls/:shortURL/delete
app.post("/urls/:shortURL/delete", (req, res) => {
  if (!users[req.cookies["user_id"]] ||
      users[req.cookies["user_id"]].id !== urlDatabase[req.params.shortURL].userID) {
    return res.status(401).send("Error 401: unauthorized access to delete short URL page");
  }
  const shortURL = req.params.shortURL;
  delete urlDatabase[shortURL];
  res.redirect("/urls");
});

// GET /u/:shortURL
app.get("/u/:shortURL", (req, res) => {
  const urlData = urlDatabase[req.params.shortURL];
  if (urlData === undefined) {
    res.status(404).send("Error 404: shortURL not found");
  } else {
    urlData.numVisits += 1;
    if (!req.cookies[req.params.shortURL]) {
      urlData.uniqVisits += 1;
      res.cookie(req.params.shortURL,'true');
    }
    res.redirect(urlData.longURL);
  }
});

// tells the (express) app to listen on port PORT
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});