import { Outlet } from 'react-router-dom';
import AppSidebar from '@/components/AppSidebar';

const AppLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
