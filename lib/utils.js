const fs = require('fs'),
      path = require('path');

var existsSync;
// existsSync moved from path to fs in 0.8.x
if (typeof fs.existsSync === 'function') {
  existsSync = fs.existsSync;
} else {
  existsSync = path.existsSync;
}

var mkdir_p = module.exports.mkdir_p = function mkdir_p(dir) {
  if (!existsSync(dir)) {
    mkdir_p(path.dirname(dir));
    fs.mkdirSync(dir, "0755");
  }
};

