import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// 支持的媒体格式（图片和视频）
const SUPPORTED_MEDIA_EXTENSIONS = [
  // 图片格式
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.tiff', '.tif', 
  '.ico', '.heic', '.heif', '.avif', '.jfif', '.pjpeg', '.pjp',
  '.JPG', '.JPEG', '.PNG', '.GIF', '.BMP', '.WEBP', '.SVG', '.TIFF', '.TIF',
  '.ICO', '.HEIC', '.HEIF', '.AVIF', '.JFIF', '.PJPEG', '.PJP',
  // 视频格式
  '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v', '.3gp',
  '.MP4', '.AVI', '.MOV', '.WMV', '.FLV', '.WEBM', '.MKV', '.M4V', '.3GP'
];

// 中间件
app.use(cors({
  origin: [
    'http://localhost:5173', 'http://127.0.0.1:5173', 
    'http://localhost:5174', 'http://localhost:5175', 
    'http://127.0.0.1:5174', 'http://127.0.0.1:5175',
    'http://10.250.9.82:5173', 'http://10.250.9.82:5174', 'http://10.250.9.82:5175'
  ],
  credentials: true
}));
app.use(express.json());

// 全局变量
let imageRootPath = null;
let currentProjectName = null;

// 工具函数：检查文件是否为媒体文件
const isMediaFile = (filename) => {
  const ext = path.extname(filename);
  return SUPPORTED_MEDIA_EXTENSIONS.includes(ext);
};

// 工具函数：检查文件是否为视频
const isVideoFile = (filename) => {
  const ext = path.extname(filename);
  const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v', '.3gp',
                          '.MP4', '.AVI', '.MOV', '.WMV', '.FLV', '.WEBM', '.MKV', '.M4V', '.3GP'];
  return videoExtensions.includes(ext);
};

// 工具函数：获取媒体文件信息
const getMediaInfo = async (filePath, filename) => {
  try {
    const stats = await fs.stat(filePath);
    return {
      id: filename,
      name: filename,
      url: `/api/media/${encodeURIComponent(filename)}`,
      width: 300, // 默认宽度
      height: 200, // 默认高度
      isFavorited: false, // 将由前端根据用户收藏状态设置
      size: stats.size,
      modifiedTime: stats.mtime,
      isVideo: isVideoFile(filename)
    };
  } catch (error) {
    console.error(`获取文件信息失败: ${filename}`, error);
    return null;
  }
};

// API路由

// 健康检查接口
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    imageRootSet: imageRootPath !== null,
    projectName: currentProjectName
  });
});

// 设置图片根目录
app.post('/api/set-image-root', async (req, res) => {
  try {
    const { path: rootPath, projectName } = req.body;
    
    if (!rootPath || !projectName) {
      return res.status(400).json({ error: '路径和项目名称都是必需的' });
    }

    // 检查路径是否存在
    try {
      await fs.access(rootPath);
    } catch (error) {
      return res.status(400).json({ error: '指定的路径不存在' });
    }

    imageRootPath = rootPath;
    currentProjectName = projectName;
    
    console.log(`图片根目录设置为: ${imageRootPath}`);
    console.log(`项目名称设置为: ${currentProjectName}`);
    
    res.json({ 
      success: true, 
      path: imageRootPath, 
      projectName: currentProjectName 
    });
  } catch (error) {
    console.error('设置图片根目录失败:', error);
    res.status(500).json({ error: '设置图片根目录失败' });
  }
});

