import React, { useCallback, useRef } from 'react';
import type { ImageItem } from '../types';
import ImageCard from './ImageCard';

interface ImageGridProps {
  images: ImageItem[];
  hasMore: boolean;
  loadMore: () => void;
  onImageClick: (image: ImageItem) => void;
  onFavoriteToggle: (imageId: string, isFavorited: boolean) => void;
  columns: number;
}

const ImageGrid: React.FC<ImageGridProps> = ({ images, hasMore, loadMore, onImageClick, onFavoriteToggle, columns }) => {
  const observer = useRef<IntersectionObserver | null>(null);
  
  const lastImageElementRef = useCallback((node: HTMLDivElement) => {
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    });
    if (node) observer.current.observe(node);
  }, [hasMore, loadMore]);

  if (images.length === 0 && !hasMore) {
    return <div className="text-center text-gray-500 mt-16">未找到任何图片。</div>;
  }
  
  return (
    <div
      className="p-4"
      style={{
        columnCount: columns,
        columnGap: '1rem',
      }}
    >
      {images.map((image, index) => (
        <div key={image.id} ref={images.length === index + 1 ? lastImageElementRef : null}>
          <ImageCard
            image={image}
            onImageClick={onImageClick}
            onFavoriteToggle={onFavoriteToggle}
          />
        </div>
      ))}
      {hasMore && (
        <div className="text-center col-span-full py-8 text-gray-500">
           <svg className="animate-spin h-8 w-8 text-gray-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          加载更多...
        </div>
      )}
    </div>
  );
};

export default ImageGrid;
