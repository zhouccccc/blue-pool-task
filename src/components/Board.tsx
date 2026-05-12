import * as React from "react";
import { useParams } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import db, { TaskType, Module, Task } from "../db";
import { STATUS_MAP, TYPE_INFO } from "../constants";
import { Layout } from "./Layout";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Plus, Edit2, Trash2, Image as ImageIcon, FastForward, AlertCircle, User } from "lucide-react";
import { Button } from "./ui/button";
import { TaskModal } from "./TaskModal";
import { Image, Select, Tooltip, message } from "antd";
import { formatWeekRange, getCurrentWeekStr, getNextWeekStr, getWeekOptions } from "../lib/utils";

export function Board() {
  const { type } = useParams<{ type: TaskType }>();
  const [isTaskModalOpen, setIsTaskModalOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<Task | undefined>(undefined);
  const [previewImage, setPreviewImage] = React.useState<string | null>(null);
  const [activeWeek, setActiveWeek] = React.useState(getCurrentWeekStr());

  if (!type || !STATUS_MAP[type]) {
    return <Layout><div className="flex items-center justify-center h-[50vh]">未知或者不支持的任务类型</div></Layout>;
  }

  const columns = STATUS_MAP[type];
  const info = TYPE_INFO[type];

  const tasks = useLiveQuery(
    () => db.tasks.where({ type }).filter(t => t.week === activeWeek).toArray(),
    [type, activeWeek]
  );
  
  const modules = useLiveQuery(() => db.modules.toArray(), []) || [];

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !tasks) return;
    
    const sourceStatus = result.source.droppableId;
    const destStatus = result.destination.droppableId;
    const taskId = parseInt(result.draggableId, 10);
    
    if (sourceStatus === destStatus && result.source.index === result.destination.index) return;

    const sourceTasks = tasks.filter(t => t.status === sourceStatus).sort((a,b) => a.order - b.order);
    const destTasks = sourceStatus === destStatus ? sourceTasks : tasks.filter(t => t.status === destStatus).sort((a,b) => a.order - b.order);
    
    const [movedTask] = sourceTasks.splice(result.source.index, 1);
    movedTask.status = destStatus;
    destTasks.splice(result.destination.index, 0, movedTask);
    
    const updates = destTasks.map((t, index) => ({ ...t, order: index }));
    
    await db.transaction('rw', db.tasks, async () => {
      for (const t of updates) {
        await db.tasks.update(t.id, { status: t.status, order: t.order, updatedAt: Date.now() });
      }
    });
  };

  const openNewTask = () => {
    setEditingTask(undefined);
    setIsTaskModalOpen(true);
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const deleteTask = async (id: number) => {
    if (window.confirm("确定要删除这个任务吗？")) {
      await db.tasks.delete(id);
    }
  }

  const handlePostpone = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    if (!task.week) return;
    const nextWeek = getNextWeekStr(task.week);
    if (window.confirm(`确定要将该任务顺延至下一周吗？`)) {
      await db.tasks.update(task.id, { 
        week: nextWeek, 
        isPostponed: true, 
        updatedAt: Date.now() 
      });
      message.success("任务已成功顺延至下周");
    }
  };

  // Pre-sort tasks by column
  const getTasksByStatus = (statusId: string) => {
    return (tasks || []).filter(t => t.status === statusId).sort((a, b) => a.order - b.order);
  };

  const COL_STYLES: Record<string, any> = {
    new: { dot: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-100/50', border: 'border-slate-400', badgeBd: 'bg-slate-200', badgeTxt: 'text-slate-500' },
    in_progress: { dot: 'bg-blue-500', text: 'text-blue-600', bg: 'bg-blue-50/30', border: 'border-blue-300', badgeBd: 'bg-blue-100', badgeTxt: 'text-blue-600' },
    completed: { dot: 'bg-green-500', text: 'text-green-600', bg: 'bg-green-50/30', border: 'border-green-300', badgeBd: 'bg-green-100', badgeTxt: 'text-green-600', cardOpacity: 'opacity-75', textDecoration: 'line-through opacity-50' },
    deployed: { dot: 'bg-indigo-600', text: 'text-indigo-600', bg: 'bg-indigo-50/30', border: 'border-indigo-300', badgeBd: 'bg-indigo-100', badgeTxt: 'text-indigo-600' },
  };

  return (
    <Layout backTo="/" type={type} activeWeek={activeWeek}>
      <div className="flex flex-col h-full space-y-6 overflow-hidden">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300 shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3 mr-2">
                <span className={`w-3 h-8 rounded-full ${info.bg}`}></span>
                {info.label}
              </div>
              <Select 
                value={activeWeek}
                onChange={setActiveWeek}
                options={getWeekOptions()}
                className="w-[260px] h-10"
                popupMatchSelectWidth={false}
              />
            </h1>
          </div>
          <div className="flex items-center gap-3">
          </div>
        </header>

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4 flex-1 min-h-0">
            {columns.map(col => {
              const colStyle = COL_STYLES[col.id] || COL_STYLES.new;
              return (
              <div key={col.id} className="w-[240px] shrink-0 flex flex-col gap-4 h-full">
                <div className="flex items-center gap-2 px-1 shrink-0">
                  <div className={`w-2 h-2 rounded-full ${colStyle.dot}`}></div>
                  <h5 className={`font-bold text-xs uppercase tracking-widest ${colStyle.text}`}>{col.label}</h5>
                  <span className={`${colStyle.badgeBd} ${colStyle.badgeTxt} text-[10px] px-1.5 py-0.5 rounded font-bold`}>
                    {getTasksByStatus(col.id).length}
                  </span>
                </div>
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 rounded-2xl p-2 border-2 border-dashed space-y-3 overflow-y-auto ${colStyle.bg} ${colStyle.border} ${snapshot.isDraggingOver ? 'ring-2 ring-indigo-500/20' : ''}`}
                    >
                      {col.id === 'new' && (
                        <button 
                          onClick={openNewTask}
                          className="w-full group relative flex flex-col items-center justify-center py-4 bg-white/40 border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-white rounded-xl transition-all duration-200 cursor-pointer"
                        >
                          <div className="bg-slate-200 group-hover:bg-blue-100 text-slate-500 group-hover:text-blue-600 p-2 rounded-full transition-colors mb-2">
                            <Plus className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold text-slate-500 group-hover:text-blue-600 transition-colors">添加新任务</span>
                        </button>
                      )}
                      {getTasksByStatus(col.id).map((task, index) => (
                        <Draggable key={task.id.toString()} draggableId={task.id.toString()} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 group relative transition-all duration-200 cursor-grab active:cursor-grabbing ${snapshot.isDragging ? 'shadow-xl ring-2 ring-blue-500/30 rotate-1 z-50 scale-[1.01] !bg-white' : 'hover:shadow-md hover:-translate-y-0.5'} ${colStyle.cardOpacity || ''}`}
                            >
                              <div className="flex justify-between items-start mb-2.5">
                                <div className="flex items-center gap-1.5 overflow-hidden mr-2">
                                  {task.isPostponed && (
                                    <Tooltip title="上一周顺延下来的任务">
                                      <span className="text-[9px] px-1.5 py-0.5 bg-amber-50 text-amber-600 font-bold rounded border border-amber-100 flex items-center gap-0.5 shrink-0">
                                        <AlertCircle className="w-2.5 h-2.5" /> 顺延
                                      </span>
                                    </Tooltip>
                                  )}
                                  {task.moduleId ? (
                                    <span className="text-[10px] px-2 py-0.5 bg-indigo-50/70 text-indigo-700 font-bold rounded border border-indigo-100/60 uppercase tracking-wide truncate max-w-[90px]">
                                      {modules.find(m => m.id === task.moduleId)?.name || '未知模块'}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] px-2 py-0.5 bg-slate-50 text-slate-400 font-bold rounded border border-slate-100 uppercase tracking-wide">
                                      #{task.id}
                                    </span>
                                  )}
                                </div>

                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 -mr-1 -mt-1 bg-white/80 backdrop-blur pl-1 rounded-bl-lg">
                                  <button 
                                    onClick={(e) => handlePostpone(e, task)} 
                                    className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                    title="顺延到下周"
                                  >
                                    <FastForward className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); openEditTask(task); }} 
                                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="编辑"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} 
                                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="删除"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              
                              <p className={`text-[13.5px] font-medium text-slate-700 leading-relaxed break-words ${colStyle.textDecoration || ''}`}>
                                {task.description}
                              </p>
                              
                              <div className="mt-3 pt-2.5 border-t border-slate-50 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 truncate min-w-0">
                                  {task.type === 'dep' && task.dependedName ? (
                                    <Tooltip title={`负责人: ${task.dependedName}`}>
                                      <div className="text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded px-1.5 py-0.5 flex items-center gap-1 shadow-sm shrink-0">
                                        <User size={11} className="opacity-70" />
                                        <span>{task.dependedName}</span>
                                      </div>
                                    </Tooltip>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 truncate max-w-[80px] leading-none flex items-center gap-1">
                                      <span className="opacity-50 font-mono">@</span>{task.source || '无来源'}
                                    </span>
                                  )}
                                  {task.image && (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setPreviewImage(task.image || null); }}
                                      className="flex items-center gap-0.5 px-1.5 py-0.5 bg-sky-50 hover:bg-sky-100 text-sky-600 border border-sky-100/50 rounded-[4px] transition-colors cursor-pointer"
                                      title="查看附图"
                                    >
                                      <ImageIcon className="w-2.5 h-2.5" />
                                      <span className="text-[9px] font-bold leading-none">附图</span>
                                    </button>
                                  )}
                                </div>
                                {task.week && (
                                  <span className="text-[9px] font-bold text-slate-500 bg-slate-100/50 px-1.5 py-0.5 rounded border border-slate-200/50 shadow-sm whitespace-nowrap shrink-0">
                                    {formatWeekRange(task.week)}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            )})}
          </div>
        </DragDropContext>
      </div>

      <TaskModal 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)} 
        type={type} 
        task={editingTask} 
        defaultWeek={activeWeek}
      />

      <div style={{ display: 'none' }}>
        <Image
          src={previewImage || ''}
          preview={{
            visible: !!previewImage,
            onVisibleChange: (visible) => !visible && setPreviewImage(null),
          }}
        />
      </div>
    </Layout>
  );
}
