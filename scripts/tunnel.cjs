const { spawn } = require('child_process');

function startTunnel() {
  console.log('[Tunnel] Starting localtunnel for DanaMahjadStore...');
  const proc = spawn('npx.cmd', [
    'localtunnel',
    '--port', '5173',
    '--local-host', '127.0.0.1',
    '--subdomain', 'danamahjadstore'
  ], {
    shell: true,
    stdio: 'inherit'
  });

  proc.on('close', (code) => {
    console.log(`[Tunnel] Process exited with code ${code}. Reconnecting in 3 seconds...`);
    setTimeout(startTunnel, 3000);
  });

  proc.on('error', (err) => {
    console.error('[Tunnel] Error:', err);
    setTimeout(startTunnel, 3000);
  });
}

startTunnel();
