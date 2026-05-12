import * as React from "react";
import db, { TaskType, Task, Module } from "../db";
import { Modal } from "./ui/modal";
import { Input, Textarea } from "./ui/forms";
import { Select } from "antd";
import { Button } from "./ui/button";
import { STATUS_MAP } from "../constants";
import { useLiveQuery } from "dexie-react-hooks";
import { Image as ImageIcon, X } from "lucide-react";
import { WeekPicker } from "./ui/WeekPicker";

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

  const modules = useLiveQuery(() => db.modules.toArray(), []) || [];
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
      } else {
        setDescription("");
        setSource("");
        setImage("");
        setModuleId("");
        setWeek(defaultWeek || "");
        setStatus(STATUS_MAP[type][0].id);
        setDependentName("");
        setDependedName("");
      }
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
