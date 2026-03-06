import { Outlet } from 'react-router-dom';
import StatsSidebar from '@/components/StatsSidebar';

const StatsLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden">
      <StatsSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default StatsLayout;
