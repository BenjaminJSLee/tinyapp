const express = require('express');
const app = express();
const PORT = 8080; // default port 8080
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

/** Function generateRandomString generates a random 6 character alpha-numeric string and returns it
 *  @returns result: a 6 character alpha-numberic string
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

const hasEmail = (obj,email) => {
  for (const key in obj) {
    if (obj[key].email === email) return true;
  }
  return false;
};

// Using middleware
app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: true}));

// Setting ejs (Embedded JavaScript templating) as the template engine
app.set('view engine','ejs');

// Object containing shortURL - longURL key - value pairs
const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

// Object containing userID objects (filled with ids, emails, and passwords)
const users = {

};

// GET /
app.get("/", (req, res) => {
  res.send("Hello!");
});

// GET /urls.json
app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

// GET /hello
app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

// POST /urls
app.post("/urls", (req, res) => {
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = req.body.longURL;
  res.redirect(`/urls/${shortURL}`);
});

// GET /urls
app.get("/urls", (req, res) => {
  const templateVars = { user: users[req.cookies["user_id"]], urls: urlDatabase };
  res.render('urls_index', templateVars);
});

app.get("/register", (req, res) => {
  const templateVars = { user: users[req.cookies["user_id"]] };
  res.render('urls_register', templateVars);
});

app.post("/register", (req, res) => {
  if (!req.body.email || !req.body.password) {
    return res.status(400).send('error 400: bad input');
  }
  if (hasEmail(users,req.body.email)) {
    return res.status(400).send('error : email is already registered');
  }
  const newUser = {
    id: generateRandomString(),
    email: req.body.email,
    password: req.body.password,
  };
  users[newUser.id] = newUser;
  console.log(users);
  res.cookie('user_id',newUser.id).redirect('/urls');
});

// POST /login
app.post("/login", (req, res) => {
  const username = req.body.username;
  res.cookie('username', username).redirect("/urls");
});

// POST /logout
app.post("/logout", (req, res) => {
  res.clearCookie('user_id').redirect("/urls");
});

// GET /urls/new
app.get("/urls/new", (req, res) => {
  const templateVars = { user: users[req.cookies["user_id"]] };
  res.render("urls_new", templateVars);
});

// GET /urls/:shortURL
app.get("/urls/:shortURL", (req, res) => {
  const templateVars = { user: users[req.cookies["user_id"]], shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL]};
  res.render("urls_show", templateVars);
});

// POST /urls/:shortURL
app.post("/urls/:shortURL", (req, res) => {
  const shortURL = req.params.shortURL;
  urlDatabase[shortURL] = req.body.longURL;
  res.redirect("/urls");
});

// POST /urls/:shortURL/delete
app.post("/urls/:shortURL/delete", (req, res) => {
  const shortURL = req.params.shortURL;
  delete urlDatabase[shortURL];
  res.redirect("/urls");
});

// GET /u/:shortURL
app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL];
  if (longURL === undefined) {
    res.statusCode = 404;
    res.end();
  } else {
    res.redirect(longURL);
  }
});

// tells the (express) app to listen on port PORT
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});