module.exports = {
  apps: [
    {
      name: "deployly-api",
      script: "./server.js",
      instances: 1, // Or 'max' for clustering, but staying safe with 1 instance for MVP
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      env: {
        NODE_ENV: "production",
      }
    }
  ]
};
