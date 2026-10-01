import React from 'react';
import { 
  Factory, LayoutDashboard, ShoppingCart, ListOrdered, 
  BarChart3, Users, LogOut, ClipboardList 
} from 'lucide-react';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

export function OwnerSidebar({ activePage, onNavigate }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'orders', icon: ShoppingCart, label: 'Data Pesanan' },
    { id: 'scheduling', icon: ListOrdered, label: 'Penjadwalan Prioritas' },
    { id: 'priority-result', icon: Factory, label: 'Hasil Prioritas' },
    { id: 'reports', icon: BarChart3, label: 'Laporan' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 z-20">
      <div className="h-16 flex items-center px-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-600/20">
            <Factory className="text-white w-4 h-4" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            Zamal Collection
          </span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
                isActive 
                  ? 'bg-blue-50 text-blue-700 font-semibold' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} /> 
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-200">
        <button 
          onClick={() => onNavigate('login')}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 font-medium transition-colors"
        >
          <LogOut className="w-5 h-5" /> Logout
        </button>
      </div>
    </aside>
  );
}

export function AdminSidebar({ activePage, onNavigate }: SidebarProps) {
  const navItems = [
    { id: 'admin-customers', icon: Users, label: 'Data Pelanggan' },
    { id: 'admin-orders', icon: ShoppingCart, label: 'Data Pesanan' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 z-20">
      <div className="h-16 flex items-center px-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-600/20">
            <Factory className="text-white w-4 h-4" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            Zamal Collection
          </span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
                isActive 
                  ? 'bg-blue-50 text-blue-700 font-semibold' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} /> 
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-200">
        <button 
          onClick={() => onNavigate('login')}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 font-medium transition-colors"
        >
          <LogOut className="w-5 h-5" /> Logout
        </button>
      </div>
    </aside>
  );
}

export function ProduksiSidebar({ activePage, onNavigate }: SidebarProps) {
  const navItems = [
    { id: 'produksi', icon: ClipboardList, label: 'Prioritas Produksi' },
    { id: 'manage-produksi', icon: Factory, label: 'Mengelola Produksi' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 z-20">
      <div className="h-16 flex items-center px-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-600/20">
            <Factory className="text-white w-4 h-4" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            Zamal Collection
          </span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
                isActive 
                  ? 'bg-blue-50 text-blue-700 font-semibold' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} /> 
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-200">
        <button 
          onClick={() => onNavigate('login')}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 font-medium transition-colors"
        >
          <LogOut className="w-5 h-5" /> Logout
        </button>
      </div>
    </aside>
  );
}