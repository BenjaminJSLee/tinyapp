const express = require('express');
const app = express();
const methodOverride = require('method-override');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');

// Helper functions
const { keyByEmail, generateRandomString, urlsForUser } = require('./helpers.js');

const PORT = 8080; // default port 8080

// Object containing shortURL objects (filled with corresponding longURLs, userIDs, and meta data about the short link)
const urlDatabase = {
  "b2xVn2": {
    longURL: "http://www.lighthouselabs.ca",
    userID: "Pk5tKY",
    dateCreated: new Date().toUTCString(),
    numVisits: 0,
    uniqVisits: 0,
    visits: [],
  },
  "9sm5xK": {
    longURL: "http://www.google.com",
    userID: "Pk5tKY",
    dateCreated: new Date().toUTCString(),
    numVisits: 0,
    uniqVisits: 0,
    visits: [],
  },
};

// Object containing userID objects (filled with ids, emails, and passwords)
// Note that this user is inaccessible and is only here as an example
const users = {
  "Pk5tKY": {
    id: "Pk5tKY",
    email: "test@test.com",
    password: "test",
  },
};

// Allows POST methods to be converted to other methods
app.use(methodOverride('_method'));

// Middleware used to encrypt, decrypt, and store cookies
app.use(cookieSession({
  session: 'session',
  keys: ["one","two"],
}));

// Middleware  used to parse encoded data sent by forms
app.use(bodyParser.urlencoded({extended: true}));

// Custom middleware used to set user info depending on if the user is logged in or not
app.use((req, res, next) => {
  req.templateVars = req.session.userID ? { user: users[req.session.userID] } : { user: null };
  next();
});

// Setting ejs (Embedded JavaScript templating) as the template engine
app.set('view engine','ejs');

//

const setTemplateURLs = (req, res, next) => {
  req.templateVars.urls = urlsForUser(urlDatabase,req.templateVars.user ? req.templateVars.user.id : null);
  next();
};

// Routes

// GET /
// If logged in, redirects to /urls. Otherwise redirects to /login
app.get("/", (req, res) => {
  if (!req.templateVars.user) {
    return res.redirect('/login');
  }
  res.redirect('/urls');
});

// GET /urls
// The page to obtain the info about the short urls created. If the user is not logged in, a message
// will be displayed prompting the user to either log in or register an account
app.get("/urls", setTemplateURLs, (req, res) => {
  if (!req.templateVars.user) {
    return res.render('urls_index');
  }
  res.render('urls_index', req.templateVars);
});

// POST /urls
// Creates a new short URL. A user can only create a short URL if they are logged in.
app.post("/urls", (req, res) => {
  if (!req.templateVars.user) {
    return res.status(401).send("Error 401: cannot create a shortURL while not logged in");
  }
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = {
    longURL: req.body.longURL,
    userID: req.session.userID,
    dateCreated: new Date().toUTCString(),
    numVisits: 0,
    uniqVisits: 0,
    visits: [],
  };
  res.redirect(`/urls/${shortURL}`);
});

// GET /register
// The page to register a new user account in the users database. Can only be accessed if
// the user is not logged in already.
app.get("/register", (req, res) => {
  if (req.templateVars.user) {
    return res.redirect('/urls');
  }
  res.render('urls_register', req.templateVars);
});

// POST /register
// Creates a new account. An error will be sent if the input is unacceptable or if the email
// already exists.
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
    password: bcrypt.hashSync(req.body.password,8),
  };
  users[newUser.id] = newUser;
  req.session.userID = newUser.id;
  res.redirect('/urls');
});

// GET /login
// The page to login to an existing account. A logged in user cannot access this page.
app.get('/login', (req, res) => {
  if (req.templateVars.user) {
    return res.redirect('/urls');
  }
  res.render('urls_login');
});

// POST /login (creating a cookie)
// Logs a user into an account (using a session). A logged in user cannot log into another
// account. An error will be sent if the userID does not exist or the input does not match
// any accounts in the user database
app.post("/login", (req, res) => {
  const userID = keyByEmail(users,req.body.email);
  if (userID === undefined) {
    return res.status(403).send("Error 403: email and password mismatch"); // purposefully vague error
  }
  if (!bcrypt.compareSync(req.body.password, users[userID].password)) {
    return res.status(403).send("Error 403: email and password mismatch");
  }
  req.session.userID = userID;
  res.redirect("/urls");
});

// DELETE /logout (deletes cookie)
// Logs the user out of their current session. Can be accessed by anyone, but will not
// do anything if the user is not logged in
app.delete("/logout", (req, res) => {
  req.session.userID = null;
  res.redirect("/urls");
});

// GET /urls/new
// Page for creating new short urls. Only accessible by logged in users, other users
// will be redirected
app.get("/urls/new", (req, res) => {
  if (!req.templateVars.user) {
    return res.redirect('/login');
  }
  res.render("urls_new", req.templateVars);
});

// GET /urls/:shortURL
// Page for viewing and editing a specific short url. Only accessible by the creator
// of the short url
app.get("/urls/:shortURL", (req, res) => {
  if (!urlDatabase[req.params.shortURL]) {
    return res.status(404).send("Error 404: short URL not found");
  }
  if (!users[req.session.userID] ||
      users[req.session.userID].id !== urlDatabase[req.params.shortURL].userID) {
    return res.status(401).send("Error 401: unauthorized access to short URL page");
  }
  req.templateVars = {
    ...req.templateVars,
    shortURL: req.params.shortURL,
    ...urlDatabase[req.params.shortURL],
  };
  res.render("urls_show", req.templateVars);
});

// PUT /urls/:shortURL
// Edits a short url with a new long url. Can only be done by the owner of the
// short url
app.put("/urls/:shortURL", (req, res) => {
  if (!users[req.session.userID] ||
      users[req.session.userID].id !== urlDatabase[req.params.shortURL].userID) {
    return res.status(401).send("Error 401: unauthorized access to edit short URL page");
  }
  const shortURL = req.params.shortURL;
  urlDatabase[shortURL]["longURL"] = req.body.longURL;
  res.redirect("/urls");
});

// DELETE /urls/:shortURL
// Deletes the short url from the database. Can only be done by the owner of the
// short url
app.delete("/urls/:shortURL", (req, res) => {
  if (!users[req.session.userID] ||
      users[req.session.userID].id !== urlDatabase[req.params.shortURL].userID) {
    return res.status(401).send("Error 401: unauthorized access to delete short URL page");
  }
  const shortURL = req.params.shortURL;
  delete urlDatabase[shortURL];
  res.redirect("/urls");
});

// GET /u/:shortURL
// Redirects the user to the long url represented by the short url. If the short url doesn't
// exist, the user is redirected to an error page instead
app.get("/u/:shortURL", (req, res) => {
  const urlData = urlDatabase[req.params.shortURL];
  if (urlData === undefined) {
    res.status(404).send("Error 404: shortURL not found");
  } else {
    urlData.numVisits += 1;
    if (!req.session[req.params.shortURL]) {
      urlData.uniqVisits += 1;
      req.session[req.params.shortURL] = generateRandomString();
    }
    urlData.visits.push({visitorID: req.session[req.params.shortURL], date: new Date().toUTCString()});
    res.redirect(urlData.longURL);
  }
});

// tells the (express) app to listen on port PORT
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});