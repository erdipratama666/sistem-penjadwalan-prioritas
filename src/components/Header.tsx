import React from 'react';
import { Search, Bell } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  userName?: string;
  userRole?: string;
  userInitial?: string;
}

export default function AppHeader({
  title,
  subtitle,
  userName = "Pemilik",
  userRole = "Business Owner",
  userInitial = "P"
}: HeaderProps) {
  return (
    <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 flex-shrink-0 z-10">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
        <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-2 w-2 h-2 bg-blue-500 rounded-full border-2 border-white"></span>
        </button>
        <div className="h-8 w-px bg-slate-200"></div>
        <button className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-slate-800 leading-none">{userName}</p>
            <p className="text-xs text-slate-500 mt-1">{userRole}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200 text-blue-700 font-bold">
            {userInitial}
          </div>
        </button>
      </div>
    </header>
  );
}