// 获取图片列表
app.get('/api/images', async (req, res) => {
  try {
    if (!imageRootPath) {
      return res.json({ items: [], nextCursor: null, total: 0, currentPage: 1, totalPages: 0 });
    }

    const { cursor = '0', limit = '20', favUser } = req.query;
    const startIndex = parseInt(cursor, 10);
    const pageSize = parseInt(limit, 10);

    const files = await fs.readdir(imageRootPath);
    let mediaFiles = files.filter(isMediaFile);
    mediaFiles.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    // 如果指定了收藏用户，过滤收藏的图片
    if (favUser && currentProjectName) {
      const favorites = await loadFavorites(currentProjectName);
      const userFavorites = favorites[favUser] || [];
      const favoritesSet = new Set(userFavorites);
      mediaFiles = mediaFiles.filter(filename => favoritesSet.has(filename));

      // 收藏模式下返回所有收藏图片，不分页
      const mediaInfoPromises = mediaFiles.map(async (filename) => {
        const filePath = path.join(imageRootPath, filename);
        return await getMediaInfo(filePath, filename);
      });

      const medias = await Promise.all(mediaInfoPromises);
      const validMedias = medias.filter(media => media !== null);

      return res.json({
        items: validMedias,
        nextCursor: null,
        total: validMedias.length,
        currentPage: 1,
        totalPages: 1
      });
    }

    // 正常分页模式 - 先获取所有有效媒体文件信息来计算准确的总数
    const allMediaInfoPromises = mediaFiles.map(async (filename) => {
      const filePath = path.join(imageRootPath, filename);
      return await getMediaInfo(filePath, filename);
    });

    const allMedias = await Promise.all(allMediaInfoPromises);
    const allValidMedias = allMedias.filter(media => media !== null);
    
    const totalValidFiles = allValidMedias.length;
    const totalPages = Math.ceil(totalValidFiles / pageSize);
    const currentPage = Math.floor(startIndex / pageSize) + 1;
    
    console.log(`分页调试: totalValidFiles=${totalValidFiles}, pageSize=${pageSize}, totalPages=${totalPages}, startIndex=${startIndex}, currentPage=${currentPage}`);
    
    // 获取当前页的数据
    const paginatedValidMedias = allValidMedias.slice(startIndex, startIndex + pageSize);
    
    const nextCursor = startIndex + pageSize < totalValidFiles ? (startIndex + pageSize).toString() : null;

    res.json({
      items: paginatedValidMedias,
      nextCursor,
      total: totalValidFiles,
      currentPage,
      totalPages
    });
  } catch (error) {
    console.error('获取图片列表失败:', error);
    res.status(500).json({ error: '获取图片列表失败' });
  }
});

