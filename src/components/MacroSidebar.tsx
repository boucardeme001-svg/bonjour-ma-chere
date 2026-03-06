import { useAuth } from '@/contexts/AuthContext';
import { NavLink, useLocation } from 'react-router-dom';
import { TrendingUp, Landmark, Globe, Banknote, LogOut, ChevronsLeft, ChevronsRight, LayoutDashboard, ArrowLeftRight } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const macroItems = [
  { to: '/macro', label: 'Simulations', icon: LayoutDashboard, end: true },
];

const modules = [
  { key: 'pib', label: 'Secteur réel', icon: TrendingUp },
  { key: 'tofe', label: 'TOFE', icon: Landmark },
  { key: 'bdp', label: 'Balance des paiements', icon: Globe },
  { key: 'monetaire', label: 'Situation monétaire', icon: Banknote },
];

const MacroSidebar = () => {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={cn("flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300", collapsed ? "w-16" : "w-64")}>
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-accent-foreground" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-base font-bold text-sidebar-accent-foreground truncate">Cadrage Macro</h1>
            <p className="text-xs text-sidebar-foreground/60 truncate">Sénégal — UEMOA</p>
          </div>
        )}
      </div>

      <nav className="flex-1 px-2 py-4 space-y-4 overflow-y-auto">
        <div>
          {!collapsed && <div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">Navigation</div>}
          <div className="space-y-0.5">
            {macroItems.map((item) => {
              const isActive = item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);
              return (
                <NavLink key={item.to} to={item.to} className={cn("sidebar-link", isActive ? "sidebar-link-active" : "sidebar-link-inactive")}>
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              );
            })}
          </div>
        </div>

        <div>
          {!collapsed && <div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">Modules</div>}
          <div className="space-y-0.5">
            {modules.map((mod) => {
              const isActive = location.pathname.includes(`/${mod.key}`);
              return (
                <div key={mod.key} className={cn("sidebar-link", isActive ? "sidebar-link-active" : "sidebar-link-inactive", "cursor-default opacity-70")}>
                  <mod.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span className="truncate">{mod.label}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="border-t border-sidebar-border p-2 space-y-1">
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

export default MacroSidebar;
