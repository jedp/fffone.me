/**
 * Each handler under wsapi/ supports the following exports:
 *
 *   exports.process     function(req, res) to process a request
 *   exports.method      either get or post
 *   exports.authed      whether the wsapi requires authentication
 *   exports.args        an array of args that should be verified
 */

const fs = require('fs'),
      path = require('path'),
      url = require('url'),
      config = require('./configuration'),
      logger = require('./logging').logger,
      secrets = require('./secrets'),
      express = require('express'),
      httputils = require('./httputils'),
      sessions = require('client-sessions'),

      WSAPI_PREFIX = '/wsapi/',
      COOKIE_SECRET = secrets.hydrateSecret('fffone_cookie', config.get('var_path')),
      COOKIE_KEY = 'fffone_state';


var APIs;

function allAPIs () {
  if (APIs) return APIs;

  APIs = {};

  fs.readdirSync(path.join(__dirname, 'wsapi')).forEach(function (f) {
    // skip files that don't have a .js suffix or start with a dot
    if (f.length <= 3 || f.substr(-3) !== '.js' || f.substr(0,1) === '.') return;
    var operation = f.substr(0, f.length - 3);

    var api = require(path.join(__dirname, 'wsapi', f));
    APIs[operation] = api;
  });

  return APIs;
}

function isAuthed(req, requiredLevel) {
  if (req.session && req.session.userid && req.session.auth_level) {
    // 'password' authentication allows access to all apis.
    // 'assertion' authentication, grants access to only those apis
    // that don't require 'password'
    if (requiredLevel === 'assertion' || req.session.auth_level === 'password') {
      return true;
    }
  }
  return false;
}

exports.setup = function(options, app) {
  var cookieParser = express.cookieParser();
  var bodyParser = express.bodyParser();

  // no options as yet ...

  var cookieSessionMiddleware = sessions({
    secret: COOKIE_SECRET,
    cookieName: COOKIE_KEY,
    duration: config.get('authentication_duration_ms'),
    cookie: {
      path: '/wsapi',
      httpOnly: true,
      maxAge: config.get('authentication_duration_ms'),
      // secure: overSSL
    }
  });

  app.use(function(req, res, next) {
    var purl = url.parse(req.url);

    if (purl.pathname.substr(0, WSAPI_PREFIX.length) === WSAPI_PREFIX) {
      // do not cache wsapi calls
      res.setHeader('Cache-Control', 'no-cache, max-age=0');

      const operation = purl.pathname.substr(WSAPI_PREFIX.length);

      // make sure the request method is correct
      if (!wsapis.hasOwnProperty(operation)
          || wsapis[operation].method.toLowerCase() !== req.method.toLowerCase()) {
        return httputils.badRequest(res, "no such api");
      }

      // perform full parsing and validation
      return cookieParser(req, res, function() {
        bodyParser(req, res, function() {
          cookieSessionMiddleware(req, res, function() {
            // POST requests only
            if (req.method === "POST") {
              // must be a session
              if (req.session === 'undefined'
                  || typeof req.session.csrf !== 'string') {
                logger.warn("POST call to /wsapi cannot set cookie.  User has disabled?");
                return httputils.forbidden(res, "no cookie");
              }

              // token must match what is sent in post body
              if (!req.body || !req.session || !req.session.csrf
                  || req.body.csrf !== req.session.csrf) {
                var fromBody = req.body? req.body.csrf : "<none>";
                var fromSession = req.session? req.session.csrf : "<none>";
                logger.warn("CSRF token mismatch.  Got: " + fromBody + ", want: " + fromSession);
                return httputils.badRequest(res, "CSRF violation");
              }
            }

            return next();
          });
        });
      });

    } else {
      return next();
    }
  });

  // load this process's APIs
  // skipping validation and stuff while getting off the ground
  var wsapis = allAPIs();

  logger.debug("WSAPIs:");
  Object.keys(wsapis).forEach(function(api) {
    logger.debug(api);
  });

  app.use(function(req, res, next) {
    var purl = url.parse(req.url);

    if (purl.pathname.substr(0, WSAPI_PREFIX.length) === WSAPI_PREFIX) {
      const operation = purl.pathname.substr(WSAPI_PREFIX.length);

      if (wsapis[operation].authed && !isAuthed(req, wsapis[operation].authed)) {
        return httputils.badRequest(res, "authentication required");
      }

      // good place to validate ...
      wsapis[operation].process(req, res);
    } else {
      next();
    }
  });
};