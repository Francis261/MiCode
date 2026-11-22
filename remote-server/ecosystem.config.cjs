module.exports = {
  apps: [
    {
      name: 'devforge-remote',
      script: 'src/server.js',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: 8787,
        HOST: '0.0.0.0',
        DEVFORGE_WORKSPACES: '/root/micode:/root/appflow',
        DEVFORGE_ALLOWED_COMMANDS: 'git,npm,pnpm,yarn,node,python3'
      },
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      log_file: 'logs/pm2-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
};
