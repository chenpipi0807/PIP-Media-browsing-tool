import React, { useState } from 'react';
import type { ImageItem } from '../types';
import { api } from '../services/realApiService';
import HeartIcon from './icons/HeartIcon';

interface ImageCardProps {
  image: ImageItem;
  onImageClick: (image: ImageItem) => void;
  onFavoriteToggle: (imageId: string, isFavorited: boolean) => void;
}

const ImageCard: React.FC<ImageCardProps> = ({ image, onImageClick, onFavoriteToggle }) => {
  const [isFavorited, setIsFavorited] = useState(image.isFavorited);
  const [isLoading, setIsLoading] = useState(false);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLoading) return;
    setIsLoading(true);
    try {
      const result = await api.toggleFavorite(image.id);
      setIsFavorited(result.isFavorited);
      onFavoriteToggle(image.id, result.isFavorited);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      // Optionally revert state on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative group break-inside-avoid-column mb-4 cursor-pointer" onClick={() => onImageClick(image)}>
      {image.isVideo ? (
        <video
          src={image.url}
          className="w-full h-auto rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
          controls={false}
          muted
          preload="metadata"
          onError={(e) => {
            console.error('视频加载失败:', image.url, e);
            e.currentTarget.style.border = '2px solid red';
          }}
          onLoadedMetadata={() => {
            console.log('视频元数据加载成功:', image.url);
          }}
        />
      ) : (
        <img
          src={image.url}
          alt={image.name}
          loading="lazy"
          className="w-full h-auto rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
          onError={(e) => {
            console.error('图片加载失败:', image.url, e);
            e.currentTarget.style.border = '2px solid red';
          }}
          onLoad={() => {
            console.log('图片加载成功:', image.url);
          }}
        />
      )}
      
      {/* 视频播放图标 */}
      {image.isVideo && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black bg-opacity-50 rounded-full p-3">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      )}
      
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 rounded-lg">
        <button
          onClick={handleFavoriteClick}
          aria-pressed={isFavorited}
          className={`absolute bottom-2 right-2 flex items-center justify-center h-10 w-10 rounded-full transition-all duration-300
            ${ isFavorited
                ? 'bg-red-500 text-white'
                : 'bg-white bg-opacity-80 text-gray-700 opacity-0 group-hover:opacity-100 hover:bg-opacity-100'
            }
            ${isLoading ? 'animate-pulse' : ''}`}
          aria-label={isFavorited ? '取消收藏' : '收藏'}
        >
          <HeartIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default ImageCard;
