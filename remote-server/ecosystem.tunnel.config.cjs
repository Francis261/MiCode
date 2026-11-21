module.exports = {
  apps: [
    {
      name: 'devforge-tunnel',
      script: 'cloudflared',
      args: 'tunnel run --token eyJhIjoiNDAwNmMxYTcwNmVhM2Y4NTFiMzViMWMyYTg1MDU5OGEiLCJ0IjoiZmMxODFjNjctODkxZC00N2I2LWE4ZTEtOGU1YTExNzQwYzBlIiwicyI6Ik1qRTFaV0U1WXpRdFpqTXdOUzAwWkRBM0xUbGpaR010TldKa05qWXpZamRsTnpjeCJ9',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production'
      },
      error_file: 'logs/tunnel-error.log',
      out_file: 'logs/tunnel-out.log',
      log_file: 'logs/tunnel-combined.log',
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
