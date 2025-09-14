import type { ImageItem, User, ImagesApiResponse } from '../types';

const API_BASE_URL = 'http://localhost:3001/api';
const LOGGED_IN_USER_KEY = 'logged_in_user';

// --- Private Helper Functions ---

const getFavoritesForUser = (username: string): Set<string> => {
  const favs = localStorage.getItem(`favorites_${username.toLowerCase()}`);
  return favs ? new Set(JSON.parse(favs)) : new Set();
};

const setFavoritesForUser = (username: string, favorites: Set<string>): void => {
  localStorage.setItem(`favorites_${username.toLowerCase()}`, JSON.stringify(Array.from(favorites)));
};

const enrichImagesWithFavorites = (images: ImageItem[], favoritedIds: Set<string>): ImageItem[] => {
  return images.map(img => ({
    ...img,
    isFavorited: favoritedIds.has(img.id),
  }));
};

// --- Public API Functions ---

export const api = {
  login: async (username: string, imageRoot?: string): Promise<User> => {
    const normalizedUsername = username.trim().toLowerCase();
    if (!normalizedUsername) throw new Error("用户名不能为空。");

    const isAdmin = normalizedUsername === 'pip';
    const user: User = { username: username.trim(), isAdmin };
    
    // 如果是管理员且提供了图片根目录，设置后端的图片根目录
    if (isAdmin && imageRoot) {
      try {
        const response = await fetch(`${API_BASE_URL}/set-image-root`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ path: imageRoot }),
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
      const response = await fetch(`${API_BASE_URL}/health`);
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
      const response = await fetch(
        `${API_BASE_URL}/images?cursor=${cursor || '0'}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error('获取图片列表失败');
      }

      const data = await response.json();
      let sourceImages = data.items || [];

      // 处理用户收藏逻辑
      const viewingUser = favUser || api.getCurrentUser()?.username;
      if (!viewingUser) throw new Error("No user context for favorites.");

      const userFavorites = getFavoritesForUser(viewingUser);
      
      // 如果是查看特定用户的收藏，过滤出收藏的图片
      if (favUser) {
        sourceImages = sourceImages.filter((img: ImageItem) => userFavorites.has(img.id));
      }

      // 为图片添加收藏状态
      const enrichedItems = enrichImagesWithFavorites(sourceImages, userFavorites);
      
      return { 
        items: enrichedItems, 
        nextCursor: favUser ? null : data.nextCursor // 收藏视图不支持分页
      };

    } catch (error) {
      console.error('获取图片失败:', error);
      throw error;
    }
  },

  toggleFavorite: async (imageId: string): Promise<{ isFavorited: boolean }> => {
    const user = api.getCurrentUser();
    if (!user) throw new Error("User not logged in.");

    const favorites = getFavoritesForUser(user.username);
    let isFavorited: boolean;

    if (favorites.has(imageId)) {
      favorites.delete(imageId);
      isFavorited = false;
    } else {
      favorites.add(imageId);
      isFavorited = true;
    }

    setFavoritesForUser(user.username, favorites);
    return { isFavorited };
  },

  getUsers: async (): Promise<string[]> => {
    const users = new Set<string>();
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('favorites_')) {
            users.add(key.replace('favorites_', ''));
        }
    }
    const currentUser = api.getCurrentUser();
    if (currentUser) {
        users.add(currentUser.username.toLowerCase());
    }
    return Array.from(users).sort();
  },
};
