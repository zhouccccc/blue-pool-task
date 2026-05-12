import * as React from "react";
import db, { Module } from "../db";
import { Modal } from "./ui/modal";
import { Input } from "./ui/forms";
import { Button } from "./ui/button";
import { useLiveQuery } from "dexie-react-hooks";
import { Trash2, Edit2, Plus } from "lucide-react";

export function ModulesModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [newModuleName, setNewModuleName] = React.useState("");
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [editingName, setEditingName] = React.useState("");
  
  const modules = useLiveQuery(() => db.modules.toArray(), []) || [];

  const handleAdd = async () => {
    if (!newModuleName.trim()) return;
    await db.modules.add({
      name: newModuleName.trim(),
      createdAt: Date.now()
    });
    setNewModuleName("");
  };

  const handleDelete = async (id: number) => {
    // Check if module is used
    const inUse = await db.tasks.where({ moduleId: id }).count();
    if (inUse > 0) {
      alert(`无法删除：有 ${inUse} 个任务正在使用此模块。`);
      return;
    }
    if (window.confirm("确定要删除此模块吗？")) {
      await db.modules.delete(id);
    }
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

        <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 bg-white">
          {modules.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              还没有创建任何模块
            </div>
          ) : (
            modules.map(module => (
              <div key={module.id} className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors">
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
                    <span className="font-medium text-slate-700">{module.name}</span>
                    <div className="flex items-center gap-1">
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
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
