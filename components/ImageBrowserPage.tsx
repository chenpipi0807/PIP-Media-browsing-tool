import React, { useState, useEffect, useCallback } from 'react';
import type { User, ImageItem } from '../types';
import { api } from '../services/realApiService';
import Toolbar from './Toolbar';
import ImageGrid from './ImageGrid';
import Modal from './Modal';

interface ImageBrowserPageProps {
  user: User;
  onLogout: () => void;
}

const ImageBrowserPage: React.FC<ImageBrowserPageProps> = ({ user, onLogout }) => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [cursor, setCursor] = useState<string | null>('0');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isImageRootSet, setIsImageRootSet] = useState<boolean | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  
  const [columns, setColumns] = useState(5);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [viewingUser, setViewingUser] = useState('');
  const [favoriteCount, setFavoriteCount] = useState(0);
  
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);

  const PAGE_SIZE = 20;

  const resetAndLoad = useCallback(() => {
    setImages([]);
    setCursor('0');
    setError(null);
    setTotal(null);
  }, []);

  const loadMoreImages = useCallback(async (startCursor?: string | null) => {
    const effectiveCursor = startCursor !== undefined ? startCursor : cursor;
    if (isLoading || effectiveCursor === null) return;
    setIsLoading(true);

    try {
      const favUser = showOnlyFavorites ? user.username : viewingUser;
      const response = await api.getImages({ cursor: effectiveCursor, limit: PAGE_SIZE, favUser });
      setImages(prev => [...prev, ...response.items]);
      setCursor(response.nextCursor);
      if (typeof response.total === 'number') setTotal(response.total);
    } catch (err) {
      setError('加载图片失败。');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, cursor, showOnlyFavorites, user.username, viewingUser]);

  // Check if image root is set and load favorite count on component mount
  useEffect(() => {
    const checkImageRoot = async () => {
      try {
        const rootSet = await api.isImageRootSet();
        setIsImageRootSet(rootSet);
        
        // Load favorite count for current user
        const count = await api.getFavoriteCount(user.username);
        setFavoriteCount(count);
      } catch (error) {
        console.error('检查图片根目录状态失败:', error);
        setIsImageRootSet(false);
      }
    };
    checkImageRoot();
  }, [user.username]);

  useEffect(() => {
    resetAndLoad();
  }, [showOnlyFavorites, viewingUser, resetAndLoad]);
  
  useEffect(() => {
    // This effect triggers the initial load and subsequent loads when filters change
    if (cursor === '0' && images.length === 0 && isImageRootSet) {
      loadMoreImages('0');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, images.length, loadMoreImages, isImageRootSet]);

  // Jump handlers
  const handleJumpToIndex = useCallback((index: number) => {
    if (index < 0) return;
    if (total !== null && index >= total) return;
    setImages([]);
    setError(null);
    setCursor(index.toString());
    // Immediately load from target index
    loadMoreImages(index.toString());
  }, [loadMoreImages, total]);

  const handleJumpToPage = useCallback((page: number) => {
    if (page < 1) return;
    const start = (page - 1) * PAGE_SIZE;
    handleJumpToIndex(start);
  }, [handleJumpToIndex]);


  const handleFavoriteToggle = async (imageId: string, isNowFavorited: boolean) => {
    setImages(prevImages => prevImages.map(img => 
      img.id === imageId ? { ...img, isFavorited: isNowFavorited } : img
    ));

    // Update favorite count
    const newCount = await api.getFavoriteCount(user.username);
    setFavoriteCount(newCount);

    // If viewing favorites and an item is unfavorited, remove it from the view
    if (showOnlyFavorites && !isNowFavorited) {
        setImages(prevImages => prevImages.filter(img => img.id !== imageId));
    }
  };


  const handleShowOnlyFavoritesChange = (show: boolean) => {
    if (show) {
      setViewingUser(''); // Can't view other's favs and my favs at same time
    }
    setShowOnlyFavorites(show);
  };

  const handleViewingUserChange = (username: string) => {
     if (username) {
      setShowOnlyFavorites(false); // Can't view other's favs and my favs at same time
    }
    setViewingUser(username);
  }

  const handleColumnsChange = (cols: number) => {
    // Basic responsive column adjustment
    const screenWidth = window.innerWidth;
    if (screenWidth < 640 && cols > 2) setColumns(2);
    else if (screenWidth < 1024 && cols > 4) setColumns(4);
    else setColumns(cols);
  }

  if (isImageRootSet === null) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">检查图片目录状态...</h2>
        <p className="text-gray-500">正在连接后端服务器...</p>
      </div>
    );
  }

  if (isImageRootSet === false) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">尚未设置图片目录</h2>
        <p className="text-gray-500">管理员 (用户: PIP) 需要登录并设置图片根目录。</p>
        <button onClick={onLogout} className="mt-6 bg-indigo-500 text-white px-4 py-2 rounded-md hover:bg-indigo-600">退出登录</button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <Toolbar 
        user={user}
        onLogout={onLogout}
        columns={columns}
        onColumnsChange={handleColumnsChange}
        showOnlyFavorites={showOnlyFavorites}
        onShowOnlyFavoritesChange={handleShowOnlyFavoritesChange}
        viewingUser={viewingUser}
        onViewingUserChange={handleViewingUserChange}
        favoriteCount={favoriteCount}
        currentImageIndex={images.length}
        totalImages={total ?? undefined}
        onImageJump={handleJumpToIndex}
      />
      <main>
        {error && <p className="text-center text-red-500">{error}</p>}
        <ImageGrid
          images={images}
          hasMore={cursor !== null}
          loadMore={loadMoreImages}
          onImageClick={setSelectedImage}
          onFavoriteToggle={handleFavoriteToggle}
          columns={columns}
        />
        {isLoading && cursor !== '0' && (
           <div className="text-center py-8 text-gray-500">加载更多...</div>
        )}
      </main>
      <Modal isOpen={!!selectedImage} onClose={() => setSelectedImage(null)}>
        {selectedImage && (
          selectedImage.isVideo ? (
            <video 
              src={selectedImage.url} 
              className="object-contain max-h-[85vh] w-full h-full rounded-lg" 
              controls
              autoPlay
              muted
            />
          ) : (
            <img 
              src={selectedImage.url} 
              alt={selectedImage.name}
              className="object-contain max-h-[85vh] w-full h-full rounded-lg" 
            />
          )
        )}
      </Modal>
    </div>
  );
};

export default ImageBrowserPage;
