import React, { useState, useEffect } from 'react';
import type { User } from '../types';
import { api } from '../services/realApiService';

interface ToolbarProps {
  user: User;
  onLogout: () => void;
  columns: number;
  onColumnsChange: (cols: number) => void;
  showOnlyFavorites: boolean;
  onShowOnlyFavoritesChange: (show: boolean) => void;
  viewingUser: string;
  onViewingUserChange: (username: string) => void;
  favoriteCount?: number;
  currentImageIndex?: number;
  totalImages?: number;
  onImageJump?: (imageIndex: number) => void;
  pageSize?: number;
}

const Toolbar: React.FC<ToolbarProps> = ({
  user,
  onLogout,
  columns,
  onColumnsChange,
  showOnlyFavorites,
  onShowOnlyFavoritesChange,
  viewingUser,
  onViewingUserChange,
  favoriteCount,
  currentImageIndex,
  totalImages,
  onImageJump,
  pageSize = 20,
}) => {
  const [allUsers, setAllUsers] = useState<string[]>([]);
  const [indexInput, setIndexInput] = useState<string>('');
  const [pageInput, setPageInput] = useState<string>('');

  useEffect(() => {
    api.getUsers().then(setAllUsers);
  }, []);

  const jumpingDisabled = !!showOnlyFavorites || !!viewingUser || !onImageJump;
  const totalPages = totalImages ? Math.max(1, Math.ceil(totalImages / pageSize)) : undefined;
  const canJumpIndex = !jumpingDisabled && indexInput !== '' && (!totalImages || (Number(indexInput) >= 1 && Number(indexInput) <= totalImages));
  const canJumpPage = !jumpingDisabled && pageInput !== '' && (!totalPages || (Number(pageInput) >= 1 && Number(pageInput) <= totalPages));

  const handleDoJumpIndex = () => {
    if (!onImageJump) return;
    const n = Number(indexInput);
    if (!Number.isFinite(n) || n < 1) return;
    onImageJump(n - 1);
  };

  const handleDoJumpPage = () => {
    if (!onImageJump) return;
    const p = Number(pageInput);
    if (!Number.isFinite(p) || p < 1) return;
    const start = (p - 1) * pageSize;
    onImageJump(start);
  };

  return (
    <header className="sticky top-0 bg-white/80 backdrop-blur-md z-10 shadow-sm p-3">
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="font-bold text-lg text-gray-800">PIP 数据筛选</span>
          <div className="text-sm text-gray-600">
            当前用户: <span className="font-semibold text-indigo-600">{user.username}</span>
            {favoriteCount > 0 && (
              <span className="ml-2 text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
                收藏 {favoriteCount}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {/* Column Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="columns" className="text-sm font-medium text-gray-700">列数:</label>
            <select
              id="columns"
              value={columns}
              onChange={(e) => onColumnsChange(parseInt(e.target.value, 10))}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-sm py-1"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          
          {/* View Others' Favorites */}
           <div className="flex items-center gap-2">
            <label htmlFor="view-user" className="text-sm font-medium text-gray-700">查看收藏:</label>
            <select
              id="view-user"
              value={viewingUser}
              onChange={(e) => onViewingUserChange(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-sm py-1"
            >
              <option value="">所有图片</option>
              {allUsers.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          {/* Jump Controls */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">跳到索引:</label>
            <input
              type="number"
              min={1}
              value={indexInput}
              onChange={(e) => setIndexInput(e.target.value)}
              placeholder="如 1000"
              className="w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-sm py-1 px-2"
              disabled={jumpingDisabled}
            />
            <button
              onClick={handleDoJumpIndex}
              disabled={!canJumpIndex}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold ${canJumpIndex ? 'bg-indigo-500 text-white hover:bg-indigo-600' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
            >跳转</button>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">跳到页:</label>
            <input
              type="number"
              min={1}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              placeholder="如 50"
              className="w-20 rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-sm py-1 px-2"
              disabled={jumpingDisabled}
            />
            <button
              onClick={handleDoJumpPage}
              disabled={!canJumpPage}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold ${canJumpPage ? 'bg-indigo-500 text-white hover:bg-indigo-600' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
            >跳转</button>
          </div>

          {typeof totalImages === 'number' && (
            <div className="text-xs text-gray-500">
              共 {totalImages} 项{totalPages ? ` | 每页 ${pageSize} | 共 ${totalPages} 页` : ''}
            </div>
          )}

        </div>

        <button
          onClick={onLogout}
          className="bg-red-500 text-white px-4 py-1.5 rounded-md text-sm font-semibold hover:bg-red-600 transition-colors"
        >
          退出登录
        </button>
      </div>
    </header>
  );
};

export default Toolbar;
