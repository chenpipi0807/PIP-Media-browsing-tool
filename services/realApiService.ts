import type { ImageItem, User, ImagesApiResponse } from '../types';

// 动态获取API基础URL
const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  // 直接使用当前主机名，不做特殊处理
  return `http://${hostname}:3001`;
};

const API_BASE_URL = getApiBaseUrl();
const LOGGED_IN_USER_KEY = 'logged_in_user';

// --- Private Helper Functions ---

const getFavoritesForUser = async (username: string): Promise<Set<string>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/favorites/${username.toLowerCase()}`);
    if (!response.ok) return new Set();
    const data = await response.json();
    return new Set(data.favorites || []);
  } catch (error) {
    console.error('获取收藏数据失败:', error);
    return new Set();
  }
};

const getFavoriteCount = async (username: string): Promise<number> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/favorites/${username.toLowerCase()}`);
    if (!response.ok) return 0;
    const data = await response.json();
    return (data.favorites || []).length;
  } catch (error) {
    console.error('获取收藏数量失败:', error);
    return 0;
  }
};

const enrichImagesWithFavorites = (images: ImageItem[], favoritedIds: Set<string>): ImageItem[] => {
  return images.map(img => ({
    ...img,
    isFavorited: favoritedIds.has(img.id),
  }));
};

// --- Public API Functions ---

export const api = {
  login: async (username: string, imageRoot?: string, projectName?: string): Promise<User> => {
    const normalizedUsername = username.trim().toLowerCase();
    if (!normalizedUsername) throw new Error("用户名不能为空。");

    const isAdmin = normalizedUsername === 'pip';
    const user: User = { username: username.trim(), isAdmin };
    
    // 如果是管理员且提供了图片根目录，设置后端的图片根目录
    if (isAdmin && imageRoot) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/set-image-root`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ path: imageRoot, projectName: projectName }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || '设置图片根目录失败');
        }

        console.log('图片根目录设置成功:', imageRoot);
      } catch (error) {
        console.error('设置图片根目录失败:', error);
        throw error;
      }
    }
    
    localStorage.setItem(LOGGED_IN_USER_KEY, JSON.stringify(user));
    return user;
  },

  logout: (): void => {
    localStorage.removeItem(LOGGED_IN_USER_KEY);
  },

  getCurrentUser: (): User | null => {
    const userJson = localStorage.getItem(LOGGED_IN_USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  },

  isImageRootSet: async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`);
      if (!response.ok) return false;
      
      const data = await response.json();
      return data.imageRootSet || false;
    } catch (error) {
      console.error('检查图片根目录状态失败:', error);
      return false;
    }
  },
  
  getImages: async ({
    cursor = '0',
    limit = 50,
    favUser = '',
  }: {
    cursor?: string | null;
    limit?: number;
    favUser?: string;
  }): Promise<ImagesApiResponse> => {
    try {
      // 检查图片根目录是否已设置
      const isRootSet = await api.isImageRootSet();
      if (!isRootSet) {
        return { items: [], nextCursor: null };
      }

      // 从后端获取图片列表
      const params = new URLSearchParams({
        cursor: cursor || '0',
        limit: limit?.toString() || '20'
      });
      
      if (favUser) {
        params.append('favUser', favUser);
      }
      
      const response = await fetch(`${API_BASE_URL}/api/images?${params}`);

      if (!response.ok) {
        throw new Error('获取图片列表失败');
      }

      const data = await response.json();
      let sourceImages = data.items || [];

      // 处理用户收藏逻辑
      const viewingUser = favUser || api.getCurrentUser()?.username;
      if (!viewingUser) throw new Error("No user context for favorites.");

      const userFavorites = await getFavoritesForUser(viewingUser);
      
      // 注意：收藏过滤现在在后端处理，这里不需要再过滤

      // 为图片添加收藏状态并修复URL
      const itemsWithFullUrls = sourceImages.map((img: ImageItem) => ({
        ...img,
        url: img.url.startsWith('http') ? img.url : `${API_BASE_URL}${img.url}`
      }));
      const enrichedItems = enrichImagesWithFavorites(itemsWithFullUrls, userFavorites);
      
      return { 
        items: enrichedItems, 
        nextCursor: favUser ? null : data.nextCursor, // 收藏视图不支持分页
        total: data.total,
        currentPage: data.currentPage,
        totalPages: data.totalPages,
      };

    } catch (error) {
      console.error('获取图片失败:', error);
      throw error;
    }
  },

  toggleFavorite: async (imageId: string): Promise<{ isFavorited: boolean }> => {
    const user = api.getCurrentUser();
    if (!user) throw new Error("User not logged in.");

    try {
      const response = await fetch(`${API_BASE_URL}/api/favorites/${user.username.toLowerCase()}/${encodeURIComponent(imageId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('切换收藏状态失败');
      }

      const data = await response.json();
      return { isFavorited: data.isFavorited };
    } catch (error) {
      console.error('切换收藏状态失败:', error);
      throw error;
    }
  },

  getFavoriteCount: async (username: string): Promise<number> => {
    return await getFavoriteCount(username);
  },

  getUsers: async (): Promise<string[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.users || [];
    } catch (error) {
      console.error('获取用户列表失败:', error);
      return [];
    }
  },
};
