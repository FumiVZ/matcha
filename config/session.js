const session = require('express-session');

const store = new session.MemoryStore();

const sessionMiddleware = session({
  store: store,
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 1000 * 60 * 60
  }
});

// Attach store to middleware to access it in server.js
sessionMiddleware.store = store;

module.exports = sessionMiddleware;