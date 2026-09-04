"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10" />;
  }

  return (
    <div className="relative group">
      <button
        onClick={() => {
          if (theme === 'light') setTheme('dark');
          else if (theme === 'dark') setTheme('system');
          else setTheme('light');
        }}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-colors"
        title="Toggle Theme (Light / Dark / Desktop)"
      >
        {theme === 'light' ? (
          <Sun size={16} />
        ) : theme === 'dark' ? (
          <Moon size={16} />
        ) : (
          <Monitor size={16} />
        )}
      </button>
      <div className="absolute right-0 top-full mt-2 hidden group-hover:flex flex-col bg-[#1a1a1c] border border-white/10 rounded-lg shadow-xl overflow-hidden z-50 min-w-[120px]">
        <button 
          onClick={() => setTheme('light')}
          className={`flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-colors ${theme === 'light' ? 'text-blue-400' : 'text-gray-300'}`}
        >
          <Sun size={14} /> Light
        </button>
        <button 
          onClick={() => setTheme('dark')}
          className={`flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-colors ${theme === 'dark' ? 'text-blue-400' : 'text-gray-300'}`}
        >
          <Moon size={14} /> Dark
        </button>
        <button 
          onClick={() => setTheme('system')}
          className={`flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-colors ${theme === 'system' ? 'text-blue-400' : 'text-gray-300'}`}
        >
          <Monitor size={14} /> Desktop (System)
        </button>
      </div>
    </div>
  );
}
