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
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://127.0.0.1:5174', 'http://127.0.0.1:5175'],
  credentials: true
}));
app.use(express.json());

// 存储用户设置的图片根目录
let imageRootPath = '';

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
      url: `http://localhost:3001/api/media/${encodeURIComponent(filename)}`,
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

// 设置图片根目录
app.post('/api/set-image-root', async (req, res) => {
  try {
    const { path: rootPath } = req.body;
    
    if (!rootPath) {
      return res.status(400).json({ error: '路径不能为空' });
    }

    // 检查路径是否存在
    try {
      const stats = await fs.stat(rootPath);
      if (!stats.isDirectory()) {
        return res.status(400).json({ error: '指定的路径不是一个文件夹' });
      }
    } catch (error) {
      return res.status(400).json({ error: '指定的路径不存在或无法访问' });
    }

    imageRootPath = rootPath;
    console.log(`图片根目录已设置为: ${imageRootPath}`);
    
    res.json({ success: true, path: imageRootPath });
  } catch (error) {
    console.error('设置图片根目录失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取图片列表
app.get('/api/images', async (req, res) => {
  try {
    if (!imageRootPath) {
      return res.json({ items: [], nextCursor: null });
    }

    const { cursor = '0', limit = '20' } = req.query;
    const startIndex = parseInt(cursor, 10);
    const pageSize = parseInt(limit, 10);

    // 读取目录中的所有文件
    const files = await fs.readdir(imageRootPath);
    
    // 过滤出媒体文件
    const mediaFiles = files.filter(isMediaFile);
    
    // 按文件名排序（确保固定顺序）
    mediaFiles.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    // 分页处理
    if (startIndex >= mediaFiles.length) {
      return res.json({ items: [], nextCursor: null });
    }

    const endIndex = startIndex + pageSize;
    const paginatedFiles = mediaFiles.slice(startIndex, endIndex);

    // 获取媒体信息
    const mediaInfoPromises = paginatedFiles.map(async (filename) => {
      const filePath = path.join(imageRootPath, filename);
      return await getMediaInfo(filePath, filename);
    });

    const medias = await Promise.all(mediaInfoPromises);
    const validMedias = medias.filter(media => media !== null);

    const nextCursor = endIndex < mediaFiles.length ? endIndex.toString() : null;

    res.json({
      items: validMedias,
      nextCursor,
      total: mediaFiles.length
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

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    imageRootSet: !!imageRootPath,
    imageRootPath: imageRootPath || null
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`图片浏览服务器已启动，端口: ${PORT}`);
  console.log(`API地址: http://localhost:${PORT}`);
  console.log('等待前端设置图片根目录...');
});
