const interpreterPath = '/home/pi/.nvm/versions/node/v10.20.1/bin/node';

module.exports = {
  apps : [{
    script: './dist/index.js',
    watch: true,
    interpreter: interpreterPath
  }]
};
