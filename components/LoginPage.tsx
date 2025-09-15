import React, { useState, useEffect } from 'react';
import type { User } from '../types';
import { api } from '../services/realApiService';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [imageRoot, setImageRoot] = useState('');
  const [projectName, setProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isImageRootSet, setIsImageRootSet] = useState<boolean | null>(null);

  const isAdmin = username.trim().toLowerCase() === 'pip';
  const showImageRootInput = isAdmin && isImageRootSet === false;

  // Check if image root is set when component mounts or when user becomes admin
  useEffect(() => {
    if (isAdmin) {
      const checkImageRoot = async () => {
        try {
          const rootSet = await api.isImageRootSet();
          setIsImageRootSet(rootSet);
        } catch (error) {
          console.error('检查图片根目录状态失败:', error);
          setIsImageRootSet(false);
        }
      };
      checkImageRoot();
    } else {
      setIsImageRootSet(null);
    }
  }, [isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('用户名不能为空。');
      return;
    }
    if (showImageRootInput && !imageRoot.trim()) {
      setError('管理员必须提供图片根目录路径。');
      return;
    }
    if (showImageRootInput && !projectName.trim()) {
      setError('管理员必须提供项目名称。');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const user = await api.login(username, imageRoot, projectName);
      onLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发生未知错误。');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">PIP 图片浏览工具</h1>
        <p className="text-center text-gray-500 mb-6">请输入您的用户名开始浏览。</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              用户名
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="例如: alice"
              autoFocus
            />
             {isAdmin && <p className="text-xs text-indigo-600 mt-1">检测到管理员 'PIP' 用户。</p>}
          </div>

          {showImageRootInput && (
            <div className="transition-all duration-500 space-y-4">
              <div>
                <label htmlFor="projectName" className="block text-sm font-medium text-gray-700">
                  项目名称
                </label>
                <input
                  id="projectName"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="例如: 我的照片集"
                />
                <p className="text-xs text-gray-500 mt-1">用于标识项目，收藏数据将保存为 项目名.json</p>
              </div>
              <div>
                <label htmlFor="imageRoot" className="block text-sm font-medium text-gray-700">
                  设置本地图片根目录
                </label>
                <input
                  id="imageRoot"
                  type="text"
                  value={imageRoot}
                  onChange={(e) => setImageRoot(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="例如: C:\Users\YourUser\Pictures"
                />
                <p className="text-xs text-gray-500 mt-1">此为管理员一次性设置。</p>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed"
            >
              {isLoading ? '登录中...' : '登录'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
