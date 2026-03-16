import { useAuth } from '@/contexts/AuthContext';
import { NavLink, useLocation } from 'react-router-dom';
import { BookOpen, LayoutDashboard, List, FileText, BookOpenCheck, BarChart3, Settings, LogOut, ChevronsLeft, ChevronsRight, Users, Receipt, UserCircle, FileSpreadsheet, TrendingUp, ArrowDownUp, ClipboardList, Shield } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useUserRole, getRoleLabel } from '@/hooks/useUserRole';
import { Badge } from '@/components/ui/badge';

const comptaItems = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/plan-comptable', label: 'Plan comptable', icon: List },
  { to: '/journaux', label: 'Journaux', icon: BookOpenCheck },
  { to: '/ecritures', label: 'Saisie écritures', icon: FileText },
  { to: '/grand-livre', label: 'Grand livre', icon: BookOpen },
  { to: '/balance', label: 'Balance', icon: BarChart3 },
  { to: '/exercices', label: 'Exercices', icon: Settings },
];

const etatsItems = [
  { to: '/bilan', label: 'Bilan', icon: FileSpreadsheet },
  { to: '/compte-resultat', label: 'Compte de résultat', icon: TrendingUp },
  { to: '/tafire', label: 'TAFIRE', icon: ArrowDownUp },
];

const paieItems = [
  { to: '/employes', label: 'Employés', icon: Users },
  { to: '/bulletins-paie', label: 'Bulletins de paie', icon: Receipt },
  { to: '/etats-paie', label: 'États de paie', icon: ClipboardList },
];

const adminItems = [
  { to: '/gestion-roles', label: 'Gestion des rôles', icon: Shield },
];

const AppSidebar = () => {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { role, hasAccess } = useUserRole();

  const groups = [
    { label: 'Comptabilité', items: comptaItems },
    { label: 'États financiers', items: etatsItems },
    { label: 'Paie', items: paieItems },
    ...(role === 'chef_comptable' ? [{ label: 'Administration', items: adminItems }] : []),
  ];

  return (
    <aside className={cn("flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300", collapsed ? "w-16" : "w-64")}>
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-base font-bold text-sidebar-accent-foreground truncate">SysCompta</h1>
            <p className="text-xs text-sidebar-muted truncate">SYSCOHADA Sénégal</p>
          </div>
        )}
      </div>

      <nav className="flex-1 px-2 py-4 space-y-4 overflow-y-auto">
        {groups.map(group => {
          const visibleItems = group.items.filter(item => hasAccess(item.to));
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label}>
              {!collapsed && <div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted">{group.label}</div>}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive = location.pathname === item.to;
                  return (
                    <NavLink key={item.to} to={item.to} className={cn("sidebar-link", isActive ? "sidebar-link-active" : "sidebar-link-inactive")}>
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-2 space-y-1">
        {!collapsed && role && (
          <div className="px-3 py-1">
            <Badge variant="outline" className="text-[10px]">{getRoleLabel(role)}</Badge>
          </div>
        )}
        <NavLink to="/profil" className={cn("sidebar-link", location.pathname === '/profil' ? "sidebar-link-active" : "sidebar-link-inactive", "w-full")}>
          <UserCircle className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Mon Profil</span>}
        </NavLink>
        <button onClick={() => setCollapsed(!collapsed)} className="sidebar-link sidebar-link-inactive w-full">
          {collapsed ? <ChevronsRight className="w-5 h-5" /> : <><ChevronsLeft className="w-5 h-5" /><span>Réduire</span></>}
        </button>
        {!collapsed && user && (
          <div className="px-3 py-2 text-xs text-sidebar-muted truncate">{user.email}</div>
        )}
        <button onClick={signOut} className="sidebar-link sidebar-link-inactive w-full">
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
