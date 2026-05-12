import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db from "../db";
import { Link } from "react-router";
import { Layout } from "./Layout";
import { Layers, Puzzle, Bug, Activity, Database, Archive, Briefcase, Users } from "lucide-react";
import { TYPE_INFO } from "../constants";
import { getCurrentWeekStr } from "../lib/utils";
import { Button } from "./ui/button";
import { ModulesModal } from "./ModulesModal";
import { MembersModal } from "./MembersModal";

export function Home() {
  const currentWeek = getCurrentWeekStr();
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) || [];
  const [isModulesModalOpen, setIsModulesModalOpen] = React.useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = React.useState(false);

  const stats = {
    dev: { 
      active: tasks.filter(t => t.type === 'dev' && t.week === currentWeek && t.status === 'in_progress').length,
      done: tasks.filter(t => t.type === 'dev' && t.week === currentWeek && ['completed', 'deployed'].includes(t.status)).length,
      total: tasks.filter(t => t.type === 'dev' && t.week === currentWeek).length
    },
    dep: { 
      active: tasks.filter(t => t.type === 'dep' && t.week === currentWeek && t.status === 'in_progress').length,
      done: tasks.filter(t => t.type === 'dep' && t.week === currentWeek && t.status === 'completed').length,
      total: tasks.filter(t => t.type === 'dep' && t.week === currentWeek).length
    },
    bug: { 
      active: tasks.filter(t => t.type === 'bug' && t.week === currentWeek && t.status === 'in_progress').length,
      done: tasks.filter(t => t.type === 'bug' && t.week === currentWeek && t.status === 'completed').length,
      total: tasks.filter(t => t.type === 'bug' && t.week === currentWeek).length
    },
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
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" className="text-indigo-600 border-indigo-200 bg-white shadow-sm hover:bg-indigo-50" onClick={() => setIsMembersModalOpen(true)}>
              <Users className="w-4 h-4 mr-2" />
              人员管理
            </Button>
            <Button variant="outline" className="text-blue-600 border-blue-200 bg-white shadow-sm hover:bg-blue-50" onClick={() => setIsModulesModalOpen(true)}>
              <Database className="w-4 h-4 mr-2" />
              模块管理
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <CategoryCard 
            type="dev" 
            active={stats.dev.active} 
            done={stats.dev.done}
            total={stats.dev.total}
            icon={<Layers className="w-6 h-6 text-white" />}
          />
          <CategoryCard 
            type="dep" 
            active={stats.dep.active} 
            done={stats.dep.done}
            total={stats.dep.total}
            icon={<Puzzle className="w-6 h-6 text-white" />}
          />
          <CategoryCard 
            type="bug" 
            active={stats.bug.active} 
            done={stats.bug.done}
            total={stats.bug.total}
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
      <MembersModal isOpen={isMembersModalOpen} onClose={() => setIsMembersModalOpen(false)} />
    </Layout>
  );
}

function CategoryCard({ type, active, done, total, icon }: { type: 'dev'|'dep'|'bug', active: number, done: number, total: number, icon: React.ReactNode }) {
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
             <span className="text-2xl font-bold tracking-tight">
               {active}
               <span className="text-lg font-normal text-white/50 mx-1">/</span>
               {done}
               <span className="text-lg font-normal text-white/50 mx-1">/</span>
               {total}
             </span>
          </div>
        </div>
        <div className={`absolute rounded-full opacity-20 transition-transform duration-500 group-hover:scale-110 ${info.circle}`}></div>
      </div>
    </Link>
  );
}
