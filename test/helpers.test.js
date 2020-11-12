const { assert } = require('chai');

const { keyByEmail, generateRandomString, urlsForUser } = require('../helpers.js');

describe("#keyByEmail", () => {
  const testUsers = {
    "aAaAaA": {
      id: "aAaAaA",
      email: "a@b.com",
      password: "hunter2"
    },
    "bBbBbB": {
      id: "bBbBbB",
      email: "c@d.com",
      password: "p455w0rd"
    }
  };
  it("should obtain the correct user key based on email", () => {
    const actual = keyByEmail(testUsers,"a@b.com");
    const expected = "aAaAaA";
    assert.strictEqual(actual,expected);
  });
  it("should not obtain any keys based on email and return undefined", () => {
    const actual = keyByEmail(testUsers,"d@e.com");
    const expected = undefined;
    assert.strictEqual(actual,expected);
  });
});

describe("#generateRandomString", () => {
  it("should generate a string of 6 length, with only alpha-numeric characters", () => {
    const actual = generateRandomString();
    const regex = (/[0-9A-Za-z]{6}/g);
    assert.isTrue(regex.test(actual));
  });
});

describe("#urlsForUser", () => {
  const testURLs = {
    "b2xVn2": {
      longURL: "http://www.lighthouselabs.ca",
      userID: "aAaAaA",
      dateCreated: new Date().toUTCString(),
      numVisits: 0,
      uniqVisits: 0,
    },
    "9sm5xK": {
      longURL: "http://www.google.com",
      userID: "bBbBbB",
      dateCreated: new Date().toUTCString(),
      numVisits: 0,
      uniqVisits: 0,
    },
    "eXeXeX": {
      longURL: "http://www.lighthouselabs.ca",
      userID: "aAaAaA",
      dateCreated: new Date().toUTCString(),
      numVisits: 0,
      uniqVisits: 0,
    },
  };
  it("should return an object filled with short URL objects that have matching userIDs", () => {
    const actual = urlsForUser(testURLs,"aAaAaA");
    const expected = { "b2xVn2": testURLs["b2xVn2"], "eXeXeX": testURLs["eXeXeX"]};
    assert.deepEqual(actual,expected);
  });
  it("should return an empty object", () => {
    const actual = urlsForUser(testURLs,"cCcCcC");
    const expected = {};
    assert.deepEqual(actual,expected);
  });
});