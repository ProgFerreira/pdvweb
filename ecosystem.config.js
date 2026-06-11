/** @type {import('pm2').ProcessDescription} */
module.exports = {
  apps: [
    {
      name: "pdv-galetos",
      script: "node_modules/.bin/next",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || 3000,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
    },
  ],
}
