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
// Note that this example object is inaccessible
const urlDatabase = {
  "b2xVn2": {
    longURL: "http://www.lighthouselabs.ca",
    userID: "Pk5tKY",
    dateCreated: new Date().toUTCString(),
    numVisits: 0,
    uniqVisits: 0,
    visits: [],
  },
};

// Object containing userID objects (filled with ids, emails, and passwords)
// Note that this example user is inaccessible
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

// Helper function used to render an error page with a status and a msg
const errorPage = (req, res, status, msg) => {
  return res.status(status).render('urls_error',{ ...req.templateVars, status, msg});
};

// Middleware callback used for users accessing specific short URL pages
const URLFromShortURL = (req, res, next) => {
  req.templateVars = {
    ...req.templateVars,
    shortURL: req.params.shortURL,
    ...urlDatabase[req.params.shortURL],
  };
  if (!req.templateVars.user || req.templateVars.user.id !== req.templateVars.userID) {
    return errorPage(req, res, 401, "Unauthorized access to short URL page");
  }
  next();
};

// Routes

// GET /
// If logged in, redirects to /urls. Otherwise redirects to /login
app.get("/", (req, res) => {
  if (!req.templateVars.user) {
    return res.redirect('/login');
  }
  return res.redirect('/urls');
});

// GET /urls
// The page to obtain the info about the short urls created. If the user is not logged in, a message
// will be displayed prompting the user to either log in or register an account
app.get("/urls", (req, res) => {
  if (!req.templateVars.user) {
    return errorPage(req, res, 401, "Please log in or register an account to see your short URLs");
  }
  req.templateVars.urls = urlsForUser(urlDatabase, req.templateVars.user.id);
  return res.render('urls_index', req.templateVars);
});

// POST /urls
// Creates a new short URL. A user can only create a short URL if they are logged in.
app.post("/urls", (req, res) => {
  if (!req.templateVars.user) {
    return errorPage(req, res, 401, "Cannot create a short URL while not logged in");
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
  return res.redirect(`/urls/${shortURL}`);
});

// GET /register
// The page to register a new user account in the users database. Can only be accessed if
// the user is not logged in already.
app.get("/register", (req, res) => {
  if (req.templateVars.user) {
    return res.redirect('/urls');
  }
  return res.render('urls_register');
});

// POST /register
// Creates a new account. An error will be sent if the input is unacceptable or if the email
// already exists.
app.post("/register", (req, res) => {
  if (!req.body.email || !req.body.password) {
    return errorPage(req, res, 400, 'Email and password must have values');
  }
  if (keyByEmail(users,req.body.email)) { // assumed that no keys can be falsey in this case
    return errorPage(req, res, 400, 'Email is already registered');
  }
  const newUser = {
    id: generateRandomString(),
    email: req.body.email,
    password: bcrypt.hashSync(req.body.password,8),
  };
  users[newUser.id] = newUser;
  req.session.userID = newUser.id;
  return res.redirect('/urls');
});

// GET /login
// The page to login to an existing account. A logged in user cannot access this page.
app.get('/login', (req, res) => {
  if (req.templateVars.user) {
    return res.redirect('/urls');
  }
  return res.render('urls_login');
});

// POST /login (creating a cookie)
// Logs a user into an account (using a session). A logged in user cannot log into another
// account. An error will be sent if the userID does not exist or the input does not match
// any accounts in the user database
app.post("/login", (req, res) => {
  const userID = keyByEmail(users,req.body.email);
  if (userID === undefined) {
    return errorPage(req, res, 403, "Email and password mismatch"); // purposefully vague error
  }
  if (!bcrypt.compareSync(req.body.password, users[userID].password)) {
    return errorPage(req, res, 403, "Email and password mismatch");
  }
  req.session.userID = userID;
  return res.redirect("/urls");
});

// DELETE /logout (deletes cookie)
// Logs the user out of their current session. Can be accessed by anyone, but will not
// do anything if the user is not logged in
app.delete("/logout", (req, res) => {
  req.session.userID = null;
  return res.redirect("/urls");
});

// GET /urls/new
// Page for creating new short urls. Only accessible by logged in users, other users
// will be redirected
app.get("/urls/new", (req, res) => {
  if (!req.templateVars.user) {
    return res.redirect('/login');
  }
  return res.render("urls_new", req.templateVars);
});

// GET /urls/:shortURL
// Page for viewing and editing a specific short url. Only accessible by the creator
// of the short url
app.get("/urls/:shortURL", URLFromShortURL, (req, res) => {
  return res.render("urls_show", req.templateVars);
});

// PUT /urls/:shortURL
// Edits a short url with a new long url. Can only be done by the owner of the
// short url
app.put("/urls/:shortURL", URLFromShortURL, (req, res) => {
  urlDatabase[req.templateVars.shortURL].longURL = req.body.longURL;
  return res.redirect("/urls");
});

// DELETE /urls/:shortURL
// Deletes the short url from the database. Can only be done by the owner of the
// short url
app.delete("/urls/:shortURL", URLFromShortURL, (req, res) => {
  delete urlDatabase[req.templateVars.shortURL];
  return res.redirect("/urls");
});

// GET /u/:shortURL
// Redirects the user to the long url represented by the short url. If the short url doesn't
// exist, the user is redirected to an error page instead
app.get("/u/:shortURL", (req, res) => {
  const urlData = urlDatabase[req.params.shortURL];
  if (urlData === undefined) {
    return errorPage(req, res, 404, "Short URL not found");
  }
  urlData.numVisits += 1;
  if (!req.session[req.params.shortURL]) {
    urlData.uniqVisits += 1;
    req.session[req.params.shortURL] = generateRandomString();
  }
  urlData.visits.push({visitorID: req.session[req.params.shortURL], date: new Date().toUTCString()});
  return res.redirect(urlData.longURL);
});

// Error handling middleware, specifically used for when the user tries to access an
// unknown page
app.use((req, res) => {
  return errorPage(req, res, 404, "Page not found");
});

// tells the (express) app to listen on port PORT
app.listen(PORT, () => {
  console.log(`TinyApp app listening on port ${PORT}!`);
});