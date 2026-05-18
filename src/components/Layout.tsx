import * as React from "react";
import { Link, useLocation, Outlet, useParams } from "react-router";
import { CheckSquare, Layers, Bug, ArrowLeft } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import db from "../db";
import { getCurrentWeekStr } from "../lib/utils";

export function Layout() {
  const location = useLocation();
  const { type, week } = useParams<{ type?: 'dev'|'dep'|'bug', week?: string }>();
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) || [];
  
  const backTo = location.pathname !== '/' ? '/' : undefined;
  const targetWeek = week || getCurrentWeekStr();
  
  const counts = {
    dev: tasks.filter(t => t.type === 'dev' && t.week === targetWeek && (t.status === 'new' || t.status === 'in_progress')).length,
    dep: tasks.filter(t => t.type === 'dep' && t.week === targetWeek && (t.status === 'new' || t.status === 'in_progress')).length,
    bug: tasks.filter(t => t.type === 'bug' && t.week === targetWeek && (t.status === 'new' || t.status === 'in_progress')).length,
  };

  const bgColors = {
    dev: 'bg-gradient-to-br from-blue-50/80 via-slate-50 to-slate-100',
    dep: 'bg-gradient-to-br from-indigo-50/80 via-slate-50 to-slate-100',
    bug: 'bg-gradient-to-br from-sky-50/80 via-slate-50 to-slate-100',
  };

  return (
    <div className={`h-screen w-full flex flex-col font-sans text-slate-900 overflow-hidden relative ${type ? bgColors[type] : 'bg-slate-50'}`}>
      {!type && (
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e1_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e1_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:linear-gradient(to_bottom,white,transparent)] pointer-events-none opacity-40"></div>
      )}
      <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 sm:px-8 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          {backTo && (
            <Link to={backTo} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          )}
          <Link to="/" className="flex items-center gap-3 group focus:outline-none">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
              <CheckSquare className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800 hidden sm:block">
              蓝图 <span className="text-blue-600">Personal</span>
            </h1>
          </Link>
        </div>
        <nav className="flex items-center gap-2 sm:gap-3">
          <NavLink to="/board/dev" icon={<Layers className="w-4 h-4" />} label="开发" typeTheme="dev" count={counts.dev} />
          <NavLink to="/board/dep" icon={<Layers className="w-4 h-4" />} label="依赖" typeTheme="dep" count={counts.dep} />
          <NavLink to="/board/bug" icon={<Bug className="w-4 h-4" />} label="Bug" typeTheme="bug" count={counts.bug} />
        </nav>
      </header>
      <main className="flex-1 p-6 gap-6 overflow-hidden max-w-[1600px] mx-auto w-full flex flex-col z-0 relative">
        <Outlet />
      </main>
      <footer className="h-8 bg-slate-800 text-slate-400 px-6 flex items-center justify-between text-[10px] shrink-0 z-10">
        <div className="flex items-center gap-6">
          <span>DB: IndexedDB Connected</span>
          <span>Tasks Sync: Active</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            System Ready
          </span>
        </div>
      </footer>
    </div>
  );
}

function NavLink({ to, icon, label, typeTheme, count }: { to: string, icon: React.ReactNode, label: string, typeTheme: 'dev'|'dep'|'bug', count: number }) {
  const location = useLocation();
  const { week } = useParams<{ week?: string }>();
  
  const isActive = location.pathname.startsWith(to);
  
  // Preserve current week in navigation to boards
  const targetUrl = week ? `${to}/${week}` : to;

  const themeClasses = {
    dev: 'text-blue-700 bg-blue-100/50 border border-blue-200/50',
    dep: 'text-indigo-700 bg-indigo-100/50 border border-indigo-200/50',
    bug: 'text-sky-700 bg-sky-100/50 border border-sky-200/50',
  };
  
  const badgeThemes = {
    dev: 'bg-blue-600 text-white',
    dep: 'bg-indigo-600 text-white',
    bug: 'bg-sky-600 text-white',
    inactive: 'bg-slate-200 text-slate-600',
  };

  return (
    <Link to={targetUrl} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${isActive ? themeClasses[typeTheme] : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'}`}>
      {icon}
      <span className="hidden sm:inline">{label}</span>
      {count > 0 && (
        <span className={`ml-0.5 text-[10px] font-bold px-1.5 py-0.5 min-w-[20px] text-center rounded-full ${isActive ? badgeThemes[typeTheme] : badgeThemes.inactive}`}>
          {count}
        </span>
      )}
    </Link>
  )
}

