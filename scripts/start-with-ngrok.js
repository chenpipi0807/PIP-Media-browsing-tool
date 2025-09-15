import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname);

console.log('🚀 启动 PIP 媒体浏览工具 (完整模式: 前端+后端+局域网+内网穿透)');
console.log('📍 本地访问: http://localhost:5173');
console.log('🌐 局域网访问: http://10.250.9.82:5173');
console.log('🔗 内网穿透地址将在 ngrok 启动后显示');
console.log('');

let processes = [];

// 启动后端服务器 (支持局域网)
console.log('📡 启动后端服务器 (0.0.0.0:3001)...');
const serverProcess = spawn('node', ['server/index.js'], {
  cwd: projectRoot,
  stdio: ['inherit', 'inherit', 'inherit']
});
processes.push({ name: '后端服务器', process: serverProcess });

// 等待2秒让服务器启动
setTimeout(() => {
  // 启动前端开发服务器 (支持局域网)
  console.log('🎨 启动前端开发服务器 (0.0.0.0:5173)...');
  const frontendProcess = spawn('npm.cmd', ['run', 'dev', '--', '--host', '0.0.0.0'], {
    cwd: projectRoot,
    stdio: ['inherit', 'inherit', 'inherit'],
    shell: true
  });
  processes.push({ name: '前端服务器', process: frontendProcess });

  // 等待前端启动后再启动 ngrok
  setTimeout(() => {
    // 尝试启动 ngrok 为后端创建隧道（如果已安装）
    console.log('🌐 尝试启动 ngrok 内网穿透 (后端API)...');
    try {
      const ngrokBackendProcess = spawn('ngrok', ['http', '3001', '--log=stdout'], {
        stdio: ['inherit', 'inherit', 'inherit'],
        shell: true
      });
      processes.push({ name: 'ngrok后端', process: ngrokBackendProcess });
      
      ngrokBackendProcess.on('error', (err) => {
        console.log('⚠️  ngrok 未安装或不在 PATH 中，跳过内网穿透功能');
        console.log('💡 如需内网穿透，请访问 https://ngrok.com 下载安装');
      });
    } catch (error) {
      console.log('⚠️  ngrok 启动失败，跳过内网穿透功能');
    }

    // 尝试启动 ngrok 为前端创建隧道（如果已安装）
    setTimeout(() => {
      console.log('🌍 尝试启动 ngrok 内网穿透 (前端)...');
      try {
        const ngrokFrontendProcess = spawn('ngrok', ['http', '5173', '--log=stdout'], {
          stdio: ['inherit', 'inherit', 'inherit'],
          shell: true
        });
        processes.push({ name: 'ngrok前端', process: ngrokFrontendProcess });
        
        ngrokFrontendProcess.on('error', (err) => {
          console.log('⚠️  ngrok 未安装，仅提供本地和局域网访问');
        });
      } catch (error) {
        console.log('⚠️  ngrok 启动失败，仅提供本地和局域网访问');
      }
    }, 2000);

  }, 3000);

}, 2000);

// 处理进程退出
const cleanup = () => {
  console.log('\n🛑 正在关闭所有服务...');
  processes.forEach(({ name, process }) => {
    console.log(`   关闭 ${name}...`);
    process.kill('SIGTERM');
  });
  setTimeout(() => {
    processes.forEach(({ process }) => {
      if (!process.killed) {
        process.kill('SIGKILL');
      }
    });
    process.exit(0);
  }, 2000);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// 监听进程错误
processes.forEach(({ name, process }) => {
  process.on('error', (err) => {
    console.error(`❌ ${name} 启动失败:`, err.message);
  });
});
