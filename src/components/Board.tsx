import * as React from "react";
import { useParams } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import db, { TaskType, Module, Task } from "../db";
import { STATUS_MAP, TYPE_INFO } from "../constants";
import { Layout } from "./Layout";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Plus, Edit2, Trash2, Image as ImageIcon, FastForward, AlertCircle, User, Clock, Eye } from "lucide-react";
import { Button } from "./ui/button";
import { TaskModal } from "./TaskModal";
import { Modal } from "./ui/modal";
import { Image, Select, Tooltip, message } from "antd";
import dayjs from "dayjs";
import { formatWeekRange, getCurrentWeekStr, getNextWeekStr, getWeekOptions, getWeekDateRange } from "../lib/utils";

export function Board() {
  const { type } = useParams<{ type: TaskType }>();
  const [activeWeek, setActiveWeek] = React.useState(getCurrentWeekStr());
  const [isTaskModalOpen, setIsTaskModalOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<Task | undefined>(undefined);
  const [previewImage, setPreviewImage] = React.useState<string | null>(null);
  const [viewingTask, setViewingTask] = React.useState<Task | null>(null);

  if (!type || !STATUS_MAP[type]) {
    return <Layout><div className="flex items-center justify-center h-[50vh]">未知或者不支持的任务类型</div></Layout>;
  }

  const columns = STATUS_MAP[type];
  const info = TYPE_INFO[type];

  const tasks = useLiveQuery(
    () => db.tasks.where({ type }).filter(t => t.week === activeWeek).toArray(),
    [type, activeWeek]
  );
  
  const modules = useLiveQuery(async () => {
    const res = await db.modules.toArray();
    return res.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, []) || [];

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

  const handlePostpone = async (task: Task, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!task.week) return;
    const nextWeek = getNextWeekStr(task.week);
    if (window.confirm(`确定要将该任务顺延至下一周吗？`)) {
      await db.tasks.update(task.id, { 
        week: nextWeek, 
        isPostponed: true, 
        updatedAt: Date.now() 
      });
      message.success("任务已成功顺延至下周");
      if (viewingTask?.id === task.id) {
         setViewingTask(null); // Close detail view after action
      }
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
              <div key={col.id} className="w-[290px] shrink-0 flex flex-col gap-4 h-full">
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
                      {getTasksByStatus(col.id).map((task, index) => {
                        const isDepMe = task.type === 'dep' && task.dependedName === '我';
                        return (
                          <Draggable key={task.id.toString()} draggableId={task.id.toString()} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`p-3.5 rounded-xl shadow-sm border group relative transition-all duration-200 cursor-grab active:cursor-grabbing 
                                  ${snapshot.isDragging ? 'shadow-xl ring-2 ring-blue-500/30 rotate-1 z-50 scale-[1.01] !bg-white border-blue-200' 
                                  : isDepMe ? 'bg-amber-50/40 border-amber-300 shadow-amber-200/20 hover:shadow-md hover:-translate-y-0.5 hover:border-amber-400' 
                                  : 'bg-white border-slate-200 hover:shadow-md hover:-translate-y-0.5'} 
                                  ${colStyle.cardOpacity || ''}`}
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
                                    onClick={(e) => { e.stopPropagation(); setViewingTask(task); }} 
                                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="查看详情"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
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
                                    {(() => {
                                      const personName = task.type === 'dep' ? task.dependedName : task.source;
                                      const personLabel = task.type === 'dep' ? '负责人' : '来源';
                                      const isMe = personName === '我';
                                      if (!personName) return null;

                                      // Highlight badge ONLY if it matches the strict card-highlight condition (e.g. Depended on Me)
                                      const isHighlighted = isDepMe && isMe;

                                      return (
                                        <Tooltip title={`${personLabel}: ${personName}`}>
                                          <div className={`text-[10px] font-bold border rounded px-1.5 py-0.5 flex items-center gap-1 shadow-sm shrink-0 ${
                                            isHighlighted ? 'bg-amber-500 text-white border-amber-600' : 'bg-indigo-100 text-indigo-700 border-indigo-200/80'
                                          }`}>
                                            <User size={11} className={isHighlighted ? 'text-amber-50' : 'opacity-70'} />
                                            <span className="font-bold">{personName}</span>
                                          </div>
                                        </Tooltip>
                                      );
                                    })()}
                                  


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
                                <span className="text-[9px] text-slate-400 whitespace-nowrap shrink-0 font-mono leading-none">
                                  {task.createdAt ? dayjs(task.createdAt).format('MM/DD HH:mm:ss') : '-'}
                                </span>
                              </div>
                            </div>
                          )}
                        </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            )})}
          </div>
        </DragDropContext>
      </div>

      {/* 任务详情弹窗 */}
      <Modal
        isOpen={!!viewingTask}
        onClose={() => setViewingTask(null)}
        title="任务详情"
        footer={
          <div className="flex justify-between w-full items-center">
            {viewingTask?.week ? (
              <Button 
                variant="outline" 
                className="text-amber-600 border-amber-200 hover:bg-amber-50 font-semibold"
                onClick={() => handlePostpone(viewingTask!)}
              >
                顺延到下周
              </Button>
            ) : <div></div>}
            <Button onClick={() => setViewingTask(null)}>关闭</Button>
          </div>
        }
      >
        {viewingTask && (() => {
          const mName = modules.find(m => m.id === viewingTask.moduleId)?.name || '未分配';
          const sLabel = columns.find(c => c.id === viewingTask.status)?.label || '未知';
          
          // Function to render a uniform row
          const InfoRow = ({ label, children, highlight = false }: { label: string, children: React.ReactNode, highlight?: boolean }) => (
            <div className="grid grid-cols-[120px_1fr] items-start group border-b border-slate-100 last:border-0">
              <div className="bg-slate-50/60 p-3 text-sm font-bold text-slate-500 flex items-center h-full border-r border-slate-100">
                {label}
              </div>
              <div className={`p-3 text-sm ${highlight ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                {children}
              </div>
            </div>
          );

          return (
            <div className="space-y-6 py-1">
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <InfoRow label="任务描述" highlight>
                   <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800 py-1">{viewingTask.description}</div>
                </InfoRow>
                
                <InfoRow label="归属自然周">
                  {viewingTask.week ? formatWeekRange(viewingTask.week) : '-'}
                </InfoRow>

                <InfoRow label="日期范围">
                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 text-xs font-bold">
                    {viewingTask.week ? getWeekDateRange(viewingTask.week) : '-'}
                  </span>
                </InfoRow>

                <InfoRow label="归属模块">
                  <span className="inline-flex items-center bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 text-xs font-bold">
                    {mName}
                  </span>
                </InfoRow>

                <InfoRow label="当前状态">
                  <span className="inline-flex items-center bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 text-xs font-bold">
                    {sLabel}
                  </span>
                </InfoRow>

                {viewingTask.type === 'dep' ? (
                  <>
                    <InfoRow label="依赖方 (谁依赖)">{viewingTask.dependentName || '-'}</InfoRow>
                    <InfoRow label="承接方 (被依赖)">
                       <div className="flex items-center gap-1.5 font-bold text-indigo-700">
                         <User size={14} />
                         {viewingTask.dependedName || '-'}
                       </div>
                    </InfoRow>
                  </>
                ) : (
                  <InfoRow label="来源">{viewingTask.source || '-'}</InfoRow>
                )}

                <InfoRow label="创建时间">
                   <div className="flex items-center gap-1.5 font-mono text-slate-500">
                     <Clock size={13} className="opacity-70" />
                     {viewingTask.createdAt ? dayjs(viewingTask.createdAt).format('MM/DD HH:mm:ss') : '-'}
                   </div>
                </InfoRow>

                <InfoRow label="最近更新">
                   <div className="flex items-center gap-1.5 font-mono text-slate-500">
                     <Clock size={13} className="opacity-70" />
                     {viewingTask.updatedAt ? dayjs(viewingTask.updatedAt).format('MM/DD HH:mm:ss') : '-'}
                   </div>
                </InfoRow>
              </div>

              {viewingTask.image && (
                <div className="pt-2 space-y-2">
                   <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">任务附图</div>
                   <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                      <Image src={viewingTask.image} className="w-full h-auto object-contain max-h-[320px]" />
                   </div>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

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
