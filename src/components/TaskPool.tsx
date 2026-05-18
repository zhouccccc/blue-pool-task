import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db, { Task, TaskType } from "../db";
import { useSearchParams } from "react-router";
// Removed Layout as handled at root

import { Button, Modal as AntModal, message, Tooltip, Checkbox, Tag, Dropdown, MenuProps, Select } from "antd";
import { confirm } from "./ui/confirm";
import { TYPE_INFO } from "../constants";
import { Archive, ArrowRightCircle, Trash2, Edit3, CalendarDays, Plus, Image as ImageIcon, MoreVertical, CheckSquare, User, Clock, FolderKanban, ListFilter, List, Zap, SendHorizonal } from "lucide-react";
import { WeekPicker } from "./ui/WeekPicker";
import { TaskModal } from "./TaskModal";
import dayjs from "dayjs";
import { getCurrentWeekStr } from "../lib/utils";

export function TaskPool() {
  const tasks = useLiveQuery(async () => {
    const all = await db.tasks.toArray();
    return all.filter(t => !t.week).reverse();
  }, []) || [];
  const modules = useLiveQuery(async () => {
    const res = await db.modules.toArray();
    return res.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, []) || [];
  
  const [selectedKeys, setSelectedKeys] = React.useState<React.Key[]>([]);
  const [isBatchModalOpen, setIsBatchModalOpen] = React.useState(false);
  const [targetWeek, setTargetWeek] = React.useState<string>("");
  
  const [isTaskModalOpen, setIsTaskModalOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<Task | undefined>(undefined);
  const [creationType, setCreationType] = React.useState<TaskType>("dev");
  const [expandedSubTasks, setExpandedSubTasks] = React.useState<Set<number>>(new Set());

  const toggleSubTaskPanel = (taskId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSubTasks(prev => {
      const next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      return next;
    });
  };

  const [searchParams, setSearchParams] = useSearchParams();
  
  // Filtering States from URL
  const rawModule = searchParams.get('module');
  const filterModule = rawModule && rawModule !== 'all' ? Number(rawModule) : 'all';
  const filterType = (searchParams.get('type') as TaskType | 'all') || 'all';

  const updateFilter = (key: 'module' | 'type', value: string | number) => {
    setSearchParams(prev => {
      if (value === 'all') {
        prev.delete(key);
      } else {
        prev.set(key, String(value));
      }
      return prev;
    }, { replace: true });
  };


  const filteredTasks = React.useMemo(() => {
    return tasks
      .filter(t => {
        const moduleMatch = filterModule === 'all' ? true : t.moduleId === filterModule;
        const typeMatch = filterType === 'all' ? true : t.type === filterType;
        return moduleMatch && typeMatch;
      })
      .sort((a, b) => {
        // Urgent tasks float to top
        if (a.isUrgent && !b.isUrgent) return -1;
        if (!a.isUrgent && b.isUrgent) return 1;
        return 0;
      });
  }, [tasks, filterModule, filterType]);

  const handleBatchPromote = async () => {
    if (!targetWeek) return message.warning("请先选择目标周数");
    if (selectedKeys.length === 0) return;
    
    try {
      await db.transaction('rw', db.tasks, async () => {
        for (const id of selectedKeys) {
          await db.tasks.update(Number(id), { week: targetWeek, updatedAt: Date.now() });
        }
      });
      message.success(`成功将 ${selectedKeys.length} 个任务转正`);
      setSelectedKeys([]);
      setIsBatchModalOpen(false);
      setTargetWeek("");
    } catch (err) {
      message.error("批量转正失败");
    }
  };

  const toggleSelection = (id: number) => {
    setSelectedKeys(prev => 
      prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]
    );
  };

  const openAddModal = (type: TaskType) => {
    setCreationType(type);
    setEditingTask(undefined);
    setIsTaskModalOpen(true);
  };

  const creationMenuProps: MenuProps = {
    items: [
      { key: 'dev', label: '新建开发任务', icon: <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" /> },
      { key: 'dep', label: '新建依赖任务', icon: <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5" /> },
      { key: 'bug', label: '新建Bug任务', icon: <div className="w-2 h-2 rounded-full bg-sky-500 mt-1.5" /> },
    ],
    onClick: (e) => openAddModal(e.key as TaskType),
  };

  return (
    <>

      <div className="flex flex-col h-full space-y-6 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header className="flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
             <div className="p-2.5 bg-slate-800 text-white rounded-xl shadow-sm border border-slate-700">
               <Archive size={24} />
             </div>
             <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-slate-800">任务池</h1>
                  {selectedKeys.length > 0 && (
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold border border-blue-100">
                      已选 {selectedKeys.length}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-0.5">配置周数后即可进入正式流转环节。</p>
             </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1 shadow-sm rounded-xl mr-2">
              <FolderKanban size={14} className="text-slate-400 shrink-0" />
              <Select 
                value={filterModule} 
                onChange={(val) => updateFilter('module', val)}
                variant="borderless"
                className="w-28 font-medium text-sm"
                popupClassName="min-w-[160px]"
                options={[
                  { value: 'all', label: '所有模块' },
                  ...modules.map(m => ({ value: m.id, label: m.name }))
                ]}
              />
              <div className="w-px h-4 bg-slate-200 mx-0.5"></div>
              <ListFilter size={14} className="text-slate-400 shrink-0" />
              <Select 
                value={filterType} 
                onChange={(val) => updateFilter('type', val)}
                variant="borderless"
                className="w-28 font-medium text-sm"
                options={[
                  { value: 'all', label: '所有类型' },
                  { value: 'dev', label: '开发' },
                  { value: 'bug', label: 'Bug修复' },
                  { value: 'dep', label: '依赖' },
                ]}
              />
            </div>
            
            {selectedKeys.length > 0 && (
               <>
                 <Button 
                   variant="ghost"
                   onClick={() => setSelectedKeys([])}
                   className="text-slate-500"
                 >
                   取消选择
                 </Button>
                 <Button 
                   type="primary" 
                   className="bg-blue-600 font-bold px-6 shadow-lg shadow-blue-500/20"
                   icon={<ArrowRightCircle size={18} />} 
                   onClick={() => setIsBatchModalOpen(true)}
                 >
                   批量转正
                 </Button>
               </>
            )}
          </div>
        </header>

        {/* Dashboard Grid View */}
        <div className="flex-1 overflow-y-auto pb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-0.5">
             {/* Task Cards */}
             {filteredTasks.map(task => {
               const isSelected = selectedKeys.includes(task.id);
               const info = TYPE_INFO[task.type];
               const moduleName = modules.find(m => m.id === task.moduleId)?.name;
               const isDepMe = task.type === 'dep' && task.dependedName === '我';
               const isUrgent = !!task.isUrgent;

               return (
                 <div 
                   key={task.id}
                   onClick={() => toggleSelection(task.id)}
                   className={`p-4 rounded-2xl border-2 relative flex flex-col justify-between min-h-[160px] shadow-sm transition-all duration-200 cursor-pointer select-none
                     ${isSelected ? 'bg-blue-50/20 border-blue-500 ring-4 ring-blue-500/10 scale-[0.99]' :
                       isUrgent ? 'bg-red-50/40 border-red-300 shadow-red-100/60 hover:border-red-400 hover:shadow-md hover:-translate-y-0.5' :
                       isDepMe ? 'bg-white border-amber-400 shadow-amber-100/50 hover:border-amber-500 hover:shadow-md hover:-translate-y-0.5' : 
                       `${info.cardStyles || 'bg-white border-slate-200 hover:shadow-md hover:border-slate-300'} hover:-translate-y-0.5`}
                   `}
                 >
                   <div className="relative">
                      <div className="flex justify-between items-start mb-3">
                        <div onClick={(e) => e.stopPropagation()}>
                          <Checkbox 
                            checked={isSelected} 
                            onChange={() => toggleSelection(task.id)}
                            className="transform scale-110"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {isUrgent && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-red-500 text-white font-bold rounded border border-red-600 flex items-center gap-0.5 whitespace-nowrap">
                              <Zap size={9} className="fill-white" /> 紧急
                            </span>
                          )}
                          {moduleName && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded border border-slate-200 truncate max-w-[80px]">
                              {moduleName}
                            </span>
                          )}
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold border flex items-center gap-1 ${info.bg.replace('bg-', 'text-').replace('-600', '-700').replace('-500', '-600')} ${info.bg.replace('bg-', 'bg-').replace('-600', '-50').replace('-500', '-50')} border-current opacity-80 whitespace-nowrap`}>
                            {info.label}
                          </span>
                        </div>
                      </div>
                     
                     <p className="text-slate-800 text-[13.5px] font-medium leading-snug line-clamp-3 mb-3">
                       {task.description}
                     </p>

                     {/* SubTask progress — only for dev tasks with subtasks */}
                     {task.type === 'dev' && task.subTasks && task.subTasks.length > 0 && (() => {
                       const total = task.subTasks.length;
                       const done = task.subTasks.filter(s => s.done).length;
                       const pct = Math.round((done / total) * 100);
                       return (
                         <div className="mb-1 space-y-1">
                           <div className="flex items-center justify-between">
                             <span className="text-[10px] text-slate-500 font-medium">任务进度</span>
                             <span className="text-[10px] font-bold text-blue-600">{pct}%</span>
                           </div>
                           <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                             <div
                               className="h-full bg-blue-500 rounded-full transition-all duration-300"
                               style={{ width: `${pct}%` }}
                             />
                           </div>
                         </div>
                       );
                     })()}
                   </div>

                   <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                     <div className="flex items-center gap-1.5 truncate min-w-0">
                        {(() => {
                          const personName = task.type === 'dep' ? task.dependedName : task.source;
                          const personLabel = task.type === 'dep' ? '负责人' : '来源';
                          const isMe = personName === '我';
                          if (!personName) return null;
                          
                          // Highlight badge ONLY if it matches the strict card-highlight condition (e.g. Depended on Me)
                          const isHighlighted = isDepMe && isMe;
                          
                          return (
                            <Tooltip title={`${personLabel}: ${personName}`}>
                              <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-0.5 flex-shrink-0 ${
                                isHighlighted ? 'bg-amber-500 text-white border-amber-600 shadow-sm' : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                              }`}>
                                <User size={10} className={isHighlighted ? 'text-amber-50' : ''} />
                                <span className="font-bold truncate">{personName}</span>
                              </div>
                            </Tooltip>
                          );
                        })()}

                       <span className="text-[9px] text-slate-400 font-mono whitespace-nowrap shrink-0 opacity-80">
                         {task.createdAt ? dayjs(task.createdAt).format('MM/DD HH:mm:ss') : '-'}
                       </span>

                       {task.image && <ImageIcon className="w-3 h-3 text-sky-500 flex-shrink-0" />}
                     </div>

                     <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        {/* SubTask list icon — only for dev tasks with subtasks */}
                        {task.type === 'dev' && task.subTasks && task.subTasks.length > 0 && (
                          <Tooltip title={expandedSubTasks.has(task.id) ? "收起子任务" : "展开子任务"}>
                            <button
                              onClick={(e) => toggleSubTaskPanel(task.id, e)}
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-0.5 shrink-0 transition-colors cursor-pointer ${
                                expandedSubTasks.has(task.id)
                                  ? 'bg-blue-600 text-white border-blue-700'
                                  : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'
                              }`}
                            >
                              <List size={10} />
                            </button>
                          </Tooltip>
                        )}
                        <Tooltip title="转入本周">
                          <button
                            onClick={async () => {
                              const currentWeek = getCurrentWeekStr();
                              await db.tasks.update(task.id, {
                                week: currentWeek,
                                isUrgent: false,
                                updatedAt: Date.now(),
                              });
                              message.success("已转入本周任务");
                            }}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <SendHorizonal size={14} />
                          </button>
                        </Tooltip>
                        <Tooltip title="编辑">
                          <button 
                            onClick={() => { setEditingTask(task); setIsTaskModalOpen(true); }} 
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit3 size={14} />
                          </button>
                        </Tooltip>
                        <Tooltip title="删除">
                          <button 
                            onClick={() => {
                              confirm.danger({
                                title: '删除任务',
                                content: '确定要删除这个任务吗？此操作不可撤销。',
                                okText: '确认删除',
                                cancelText: '取消',
                                onOk: async () => { await db.tasks.delete(task.id); },
                              });
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </Tooltip>
                     </div>
                   </div>

                   {/* Inline subtask panel */}
                   {task.type === 'dev' && task.subTasks && task.subTasks.length > 0 && expandedSubTasks.has(task.id) && (
                     <div
                       className="mt-2.5 pt-2.5 border-t border-blue-100 space-y-1"
                       onClick={e => e.stopPropagation()}
                     >
                       {task.subTasks.map(st => (
                         <div
                           key={st.id}
                           className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors group/st"
                           onClick={async () => {
                             const updated = task.subTasks!.map(s =>
                               s.id === st.id ? { ...s, done: !s.done } : s
                             );
                             const allDone = updated.every(s => s.done);
                             const patch: any = { subTasks: updated, updatedAt: Date.now() };
                             // Auto-move to completed when all subtasks are done
                             if (allDone && task.status !== 'completed') {
                               patch.status = 'completed';
                               patch.isDemoable = false;
                             }
                             await db.tasks.update(task.id, patch);
                           }}
                         >
                           <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                             st.done ? 'bg-blue-500 border-blue-500' : 'border-slate-300 group-hover/st:border-blue-400'
                           }`}>
                             {st.done && (
                               <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                                 <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                               </svg>
                             )}
                           </div>
                           <span className={`text-[11px] flex-1 leading-snug transition-colors ${
                             st.done ? 'line-through text-slate-400' : 'text-slate-600 group-hover/st:text-slate-800'
                           }`}>
                             {st.title}
                           </span>
                         </div>
                       ))}
                     </div>
                   )}
                 </div>
               )
             })}

             {/* The Add Button Card - Moved to end */}
             <Dropdown menu={creationMenuProps} trigger={['click']} placement="bottomCenter">
               <div className="bg-white/50 border-2 border-dashed border-slate-300 rounded-2xl min-h-[160px] flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-white group transition-all duration-200">
                 <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-blue-50 text-slate-400 group-hover:text-blue-600 flex items-center justify-center mb-3 transition-colors">
                    <Plus size={24} />
                 </div>
                 <span className="font-bold text-sm text-slate-500 group-hover:text-blue-600 transition-colors">创建池任务</span>
               </div>
             </Dropdown>
          </div>

          {tasks.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
               <Archive size={48} strokeWidth={1} className="opacity-30 mb-4" />
               <p className="text-sm font-medium">任务池空空如也</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal for task assignment */}
      <AntModal
        title={
          <div className="flex items-center gap-2 text-slate-800 pb-1 border-b">
             <CalendarDays className="w-5 h-5 text-blue-600" />
             <span>批量配置任务周数</span>
          </div>
        }
        open={isBatchModalOpen}
        onCancel={() => setIsBatchModalOpen(false)}
        onOk={handleBatchPromote}
        okText="确认转正"
        cancelText="取消"
        centered
        okButtonProps={{ disabled: !targetWeek, className: "bg-blue-600" }}
      >
        <div className="py-6 space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-700 leading-relaxed">
             您已选中 <strong className="font-bold mx-0.5">{selectedKeys.length}</strong> 个任务项，请选择它们将要入驻的目标排期周。
          </div>
          <div className="space-y-2">
             <label className="block text-sm font-bold text-slate-700">选择目标周数：</label>
             <WeekPicker value={targetWeek} onChange={setTargetWeek} />
          </div>
        </div>
      </AntModal>

      <TaskModal 
        isOpen={isTaskModalOpen} 
        onClose={() => { setIsTaskModalOpen(false); setEditingTask(undefined); }} 
        type={editingTask?.type || creationType} 
        task={editingTask} 
        isPool={true}
      />
    </>

  );
}
