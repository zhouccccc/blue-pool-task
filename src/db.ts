import Dexie, { type EntityTable } from 'dexie';

export type TaskType = 'dev' | 'dep' | 'bug';

export interface SubTask {
  id: string;       // UUID-like unique id
  title: string;
  done: boolean;
}

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
  image?: string;    // Legacy single image (kept for backward compat)
  images?: string[]; // Multiple images (Base64)
  week?: string; 
  status: string;
  order: number;
  isPostponed?: boolean;
  isDemoable?: boolean;
  isUrgent?: boolean;
  dependentName?: string;
  dependedName?: string;
  subTasks?: SubTask[];
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

// Version 5: add subTasks field support (stored as JSON in IndexedDB, no schema change needed)
db.version(5).stores({
  modules: '++id, name, order, createdAt',
  members: '++id, name, createdAt',
  tasks: '++id, type, week, moduleId, status, order, createdAt',
});

// Version 6: add isDemoable field support (no schema change needed, stored as boolean)
db.version(6).stores({
  modules: '++id, name, order, createdAt',
  members: '++id, name, createdAt',
  tasks: '++id, type, week, moduleId, status, order, createdAt',
});

// Version 7: add isUrgent field support (no schema change needed, stored as boolean)
db.version(7).stores({
  modules: '++id, name, order, createdAt',
  members: '++id, name, createdAt',
  tasks: '++id, type, week, moduleId, status, order, createdAt',
});

// Version 8: add images[] field; migrate legacy image string to images array
db.version(8).stores({
  modules: '++id, name, order, createdAt',
  members: '++id, name, createdAt',
  tasks: '++id, type, week, moduleId, status, order, createdAt',
}).upgrade(async tx => {
  const tasks = await tx.table('tasks').toArray();
  for (const t of tasks) {
    if (t.image && !t.images) {
      await tx.table('tasks').update(t.id, { images: [t.image] });
    }
  }
});

export default db;
