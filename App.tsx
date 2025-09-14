import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import ImageBrowserPage from './components/ImageBrowserPage';
import { api } from './services/realApiService';
import type { User } from './types';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const currentUser = api.getCurrentUser();
    setUser(currentUser);
    setIsLoading(false);
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-lg text-gray-600">加载中...</div>
      </div>
    );
  }

  return (
    <div>
      {user ? (
        <ImageBrowserPage user={user} onLogout={handleLogout} />
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;
