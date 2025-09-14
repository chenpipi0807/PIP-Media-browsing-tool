import type { ImageItem, User, ImagesApiResponse } from '../types';

const ADMIN_USERNAME = 'pip';
const IMAGE_ROOT_KEY = 'image_root';
const LOGGED_IN_USER_KEY = 'logged_in_user';
const MOCK_IMAGE_COUNT = 500;
let MOCK_IMAGES: ImageItem[] = [];

// --- Private Helper Functions ---

const generateMockImages = (): ImageItem[] => {
  if (MOCK_IMAGES.length > 0) return MOCK_IMAGES;
  
  const images: ImageItem[] = [];
  for (let i = 0; i < MOCK_IMAGE_COUNT; i++) {
    const width = Math.floor(Math.random() * 400) + 200; // 200-600px width
    const height = Math.floor(Math.random() * 600) + 200; // 200-800px height
    const id = `image_${i + 1}`;
    images.push({
      id: id,
      name: `${id}.jpg`,
      url: `https://picsum.photos/id/${i + 10}/${width}/${height}`,
      width,
      height,
      isFavorited: false, // will be updated based on user
    });
  }
  MOCK_IMAGES = images;
  return images;
};

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
    await new Promise(res => setTimeout(res, 300));
    const normalizedUsername = username.trim().toLowerCase();
    if (!normalizedUsername) throw new Error("用户名不能为空。");

    const isAdmin = normalizedUsername === ADMIN_USERNAME;
    const user: User = { username: username.trim(), isAdmin };
    
    if (isAdmin && imageRoot) {
      localStorage.setItem(IMAGE_ROOT_KEY, imageRoot);
      MOCK_IMAGES = []; // Force regeneration on next getImages call
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

  isImageRootSet: (): boolean => {
    return !!localStorage.getItem(IMAGE_ROOT_KEY);
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
    await new Promise(res => setTimeout(res, 500));
    if (!api.isImageRootSet()) {
      return { items: [], nextCursor: null };
    }

    const allImages = generateMockImages();
    const viewingUser = favUser || api.getCurrentUser()?.username;
    if (!viewingUser) throw new Error("No user context for favorites.");

    const userFavorites = getFavoritesForUser(viewingUser);
    
    let sourceImages = allImages;
    if(favUser) {
        sourceImages = allImages.filter(img => userFavorites.has(img.id));
    }

    const startIndex = parseInt(cursor || '0', 10);
    if (startIndex >= sourceImages.length) {
      return { items: [], nextCursor: null };
    }
    
    const endIndex = startIndex + limit;
    const paginatedImages = sourceImages.slice(startIndex, endIndex);

    const enrichedItems = enrichImagesWithFavorites(paginatedImages, userFavorites);
    
    const nextCursor = endIndex < sourceImages.length ? endIndex.toString() : null;

    return { items: enrichedItems, nextCursor };
  },

  toggleFavorite: async (imageId: string): Promise<{ isFavorited: boolean }> => {
    await new Promise(res => setTimeout(res, 150));
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
    await new Promise(res => setTimeout(res, 200));
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
