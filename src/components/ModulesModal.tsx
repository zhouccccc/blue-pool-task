import * as React from "react";
import db, { Module } from "../db";
import { Modal } from "./ui/modal";
import { Input } from "./ui/forms";
import { Button } from "./ui/button";
import { useLiveQuery } from "dexie-react-hooks";
import { Trash2, Edit2, Plus, GripVertical } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { confirm } from "./ui/confirm";

export function ModulesModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [newModuleName, setNewModuleName] = React.useState("");
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [editingName, setEditingName] = React.useState("");
  
  // Use JS-level sorting to avoid dependencies on IndexedDB index presence during upgrades
  const fetchedModules = useLiveQuery(async () => {
    const res = await db.modules.toArray();
    return res.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, []) || [];

  // Robust state management for DND interaction
  const [localModules, setLocalModules] = React.useState<Module[]>([]);

  // Sync external data to local state when it settles
  React.useEffect(() => {
    setLocalModules(fetchedModules);
  }, [fetchedModules]);

  const handleAdd = async () => {
    if (!newModuleName.trim()) return;
    // Reliable fallback max order
    const maxOrder = localModules.reduce((max, item) => Math.max(max, item.order ?? 0), -1);
    
    await db.modules.add({
      name: newModuleName.trim(),
      order: maxOrder + 1,
      createdAt: Date.now()
    });
    setNewModuleName("");
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;
    
    const items = Array.from(localModules);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // 1. IMMEDIATE OPTIMISTIC UPDATE (Crucial for DND to not revert)
    setLocalModules(items);
    
    // 2. PERSIST TO DB ASYNCHRONOUSLY
    try {
      await db.transaction('rw', db.modules, async () => {
        for (let i = 0; i < items.length; i++) {
           await db.modules.update(items[i].id, { order: i });
        }
      });
    } catch (err) {
      console.error("Failed to save module ordering:", err);
      // Fallback revert on error
      setLocalModules(fetchedModules);
    }
  };

  const handleDelete = async (id: number) => {
    const inUse = await db.tasks.where({ moduleId: id }).count();
    if (inUse > 0) {
      confirm.warning({
        title: '无法删除',
        content: `有 ${inUse} 个任务正在使用此模块，请先移除关联任务后再删除。`,
        okText: '知道了',
        cancelText: '关闭',
      });
      return;
    }
    confirm.danger({
      title: '删除模块',
      content: '确定要删除此模块吗？',
      okText: '确认删除',
      cancelText: '取消',
      onOk: async () => { await db.modules.delete(id); },
    });
  };

  const handleSaveEdit = async () => {
    if (editingId && editingName.trim()) {
      await db.modules.update(editingId, { name: editingName.trim() });
      setEditingId(null);
      setEditingName("");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="管理开发模块"
      footer={<Button onClick={onClose}>完成</Button>}
    >
      <div className="space-y-6">
        <div className="flex gap-2">
          <Input 
            value={newModuleName} 
            onChange={e => setNewModuleName(e.target.value)} 
            placeholder="输入新模块名称..." 
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-1" />
            添加
          </Button>
        </div>

        <div className="bg-white">
          {localModules.length === 0 ? (
            <div className="border border-slate-200 rounded-lg p-8 text-center text-slate-500 text-sm">
              还没有创建任何模块
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="modules-list">
                {(provided) => (
                  <div 
                    {...provided.droppableProps} 
                    ref={provided.innerRef}
                    className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100"
                  >
                    {localModules.map((module, index) => (
                      <Draggable key={module.id.toString()} draggableId={module.id.toString()} index={index}>
                        {(dragProvided, snapshot) => (
                          <div 
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            className={`flex items-center justify-between p-3 transition-colors ${snapshot.isDragging ? 'bg-blue-50 shadow-md' : 'hover:bg-slate-50 bg-white'}`}
                          >
                            {editingId === module.id ? (
                              <div className="flex flex-1 gap-2 mr-2">
                                <Input 
                                  value={editingName} 
                                  onChange={e => setEditingName(e.target.value)}
                                  className="h-8 text-sm"
                                  autoFocus
                                />
                                <Button size="sm" onClick={handleSaveEdit}>保存</Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>取消</Button>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <div {...dragProvided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors p-1">
                                    <GripVertical size={16} />
                                  </div>
                                  <span className="font-medium text-slate-700 truncate">{module.name}</span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0 ml-2">
                                  <button 
                                    onClick={() => {
                                      setEditingId(module.id);
                                      setEditingName(module.name);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleDelete(module.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </>
                            )}
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
        </div>
      </div>
    </Modal>
  );
}
