import { TaskType } from "./db";

export const STATUS_MAP = {
  dev: [
    { id: 'new', label: '新建' },
    { id: 'in_progress', label: '开发中' },
    { id: 'completed', label: '已完成' },
    { id: 'deployed', label: '已部署' },
  ],
  dep: [
    { id: 'new', label: '新建' },
    { id: 'in_progress', label: '处理中' },
    { id: 'completed', label: '已解决' },
  ],
  bug: [
    { id: 'new', label: '新建' },
    { id: 'in_progress', label: '修复中' },
    { id: 'completed', label: '已解决' },
  ],
};

export const TYPE_INFO = {
  dev: { 
    label: '开发', desc: '活跃开发模块与需求', index: '01', colorTheme: 'blue', bg: 'bg-blue-600', iconBg: 'bg-blue-500 border-blue-400', txt: 'text-blue-100', shadow: 'shadow-blue-100', circle: 'bg-blue-500 -right-4 -bottom-4 w-32 h-32', btn: 'bg-blue-600 hover:bg-blue-700 text-white',
    cardStyles: 'bg-white border-blue-200 shadow-sm hover:border-blue-400 hover:shadow-md'
  },
  dep: { 
    label: '依赖', desc: '前置或外部依赖事项', index: '02', colorTheme: 'indigo', bg: 'bg-indigo-500', iconBg: 'bg-indigo-400 border-indigo-300', txt: 'text-indigo-100', shadow: 'shadow-indigo-100', circle: 'bg-indigo-400 -right-2 top-0 w-24 h-24', btn: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    cardStyles: 'bg-white border-indigo-200 shadow-sm hover:border-indigo-400 hover:shadow-md'
  },
  bug: { 
    label: 'Bug修复', desc: '修复的问题与漏洞', index: '03', colorTheme: 'sky', bg: 'bg-sky-500', iconBg: 'bg-sky-400 border-sky-300', txt: 'text-sky-100', shadow: 'shadow-sky-100', circle: 'bg-sky-400 -left-6 top-10 w-20 h-20', btn: 'bg-sky-600 hover:bg-sky-700 text-white',
    cardStyles: 'bg-white border-sky-200 shadow-sm hover:border-sky-400 hover:shadow-md'
  },
};
