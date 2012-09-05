#!/usr/bin/env node

const path = require('path'),
      spawn = require('child_process').spawn;

var daemons = exports.daemons = {};
var HOST = process.env.IP_ADDRESS || process.env.HOST || "127.0.0.1";

// services we will launch
var daemonsToRun = {
  client: {PORT: 11000},
  idp: {PORT: 11001}
};

process.env.CLIENT_URL = 'http://' + HOST + ':11000';
process.env.IDP_URL = 'http://' + HOST + ':11001';

function daemonize(daemon, callback) {
  var daemonConfig = daemonsToRun[daemon] || {};

  // add daemonsToRun config to env
  Object.keys(daemonConfig).forEach(function(key) {
    process.env[key] = daemonConfig[key];
  });

  // default script path for each daemon
  var scriptPath = daemonConfig.path || path.join(__dirname, '..', daemon, 'bin', daemon);
  var proc = spawn('node', [scriptPath]);

  function dump(msg) {
    msg.toString().split('\n').forEach(function(line) {
      if (line.length === 0) return;
      console.log(daemon, '(' + proc.pid + '):', line);

      // when it says 'running on ...', then we know it's fully started
      if (callback && /^.*?running on http:\/\/[^:]+:[0-9]+$/.test(line)) {
        callback();
        callback = undefined;
      }
    });
  }

  console.log("spawned", daemon, '(' + scriptPath + ') with pid', proc.pid);

  Object.keys(daemonConfig).forEach(function(key) {
    delete process.env[key];
  });

  daemons[daemon] = proc;

  proc.stdout.on('data', dump);
  proc.stderr.on('data', dump);

  // if any process quits, kill all the others
  proc.on('exit', function(code, signal) {
    console.log(daemon, 'exited(' + code + ') ', (signal ? 'on signal ' + signal : ""));
    Object.keys(daemons).forEach(function(d) {
      daemons[d].kill();
    });
  });
}

// start all daemons in parallel
var numStarted = 0;
var daemonNames = Object.keys(daemonsToRun);
daemonNames.forEach(function(name) {
  daemonize(name, function() {
    if (++numStarted === daemonNames.length) {
      console.log("all daemons running");
    }
  });
});

// kill on user signal
process.on('SIGINT', function() {
  console.log('Received SIGINT.  Trying to shutdown ...');
  // kill process objects
  Object.keys(daemons).forEach(function(daemon) {
    daemons[daemon].kill('SIGINT');
  });
});