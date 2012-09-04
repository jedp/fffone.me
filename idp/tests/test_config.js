const vows = require('vows'),
      assert = require('assert');

var suite = vows.describe('config');

suite.addBatch({
  "The config": {
    topic: function() {
      var config = require("../../lib/configuration");
      this.callback(null, config);
    },

    'has a spiffy getter': function(config) {
      assert(typeof config.get === 'function');
    }
  }
});

if (process.argv[1] === __filename) {
  suite.run();
} else {
  suite.export(module);
}