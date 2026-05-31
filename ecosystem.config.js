module.exports = {
  apps: [{
    name: 'auto-voter',
    script: 'index.js',
    cron_restart: '0 2 * * *', // PM2가 직접 프로세스를 재시작
    watch: false
  }]
}