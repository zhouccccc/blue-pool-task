import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db, { Task, TaskType } from "../db";
import { Layout } from "./Layout";
import { Button, Modal, message, Tooltip, Checkbox, Tag, Dropdown, MenuProps } from "antd";
import { TYPE_INFO } from "../constants";
import { Archive, ArrowRightCircle, Trash2, Edit3, CalendarDays, Plus, Image as ImageIcon, MoreVertical, CheckSquare, User } from "lucide-react";
import { WeekPicker } from "./ui/WeekPicker";
import { TaskModal } from "./TaskModal";

export function TaskPool() {
  const tasks = useLiveQuery(async () => {
    const all = await db.tasks.toArray();
    return all.filter(t => !t.week).reverse();
  }, []) || [];
  const modules = useLiveQuery(() => db.modules.toArray(), []) || [];
  
  const [selectedKeys, setSelectedKeys] = React.useState<React.Key[]>([]);
  const [isBatchModalOpen, setIsBatchModalOpen] = React.useState(false);
  const [targetWeek, setTargetWeek] = React.useState<string>("");
  
  const [isTaskModalOpen, setIsTaskModalOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<Task | undefined>(undefined);
  const [creationType, setCreationType] = React.useState<TaskType>("dev");

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
    <Layout backTo="/">
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
             {/* The Add Button Card */}
             <Dropdown menu={creationMenuProps} trigger={['click']} placement="bottomCenter">
               <div className="bg-white/50 border-2 border-dashed border-slate-300 rounded-2xl min-h-[160px] flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-white group transition-all duration-200">
                 <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-blue-50 text-slate-400 group-hover:text-blue-600 flex items-center justify-center mb-3 transition-colors">
                    <Plus size={24} />
                 </div>
                 <span className="font-bold text-sm text-slate-500 group-hover:text-blue-600 transition-colors">创建池任务</span>
               </div>
             </Dropdown>

             {/* Task Cards */}
             {tasks.map(task => {
               const isSelected = selectedKeys.includes(task.id);
               const info = TYPE_INFO[task.type];
               const moduleName = modules.find(m => m.id === task.moduleId)?.name;

               return (
                 <div 
                   key={task.id}
                   onClick={() => toggleSelection(task.id)}
                   className={`bg-white p-4 rounded-2xl border-2 relative flex flex-col justify-between min-h-[160px] shadow-sm transition-all duration-200 cursor-pointer select-none
                     ${isSelected ? 'border-blue-500 bg-blue-50/20 ring-4 ring-blue-500/10 scale-[0.99]' : 'border-slate-200 hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5'}
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
                       <span className={`text-[10px] px-2 py-0.5 rounded font-bold border flex items-center gap-1 ${info.bg.replace('bg-', 'text-').replace('-600', '-700').replace('-500', '-600')} ${info.bg.replace('bg-', 'bg-').replace('-600', '-50').replace('-500', '-50')} border-current opacity-80`}>
                         {info.label}
                       </span>
                     </div>
                     
                     <p className="text-slate-800 text-[13.5px] font-medium leading-snug line-clamp-3 mb-3">
                       {task.description}
                     </p>
                   </div>

                   <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                     <div className="flex items-center gap-1.5 truncate min-w-0">
                       {task.type === 'dep' && task.dependedName && (
                         <Tooltip title={`负责人: ${task.dependedName}`}>
                           <div className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded border border-indigo-100 flex items-center gap-0.5 flex-shrink-0">
                             <User size={10} />
                             <span>{task.dependedName}</span>
                           </div>
                         </Tooltip>
                       )}
                       {moduleName ? (
                         <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded truncate max-w-[60px]">
                           {moduleName}
                         </span>
                       ) : (
                         !task.dependedName && <span className="text-[10px] text-slate-400 italic">未分类</span>
                       )}
                       {task.image && <ImageIcon className="w-3 h-3 text-sky-500 flex-shrink-0" />}
                     </div>

                     <div className="flex gap-1" onClick={e => e.stopPropagation()}>
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
                            onClick={async () => { if(window.confirm("确认删除？")) await db.tasks.delete(task.id); }} 
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </Tooltip>
                     </div>
                   </div>
                 </div>
               )
             })}
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
      <Modal
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
      </Modal>

      <TaskModal 
        isOpen={isTaskModalOpen} 
        onClose={() => { setIsTaskModalOpen(false); setEditingTask(undefined); }} 
        type={editingTask?.type || creationType} 
        task={editingTask} 
        isPool={true}
      />
    </Layout>
  );
}
