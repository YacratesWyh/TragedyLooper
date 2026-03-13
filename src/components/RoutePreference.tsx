'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Home, Settings, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RouteItem {
  id: string;
  name: string;
  href: string;
}

const ROUTES: RouteItem[] = [
  { id: 'home', name: '首页', href: '/' },
  { id: 'tragedy-looper', name: '惨剧轮回', href: '/tragedy-looper' },
  { id: 'poison', name: 'ポイズン', href: '/poison' },
  { id: 'missing-child', name: '迷子', href: '/missing-child' },
];

export function RoutePreference() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    setCurrentPath(window.location.pathname);
  }, []);

  // 过滤掉当前页面
  const availableRoutes = ROUTES.filter(route => route.href !== currentPath);

  if (availableRoutes.length === 0) return null;

  return (
    <>
      {/* 悬浮按钮 - 固定在右下角 */}
      <motion.div
        className="fixed bottom-4 right-4 z-[9999]"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="menu"
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              className="flex flex-col gap-2 mb-2"
            >
              {availableRoutes.map((route, index) => (
                <motion.div
                  key={route.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={route.href}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-800/95 border border-stone-600 text-stone-200 hover:bg-stone-700 hover:text-white transition-all shadow-lg whitespace-nowrap"
                    onClick={() => setIsOpen(false)}
                  >
                    {route.name}
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all ${
            isOpen
              ? 'bg-red-600 hover:bg-red-500 text-white'
              : 'bg-stone-800/95 border border-stone-600 text-stone-200 hover:bg-stone-700'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title={isOpen ? '关闭' : '快速导航'}
        >
          {isOpen ? <X size={20} /> : <Settings size={20} />}
        </motion.button>
      </motion.div>
    </>
  );
}
