import Sidebar from './Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#0f1117]">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 min-h-screen overflow-auto">
        {children}
      </main>
    </div>
  );
}
