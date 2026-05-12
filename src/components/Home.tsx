import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db from "../db";
import { Link } from "react-router";
import { Layout } from "./Layout";
import { Layers, Puzzle, Bug, Activity, Database, Archive, Briefcase } from "lucide-react";
import { TYPE_INFO } from "../constants";
import { getCurrentWeekStr } from "../lib/utils";
import { Button } from "./ui/button";
import { ModulesModal } from "./ModulesModal";

export function Home() {
  const currentWeek = getCurrentWeekStr();
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) || [];
  const [isModulesModalOpen, setIsModulesModalOpen] = React.useState(false);

  const devTasks = tasks.filter(t => t.type === 'dev' && t.week);
  const depTasks = tasks.filter(t => t.type === 'dep' && t.week);
  const bugTasks = tasks.filter(t => t.type === 'bug' && t.week);

  const stats = {
    dev: { total: devTasks.length, week: devTasks.filter(t => t.week === currentWeek).length },
    dep: { total: depTasks.length, week: depTasks.filter(t => t.week === currentWeek).length },
    bug: { total: bugTasks.length, week: bugTasks.filter(t => t.week === currentWeek).length },
    pool: tasks.filter(t => !t.week).length
  };

  const totalTasks = tasks.length;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 pt-4 sm:pt-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-full ring-1 ring-blue-200/50">
              <Activity className="w-4 h-4" />
              <span>概览</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
              任务大厅
            </h1>
            <p className="text-slate-500 max-w-2xl text-lg">
              管理您的各个维度的任务，当前共有 <strong className="text-slate-800">{totalTasks}</strong> 项追踪中的任务。
            </p>
          </div>
          <Button variant="outline" className="text-blue-600 border-blue-200 shrink-0 bg-white shadow-sm hover:bg-blue-50" onClick={() => setIsModulesModalOpen(true)}>
            <Database className="w-4 h-4 mr-2" />
            模块管理
          </Button>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <CategoryCard 
            type="dev" 
            weekCount={stats.dev.week} 
            totalCount={stats.dev.total}
            icon={<Layers className="w-6 h-6 text-white" />}
          />
          <CategoryCard 
            type="dep" 
            weekCount={stats.dep.week} 
            totalCount={stats.dep.total}
            icon={<Puzzle className="w-6 h-6 text-white" />}
          />
          <CategoryCard 
            type="bug" 
            weekCount={stats.bug.week} 
            totalCount={stats.bug.total}
            icon={<Bug className="w-6 h-6 text-white" />}
          />

          <Link to="/pool" className="block relative group">
            <div className="bg-gradient-to-br from-slate-600 to-slate-800 rounded-3xl p-6 py-7 text-white flex flex-col justify-between min-h-[200px] shadow-lg shadow-slate-200/50 relative overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-slate-500/50 p-2 rounded-xl border border-slate-400/30">
                    <Archive className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold">任务池</h3>
                <p className="text-slate-200/80 text-sm mt-1">非正式待排期需求集散地</p>
              </div>
              <div className="relative z-10 flex items-end justify-between mt-6">
                <span className="text-3xl font-bold">{stats.pool}</span>
              </div>
              <div className="absolute -right-4 -bottom-4 w-32 h-32 rounded-full bg-slate-500/20 opacity-50 transition-transform duration-500 group-hover:scale-110"></div>
            </div>
          </Link>
        </div>
      </div>
      <ModulesModal isOpen={isModulesModalOpen} onClose={() => setIsModulesModalOpen(false)} />
    </Layout>
  );
}

function CategoryCard({ type, weekCount, totalCount, icon }: { type: 'dev'|'dep'|'bug', weekCount: number, totalCount: number, icon: React.ReactNode }) {
  const info = TYPE_INFO[type];
  
  return (
    <Link to={`/board/${type}`} className="block relative group focus:outline-none">
      <div className={`${info.bg} rounded-3xl p-6 py-7 text-white flex flex-col justify-between min-h-[200px] shadow-lg ${info.shadow}/50 relative overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300`}>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className={`${info.iconBg} p-2 rounded-xl border border-white/20`}>
              {icon}
            </div>
          </div>
          <h3 className="text-xl font-semibold">{info.label}</h3>
          <p className={`${info.txt} text-sm mt-1 opacity-80 leading-snug`}>{info.desc}</p>
        </div>
        <div className="relative z-10 flex items-end justify-between mt-6">
          <div className="flex flex-col">
             <span className="text-2xl font-bold tracking-tight">{weekCount} <span className="text-lg font-normal text-white/50 mx-1">/</span> {totalCount}</span>
          </div>
        </div>
        <div className={`absolute rounded-full opacity-20 transition-transform duration-500 group-hover:scale-110 ${info.circle}`}></div>
      </div>
    </Link>
  );
}
