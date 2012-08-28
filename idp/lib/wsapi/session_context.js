const crypto = require('crypto'),
      logger = require('../logging').logger,
      wsapi = require('../wsapi.js');

/**
 * return the csrf token, auth status, and current server time.
 */

exports.method = 'get';
exports.authed = false;

exports.process = function(req, res) {
  if (typeof req.session === 'undefined') {
    req.session = {};
  }

  if (typeof req.session.csrf === 'undefined') {
    req.session.csrf = crypto.randomBytes(16).toString('base64');
    logger.debug("CSRF: created new token: " + req.session.csrf);
  }

  function sendResponse() {
    var r = {
      csrf_token: req.session.csrf,
      server_time: Date.now(),
      authenticated: false,
      random_seed: crypto.randomBytes(32).toString('base64')
    };
    if (req.session && req.session.userid) {
      r.userid = req.session.userid;
    }

    res.json(r);
  }

  sendResponse();

};