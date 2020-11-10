const express = require("express");
const app = express();
const PORT = 8080; // default port 8080
const bodyParser = require("body-parser");

function generateRandomString() {
  const maxChar = 'z'.charCodeAt(0);
  const minChar = '0'.charCodeAt(0);
  const numIgnoredChar = ('A'.charCodeAt(0) + 1) - ('9'.charCodeAt(0) + 1) + ('a'.charCodeAt(0) + 1) - ('Z'.charCodeAt(0) + 1);
  let result = "";
  for (let i = 0; i < 6; i++) {
    let randChar = Math.floor((Math.random() * (maxChar - minChar - numIgnoredChar))) + minChar;
    if (randChar >= ('9'.charCodeAt(0) + 1)) randChar += ('A'.charCodeAt(0) + 1) - ('9'.charCodeAt(0) + 1);
    if (randChar >= ('Z'.charCodeAt(0) + 1)) randChar += ('a'.charCodeAt(0) + 1) - ('Z'.charCodeAt(0) + 1);
    randChar = String.fromCharCode(randChar);
    result = `${result}${randChar}`;
  }
  return result;
}

app.use(bodyParser.urlencoded({extended: true}));

app.set('view engine','ejs');

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.post("/urls", (req, res) => {
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = req.body.longURL;
  // res.render("urls_show", {shortURL: shortURL, longURL: req.body.longURL}); 
  res.redirect(`/urls/${shortURL}`);
});

app.get("/urls", (req, res) => {
  const templateVars = { urls: urlDatabase };
  res.render('urls_index', templateVars);
});

app.get("/urls/new", (req, res) => {
  res.render("urls_new");
});

app.get("/urls/:shortURL", (req, res) => {
  const templateVars = { shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL]};
  res.render("urls_show", templateVars);
});

app.post("/urls/:shortURL", (req, res) => {
  const shortURL = req.params.shortURL;
  urlDatabase[shortURL] = req.body.longURL;
  res.redirect("/urls");
});

app.post("/urls/:shortURL/delete", (req, res) => {
  const shortURL = req.params.shortURL;
  delete urlDatabase[shortURL];
  res.redirect("/urls");
});

app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL];
  if (longURL === undefined) {
    res.statusCode = 404;
    res.end();
  } else {
    res.redirect(longURL);
  }
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});