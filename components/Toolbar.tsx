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
}) => {
  const [allUsers, setAllUsers] = useState<string[]>([]);
  
  useEffect(() => {
    api.getUsers().then(setAllUsers);
  }, []);

  return (
    <header className="sticky top-0 bg-white/80 backdrop-blur-md z-10 shadow-sm p-3">
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="font-bold text-lg text-gray-800">PIP 浏览器</span>
          <div className="text-sm text-gray-600">
            当前用户: <span className="font-semibold text-indigo-600">{user.username}</span>
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

          {/* Favorites Toggle */}
          <div className="flex items-center gap-2">
            <label htmlFor="fav-toggle" className="text-sm font-medium text-gray-700 select-none">我的收藏</label>
            <button
              id="fav-toggle"
              type="button"
              onClick={() => onShowOnlyFavoritesChange(!showOnlyFavorites)}
              className={`${showOnlyFavorites ? 'bg-indigo-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
              role="switch"
              aria-checked={showOnlyFavorites}
            >
              <span
                aria-hidden="true"
                className={`${showOnlyFavorites ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
              />
            </button>
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
