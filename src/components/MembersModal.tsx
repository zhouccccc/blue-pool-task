import * as React from "react";
import db, { Member } from "../db";
import { Modal } from "./ui/modal";
import { Input } from "./ui/forms";
import { Button } from "./ui/button";
import { useLiveQuery } from "dexie-react-hooks";
import { Trash2, Edit2, Plus, Users } from "lucide-react";
import { Modal as AntModal } from "antd";

export function MembersModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [newMemberName, setNewMemberName] = React.useState("");
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [editingName, setEditingName] = React.useState("");
  
  const members = useLiveQuery(() => db.members.toArray(), []) || [];

  const handleAdd = async () => {
    if (!newMemberName.trim()) return;
    // Avoid duplicates and reserved '我'
    if (newMemberName.trim() === "我") {
      alert("系统已默认包含 '我'，无需重复添加。");
      return;
    }
    
    const exists = members.some(m => m.name === newMemberName.trim());
    if (exists) {
      alert("人员已存在。");
      return;
    }

    await db.members.add({
      name: newMemberName.trim(),
      createdAt: Date.now()
    });
    setNewMemberName("");
  };

  const handleDelete = async (id: number) => {
    AntModal.confirm({
      title: '删除人员',
      content: '确定要删除该人员吗？这不会删除历史任务中的记录，但该人将无法在下拉列表中选择。',
      okText: '确认删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      centered: true,
      onOk: async () => { await db.members.delete(id); },
    });
  };

  const handleSaveEdit = async () => {
    if (editingId && editingName.trim()) {
      if (editingName.trim() === "我") {
         alert("'我' 是系统默认项，不能将其他人修改为此名字。");
         return;
      }
      await db.members.update(editingId, { name: editingName.trim() });
      setEditingId(null);
      setEditingName("");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="全局人员管理"
      footer={<Button onClick={onClose}>完成</Button>}
    >
      <div className="space-y-6">
        <div className="flex gap-2">
          <Input 
            value={newMemberName} 
            onChange={e => setNewMemberName(e.target.value)} 
            placeholder="输入新成员姓名..." 
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <Button onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="w-4 h-4 mr-1" />
            添加
          </Button>
        </div>

        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-200 font-bold">
              我
            </div>
            <div className="flex-1">
               <div className="font-bold text-slate-900 text-sm">我 <span className="font-normal text-xs text-slate-400 ml-1">(当前使用者)</span></div>
               <div className="text-xs text-slate-500 leading-none mt-0.5">系统保留默认对象</div>
            </div>
        </div>

        <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 bg-white">
          {members.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm flex flex-col items-center gap-2">
              <Users size={24} className="opacity-40" />
              尚未添加其他团队人员
            </div>
          ) : (
            members.map(member => (
              <div key={member.id} className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors">
                {editingId === member.id ? (
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
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">
                         {member.name.substring(0,1).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-700">{member.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => {
                          setEditingId(member.id);
                          setEditingName(member.name);
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(member.id)}
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
