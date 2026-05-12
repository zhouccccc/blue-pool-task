import Dexie, { type EntityTable } from 'dexie';

export type TaskType = 'dev' | 'dep' | 'bug';

export interface Module {
  id: number;
  name: string;
  order: number;
  createdAt: number;
}

export interface Member {
  id: number;
  name: string;
  createdAt: number;
}

export interface Task {
  id: number;
  type: TaskType;
  moduleId?: number;
  description: string;
  source: string;
  image?: string; // Base64 string
  week?: string; 
  status: string;
  order: number;
  isPostponed?: boolean;
  dependentName?: string;
  dependedName?: string;
  createdAt: number;
  updatedAt: number;
}

const db = new Dexie('TaskManagementDB') as Dexie & {
  modules: EntityTable<Module, 'id'>;
  members: EntityTable<Member, 'id'>;
  tasks: EntityTable<Task, 'id'>;
};

// Schema declaration
db.version(3).stores({
  modules: '++id, name, createdAt',
  members: '++id, name, createdAt',
  tasks: '++id, type, week, moduleId, status, order, createdAt',
});

db.version(4).stores({
  modules: '++id, name, order, createdAt',
}).upgrade(async tx => {
  // Safe fall-through for legacy modules missing order
  const modules = await tx.table('modules').toArray();
  for (let i = 0; i < modules.length; i++) {
    await tx.table('modules').update(modules[i].id, { order: i });
  }
});

export default db;
