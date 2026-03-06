import { useAuth } from '@/contexts/AuthContext';
import { NavLink, useLocation } from 'react-router-dom';
import { BarChart3, ScatterChart, TrendingUp, LogOut, ChevronsLeft, ChevronsRight, ArrowLeftRight, Upload, Calculator } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/stats', label: 'Tableau de bord', icon: BarChart3, end: true },
  { to: '/stats/descriptive', label: 'Statistiques descriptives', icon: Calculator, end: false },
  { to: '/stats/regression', label: 'Régression & Économétrie', icon: ScatterChart, end: false },
  { to: '/stats/series', label: 'Séries temporelles', icon: TrendingUp, end: false },
  { to: '/stats/import', label: 'Importer des données', icon: Upload, end: false },
];

const StatsSidebar = () => {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={cn("flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300", collapsed ? "w-16" : "w-64")}>
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-accent-foreground" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-base font-bold text-sidebar-accent-foreground truncate">Statistiques</h1>
            <p className="text-xs text-sidebar-foreground/60 truncate">Analyse & Économétrie</p>
          </div>
        )}
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);
          return (
            <NavLink key={item.to} to={item.to} end={item.end} className={cn("sidebar-link", isActive ? "sidebar-link-active" : "sidebar-link-inactive")}>
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-2 space-y-1">
        <NavLink to="/macro" className="sidebar-link sidebar-link-inactive w-full">
          <ArrowLeftRight className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Cadrage Macro</span>}
        </NavLink>
        <NavLink to="/" className="sidebar-link sidebar-link-inactive w-full">
          <ArrowLeftRight className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Comptabilité</span>}
        </NavLink>
        <button onClick={() => setCollapsed(!collapsed)} className="sidebar-link sidebar-link-inactive w-full">
          {collapsed ? <ChevronsRight className="w-5 h-5" /> : <><ChevronsLeft className="w-5 h-5" /><span>Réduire</span></>}
        </button>
        {!collapsed && user && (
          <div className="px-3 py-2 text-xs text-sidebar-foreground/50 truncate">{user.email}</div>
        )}
        <button onClick={signOut} className="sidebar-link sidebar-link-inactive w-full">
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
};

export default StatsSidebar;
