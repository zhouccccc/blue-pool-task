import * as React from "react";
import db, { TaskType, Task, Module, SubTask } from "../db";
import { Modal } from "./ui/modal";
import { Input, Textarea } from "./ui/forms";
import { Select } from "antd";
import { Button } from "./ui/button";
import { STATUS_MAP } from "../constants";
import { useLiveQuery } from "dexie-react-hooks";
import { Image as ImageIcon, X, Trash2, GripVertical } from "lucide-react";
import { WeekPicker } from "./ui/WeekPicker";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: TaskType;
  task?: Task;
  defaultWeek?: string;
  isPool?: boolean;
}

export function TaskModal({ isOpen, onClose, type, task, defaultWeek, isPool }: TaskModalProps) {
  const [description, setDescription] = React.useState("");
  const [source, setSource] = React.useState("");
  const [image, setImage] = React.useState("");
  const [moduleId, setModuleId] = React.useState("");
  const [week, setWeek] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [dependentName, setDependentName] = React.useState("");
  const [dependedName, setDependedName] = React.useState("");
  const [subTasks, setSubTasks] = React.useState<SubTask[]>([]);
  const [newSubTaskTitle, setNewSubTaskTitle] = React.useState("");

  const modules = useLiveQuery(async () => {
    const res = await db.modules.toArray();
    return res.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, []) || [];
  const members = useLiveQuery(() => db.members.toArray(), []) || [];

  // Injected immutable system persona + retrieved list
  const memberOptions = [
    { value: "我", label: "我" },
    ...members.map(m => ({ value: m.name, label: m.name }))
  ];

  React.useEffect(() => {
    if (isOpen) {
      if (task) {
        setDescription(task.description);
        setSource(task.source);
        setImage(task.image || "");
        setModuleId(task.moduleId ? String(task.moduleId) : "");
        const taskWeekStr = task.week ? String(task.week) : "";
        setWeek(taskWeekStr.includes('W') ? taskWeekStr : "");
        setStatus(task.status);
        setDependentName(task.dependentName || "");
        setDependedName(task.dependedName || "");
        setSubTasks(task.subTasks || []);
      } else {
        setDescription("");
        setSource("");
        setImage("");
        setModuleId("");
        setWeek(defaultWeek || "");
        setStatus(STATUS_MAP[type][0].id);
        setDependentName("");
        setDependedName("");
        setSubTasks([]);
      }
      setNewSubTaskTitle("");
    }
  }, [isOpen, task, type, defaultWeek]);

  React.useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
              setImage(reader.result as string);
            };
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("paste", handlePaste);
    };
  }, [isOpen]);

  const addSubTask = () => {
    const title = newSubTaskTitle.trim();
    if (!title) return;
    const newItem: SubTask = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title,
      done: false,
    };
    setSubTasks(prev => [...prev, newItem]);
    setNewSubTaskTitle("");
  };

  const removeSubTask = (id: string) => {
    setSubTasks(prev => prev.filter(s => s.id !== id));
  };

  const handleSubTaskDragEnd = (result: DropResult) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    setSubTasks(prev => {
      const next = [...prev];
      const [moved] = next.splice(result.source.index, 1);
      next.splice(result.destination!.index, 0, moved);
      return next;
    });
  };

  const handleSubTaskKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSubTask();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    // Mandatory Validations
    if (!description) return alert("请填写任务描述");
    if (!moduleId) return alert("请选择归属模块");
    
    if (type === 'dep') {
      if (!dependentName) return alert("请填写依赖方");
      if (!dependedName) return alert("请填写承接方");
    } else {
      if (!source) return alert("请填写来源");
    }

    // Only require week if NOT in pool context
    if (!isPool && !week) {
      return alert("请选择周数");
    }
    
    // For new tasks, calculate default order safely
    let order = 0;
    if (!task) {
        const allTasks = await db.tasks.toArray();
        const sameGroup = allTasks.filter(t => t.type === type && t.status === status);
        if (sameGroup.length > 0) {
            order = Math.max(...sameGroup.map(t => t.order)) + 1;
        }
    }

    const taskData: any = {
      type,
      description,
      source,
      image,
      status,
      updatedAt: Date.now()
    };
    
    if (!task) {
        taskData.createdAt = Date.now();
        taskData.order = order;
    }

    taskData.moduleId = moduleId ? parseInt(moduleId, 10) : undefined;
    taskData.week = week || undefined;

    if (type === 'dep') {
      taskData.dependentName = dependentName;
      taskData.dependedName = dependedName;
      taskData.source = dependentName; // Auto-map dependent as the source
    }

    // Only persist subTasks for dev type
    if (type === 'dev') {
      taskData.subTasks = subTasks.length > 0 ? subTasks : undefined;
    }

    if (task) {
      await db.tasks.update(task.id, taskData);
    } else {
      await db.tasks.add(taskData as Task);
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task ? "编辑任务" : "新建任务"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button onClick={handleSave}>保存</Button>
        </>
      }
    >
      <div className="space-y-4">
        {task && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">状态</label>
            <Select 
              value={status} 
              onChange={setStatus} 
              className="w-full h-10"
              options={STATUS_MAP[type].map(s => ({ value: s.id, label: s.label }))}
            />
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">描述 <span className="text-red-500">*</span></label>
          <Textarea 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            placeholder="任务详细描述..." 
            className="min-h-[100px]"
          />
        </div>

        {type !== 'dep' && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">来源 <span className="text-red-500">*</span></label>
            <Select 
              showSearch
              value={source || undefined} 
              onChange={setSource} 
              className="w-full h-10"
              placeholder="请选择或搜索人员" 
              options={memberOptions}
              optionFilterProp="label"
            />
          </div>
        )}

        {type === 'dep' && (
          <div className="grid grid-cols-2 gap-4 bg-indigo-50/30 p-3 rounded-lg border border-indigo-100/50">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-indigo-900">依赖方 (谁依赖) <span className="text-red-500">*</span></label>
              <Select 
                showSearch
                value={dependentName || undefined} 
                onChange={setDependentName} 
                className="w-full h-10"
                placeholder="选择需求提出方" 
                options={memberOptions}
                optionFilterProp="label"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-indigo-900">承接方 (被依赖) <span className="text-red-500">*</span></label>
              <Select 
                showSearch
                value={dependedName || undefined} 
                onChange={setDependedName} 
                className="w-full h-10"
                placeholder="选择交付执行人" 
                options={memberOptions}
                optionFilterProp="label"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">归属模块 <span className="text-red-500">*</span></label>
            <Select 
              value={moduleId || undefined} 
              onChange={setModuleId} 
              className="w-full h-10"
              placeholder="未选择"
              allowClear
              options={modules.map(m => ({ value: String(m.id), label: m.name }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">自然周 {!isPool && <span className="text-red-500">*</span>}</label>
            <WeekPicker 
              value={week} 
              onChange={setWeek} 
            />
          </div>
        </div>

        {/* SubTasks — only for dev type */}
        {type === 'dev' && (
          <div className="space-y-2 pt-1">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              子任务
              {subTasks.length > 0 && (
                <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 font-bold">
                  {subTasks.length}
                </span>
              )}
            </label>

            {subTasks.length > 0 && (
              <DragDropContext onDragEnd={handleSubTaskDragEnd}>
                <Droppable droppableId="subtask-list">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-1 max-h-[200px] overflow-y-auto pr-1"
                    >
                      {subTasks.map((st, idx) => (
                        <Draggable key={st.id} draggableId={st.id} index={idx}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`flex items-center gap-2 group bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 transition-shadow ${
                                snapshot.isDragging ? 'shadow-md border-blue-300 bg-white' : ''
                              }`}
                            >
                              {/* Drag handle */}
                              <div
                                {...provided.dragHandleProps}
                                className="shrink-0 cursor-grab active:cursor-grabbing text-slate-300 group-hover:text-slate-400 transition-colors"
                              >
                                <GripVertical size={13} />
                              </div>
                              <span className="flex-1 text-sm text-slate-700 select-none">{st.title}</span>
                              <button
                                type="button"
                                onClick={() => removeSubTask(st.id)}
                                className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-500 transition-all rounded shrink-0"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}

            <input
              type="text"
              value={newSubTaskTitle}
              onChange={e => setNewSubTaskTitle(e.target.value)}
              onKeyDown={handleSubTaskKeyDown}
              placeholder="输入子任务描述，回车添加..."
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white placeholder:text-slate-400"
            />
          </div>
        )}

        <div className="space-y-1.5 pt-2">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
            附件图片
            <span className="text-xs text-slate-400 font-normal">(Base64存储)</span>
          </label>
          {image ? (
            <div className="relative rounded-lg overflow-hidden border border-slate-200 group w-full h-40 bg-slate-50">
              <img src={image} alt="Preview" className="w-full h-full object-contain" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button variant="danger" size="sm" onClick={() => setImage("")}>移除图片</Button>
              </div>
            </div>
          ) : (
            <div className="relative border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-lg p-6 flex flex-col items-center justify-center text-slate-500 bg-slate-50 transition-colors cursor-pointer text-center">
              <ImageIcon className="w-8 h-8 mb-2 text-slate-400" />
              <span className="text-sm">点击选择图片或拖拽到此处</span>
              <span className="text-xs text-slate-400 mt-1">也可以直接使用 Ctrl+V 粘贴图片</span>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
