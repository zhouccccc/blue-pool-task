import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db from "../db";
import { Link } from "react-router";
// Removed Layout as it is now handled at the root layout route
import { Layers, Puzzle, Bug, Activity, Database, Archive, Briefcase, Users, Download, Upload, ChevronDown, FileJson } from "lucide-react";
import { Dropdown, message, Modal as AntModal, type MenuProps } from "antd";
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

  const handleExport = async () => {
    try {
      const data = {
        version: 1,
        timestamp: Date.now(),
        tasks: await db.tasks.toArray(),
        modules: await db.modules.toArray(),
        members: await db.members.toArray(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `blueprint_backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      message.success("全量数据已成功导出本地文件！");
    } catch (err: any) {
      message.error("导出失败：" + err.message);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async (event: any) => {
        try {
          const backup = JSON.parse(event.target.result);
          if (!backup.tasks || !backup.modules || !backup.members) {
             throw new Error("无效的备份文件格式，未找到核心数据表");
          }
          
          if (!await new Promise<boolean>(resolve => {
            AntModal.confirm({
              title: '⚠️ 危险操作',
              content: '导入操作将彻底清空当前的所有本地数据（任务、模块、人员），并以备份文件内容完全覆盖。此操作不可撤销，确定要执行吗？',
              okText: '确认覆盖',
              okButtonProps: { danger: true },
              cancelText: '取消',
              centered: true,
              onOk: () => resolve(true),
              onCancel: () => resolve(false),
            });
          })) {
            return;
          }
          
          await db.transaction('rw', [db.tasks, db.modules, db.members], async () => {
             await db.tasks.clear();
             await db.modules.clear();
             await db.members.clear();
             
             await db.tasks.bulkAdd(backup.tasks);
             await db.modules.bulkAdd(backup.modules);
             await db.members.bulkAdd(backup.members);
          });
          
          message.success("全量数据导入成功！页面即将自动重载。");
          setTimeout(() => window.location.reload(), 1500);
        } catch (err: any) {
          message.error("导入解析失败，请确保文件未被破坏：" + err.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const dataMenuItems: MenuProps['items'] = [
    {
      key: 'export',
      icon: <Download className="w-4 h-4 text-slate-600" />,
      label: <span className="font-medium text-slate-700">导出全量备份 (.json)</span>,
      onClick: handleExport
    },
    {
      type: 'divider',
    },
    {
      key: 'import',
      icon: <Upload className="w-4 h-4 text-red-500" />,
      label: <span className="font-medium text-red-600">导入数据覆盖</span>,
      onClick: handleImport,
      danger: true,
    }
  ];

  return (
    <>

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
          <div className="flex items-center gap-3 shrink-0">
            <Dropdown menu={{ items: dataMenuItems }} placement="bottomRight" trigger={['click']}>
              <Button variant="outline" className="text-slate-600 border-slate-200 bg-white shadow-sm hover:bg-slate-50 hover:text-slate-900 font-medium">
                <FileJson className="w-4 h-4 mr-2" />
                数据存取
                <ChevronDown className="w-3.5 h-3.5 ml-1.5 opacity-50" />
              </Button>
            </Dropdown>
            <div className="w-px h-8 bg-slate-200 mx-1 invisible sm:visible"></div>
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
            week={currentWeek}
          />
          <CategoryCard 
            type="dep" 
            active={stats.dep.active} 
            done={stats.dep.done}
            total={stats.dep.total}
            icon={<Puzzle className="w-6 h-6 text-white" />}
            week={currentWeek}
          />
          <CategoryCard 
            type="bug" 
            active={stats.bug.active} 
            done={stats.bug.done}
            total={stats.bug.total}
            icon={<Bug className="w-6 h-6 text-white" />}
            week={currentWeek}
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
    </>

  );
}

function CategoryCard({ type, active, done, total, icon, week }: { type: 'dev'|'dep'|'bug', active: number, done: number, total: number, icon: React.ReactNode, week: string }) {

  const info = TYPE_INFO[type];
  
  return (
    <Link to={`/board/${type}/${week}`} className="block relative group focus:outline-none">
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
