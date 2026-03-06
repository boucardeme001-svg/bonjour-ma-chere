import { Outlet } from 'react-router-dom';
import MacroSidebar from '@/components/MacroSidebar';

const MacroLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden">
      <MacroSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MacroLayout;
