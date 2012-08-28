/**
 * Wrapper around winston for general server logging
 */

const winston = require('winston'),
      configuration = require('./configuration'),
      path = require('path'),
      utils = require('./utils'),
      LOG_DIR = path.join(configuration.get('var_path'), 'log'),
      LOG_FILEPATH = path.join(LOG_DIR, configuration.get('process_type') + '.log');

// ensure log dir exists
utils.mkdir_p(LOG_DIR);

exports.logger = new(winston.Logger)({
  transports: [new (winston.transports.File)({
    timestamp: function() { return new Date().toISOString(); },
    filename: LOG_FILEPATH,
    colorize: true,
    handleExceptions: true
  })]
});

exports.enableConsoleLogging = function() {
  exports.logger.add(
    winston.transports.Console,
    {
      colorize: true,
      handleExceptions: true
    }
  );
};

if (process.env.LOG_TO_CONSOLE) {
  exports.enableConsoleLogging();
}

exports.logger.exitOnError = false;