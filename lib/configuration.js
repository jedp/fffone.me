const path = require('path'),
      convict = require('convict');

var conf = module.exports = convict({
  bind_to: {
    host: {
      doc: "The ip address the server should bind",
      format: 'string = "127.0.0.1"',
      env: 'IP_ADDRESS'
    },
    port: {
      doc: "The port the server should bind",
      format: 'integer{1,65535} = 3000',
      env: 'PORT'
    }
  },

  process_type: 'string',

  authentication_duration_ms: {
    doc: "How long a user may stay signed in",
    format: 'integer = 2419200000'
  },

  var_path: {
    doc: "Path where deployment-specific resources live (keys, logs, etc.)",
    format: 'string = "var"',
    env: 'VAR_PATH'
  }
});

conf.set('process_type', path.basename(process.argv[1], ".js"));