// 提供媒体文件访问
app.get('/api/media/:filename', async (req, res) => {
  try {
    if (!imageRootPath) {
      return res.status(404).json({ error: '未设置图片根目录' });
    }

    const filename = decodeURIComponent(req.params.filename);
    const filePath = path.join(imageRootPath, filename);

    // 安全检查：确保请求的文件在指定目录内
    const resolvedPath = path.resolve(filePath);
    const resolvedRoot = path.resolve(imageRootPath);
    
    if (!resolvedPath.startsWith(resolvedRoot)) {
      return res.status(403).json({ error: '访问被拒绝' });
    }

    // 检查文件是否存在且为媒体文件
    try {
      const stats = await fs.stat(filePath);
      if (!stats.isFile() || !isMediaFile(filename)) {
        return res.status(404).json({ error: '文件不存在或不是媒体文件' });
      }
    } catch (error) {
      return res.status(404).json({ error: '文件不存在' });
    }

    // 设置正确的Content-Type和CORS头
    const ext = path.extname(filename);
    const mimeTypes = {
      // 图片格式
      '.jpg': 'image/jpeg', '.JPG': 'image/jpeg',
      '.jpeg': 'image/jpeg', '.JPEG': 'image/jpeg',
      '.png': 'image/png', '.PNG': 'image/png',
      '.gif': 'image/gif', '.GIF': 'image/gif',
      '.bmp': 'image/bmp', '.BMP': 'image/bmp',
      '.webp': 'image/webp', '.WEBP': 'image/webp',
      '.svg': 'image/svg+xml', '.SVG': 'image/svg+xml',
      '.tiff': 'image/tiff', '.TIFF': 'image/tiff',
      '.tif': 'image/tiff', '.TIF': 'image/tiff',
      '.ico': 'image/x-icon', '.ICO': 'image/x-icon',
      '.heic': 'image/heic', '.HEIC': 'image/heic',
      '.heif': 'image/heif', '.HEIF': 'image/heif',
      '.avif': 'image/avif', '.AVIF': 'image/avif',
      '.jfif': 'image/jpeg', '.JFIF': 'image/jpeg',
      '.pjpeg': 'image/pjpeg', '.PJPEG': 'image/pjpeg',
      '.pjp': 'image/jpeg', '.PJP': 'image/jpeg',
      // 视频格式
      '.mp4': 'video/mp4', '.MP4': 'video/mp4',
      '.avi': 'video/x-msvideo', '.AVI': 'video/x-msvideo',
      '.mov': 'video/quicktime', '.MOV': 'video/quicktime',
      '.wmv': 'video/x-ms-wmv', '.WMV': 'video/x-ms-wmv',
      '.flv': 'video/x-flv', '.FLV': 'video/x-flv',
      '.webm': 'video/webm', '.WEBM': 'video/webm',
      '.mkv': 'video/x-matroska', '.MKV': 'video/x-matroska',
      '.m4v': 'video/x-m4v', '.M4V': 'video/x-m4v',
      '.3gp': 'video/3gpp', '.3GP': 'video/3gpp'
    };
    
    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    
    // 设置CORS和缓存头
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    // 发送文件
    res.sendFile(resolvedPath);

  } catch (error) {
    console.error('提供图片文件失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 收藏数据管理
const getFavoritesFilePath = (projectName) => {
  return path.join(__dirname, `${projectName || 'default'}.json`);
};

const loadFavorites = async (projectName) => {
  try {
    const filePath = getFavoritesFilePath(projectName);
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // 文件不存在时返回空对象
    return {};
  }
};

const saveFavorites = async (projectName, favorites) => {
  try {
    const filePath = getFavoritesFilePath(projectName);
    await fs.writeFile(filePath, JSON.stringify(favorites, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('保存收藏数据失败:', error);
    return false;
  }
};

// 获取用户收藏
app.get('/api/favorites/:username', async (req, res) => {
  try {
    if (!currentProjectName) {
      return res.status(400).json({ error: '未设置项目名称' });
    }
    
    const username = req.params.username; // 保持原始大小写
    const favorites = await loadFavorites(currentProjectName);
    const userFavorites = favorites[username] || [];
    
    res.json({ favorites: userFavorites });
  } catch (error) {
    console.error('获取收藏数据失败:', error);
    res.status(500).json({ error: '获取收藏数据失败' });
  }
});

// 切换收藏状态
app.post('/api/favorites/:username/:imageId', async (req, res) => {
  try {
    if (!currentProjectName) {
      return res.status(400).json({ error: '未设置项目名称' });
    }
    
    const username = req.params.username; // 保持原始大小写
    const imageId = decodeURIComponent(req.params.imageId);
    
    const favorites = await loadFavorites(currentProjectName);
    if (!favorites[username]) {
      favorites[username] = [];
    }
    
    const userFavorites = favorites[username];
    const index = userFavorites.indexOf(imageId);
    let isFavorited;
    
    if (index > -1) {
      // 取消收藏
      userFavorites.splice(index, 1);
      isFavorited = false;
    } else {
      // 添加收藏
      userFavorites.push(imageId);
      isFavorited = true;
    }
    
    const saved = await saveFavorites(currentProjectName, favorites);
    if (!saved) {
      return res.status(500).json({ error: '保存收藏数据失败' });
    }
    
    res.json({ isFavorited });
  } catch (error) {
    console.error('切换收藏状态失败:', error);
    res.status(500).json({ error: '切换收藏状态失败' });
  }
});

// 获取所有用户列表
app.get('/api/users', async (req, res) => {
  try {
    if (!currentProjectName) {
      return res.status(400).json({ error: '未设置项目名称' });
    }
    
    const favorites = await loadFavorites(currentProjectName);
    const users = Object.keys(favorites);
    
    res.json({ users });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    imageRootSet: !!imageRootPath,
    imageRootPath: imageRootPath || null,
    projectName: currentProjectName || null
  });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`图片浏览服务器已启动，端口: ${PORT}`);
  console.log(`本地访问: http://localhost:${PORT}`);
  console.log(`局域网访问: http://10.250.9.82:${PORT}`);
  console.log('等待前端设置图片根目录...');
});
