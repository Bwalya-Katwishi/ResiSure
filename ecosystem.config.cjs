const path = require('path');

module.exports = {
  apps: [
    {
      name: 'resisure-api',
      cwd: path.join(__dirname, 'apps', 'api'),
      script: 'src/server.js',
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '500M',
      time: true,
    },
    {
      name: 'resisure-web',
      cwd: path.join(__dirname, 'apps', 'web'),
      script: path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next'),
      args: 'start -p 3000',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '500M',
      time: true,
    },
  ],
};
