import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db, { Task, TaskType } from "../db";
import { Modal } from "./ui/modal";
import { Button } from "./ui/button";
import { Copy, Download, Check } from "lucide-react";
import { message } from "antd";
import { getWeekDateRange, formatWeekRange } from "../lib/utils";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
} from "docx";

interface WeekPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  week: string;
}

const TYPE_LABEL: Record<TaskType, string> = {
  dev: "开发任务",
  dep: "依赖任务",
  bug: "Bug 修复",
};

const STATUS_LABEL: Record<string, string> = {
  new: "新建",
  in_progress: "进行中",
};

interface PlanSection {
  type: TaskType;
  label: string;
  tasks: Task[];
}

function buildSections(tasks: Task[], week: string): PlanSection[] {
  const types: TaskType[] = ["dev", "dep", "bug"];
  return types
    .map((type) => ({
      type,
      label: TYPE_LABEL[type],
      tasks: tasks.filter(
        (t) =>
          t.type === type &&
          t.week === week &&
          (t.status === "new" || t.status === "in_progress")
      ),
    }))
    .filter((s) => s.tasks.length > 0);
}

/** Plain text representation for copy */
function buildPlainText(sections: PlanSection[], week: string): string {
  const dateRange = getWeekDateRange(week);
  const weekLabel = formatWeekRange(week);
  const lines: string[] = [
    `周任务计划 — ${weekLabel}（${dateRange}）`,
    "",
  ];

  sections.forEach((section, si) => {
    lines.push(`${si + 1}. ${section.label}`);
    section.tasks.forEach((task, ti) => {
      const statusLabel = STATUS_LABEL[task.status] ?? task.status;
      lines.push(`   ${ti + 1}. [${statusLabel}] ${task.description}`);

      // Pending subtasks only
      const pendingSubs = (task.subTasks ?? []).filter((s) => !s.done);
      pendingSubs.forEach((sub, si2) => {
        lines.push(`      ${si2 + 1}) ${sub.title}`);
      });
    });
    lines.push("");
  });

  return lines.join("\n").trimEnd();
}

/** Generate and download a .docx file */
async function downloadDocx(sections: PlanSection[], week: string) {
  const dateRange = getWeekDateRange(week);
  const weekLabel = formatWeekRange(week);

  const docChildren: Paragraph[] = [];

  // Title
  docChildren.push(
    new Paragraph({
      text: `周任务计划 — ${weekLabel}（${dateRange}）`,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
    })
  );

  sections.forEach((section, si) => {
    // Section heading
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${si + 1}. ${section.label}`,
            bold: true,
            size: 26,
          }),
        ],
        spacing: { before: 200, after: 100 },
      })
    );

    section.tasks.forEach((task, ti) => {
      const statusLabel = STATUS_LABEL[task.status] ?? task.status;

      // Task row
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${ti + 1}.  `, bold: true }),
            new TextRun({
              text: `[${statusLabel}]  `,
              color: task.status === "in_progress" ? "2563EB" : "64748B",
              bold: true,
            }),
            new TextRun({ text: task.description }),
          ],
          indent: { left: convertInchesToTwip(0.3) },
          spacing: { after: 60 },
        })
      );

      // Pending subtasks
      const pendingSubs = (task.subTasks ?? []).filter((s) => !s.done);
      pendingSubs.forEach((sub, si2) => {
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${si2 + 1})  ${sub.title}`, color: "475569" }),
            ],
            indent: { left: convertInchesToTwip(0.7) },
            spacing: { after: 40 },
          })
        );
      });
    });
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: docChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `周任务计划_${weekLabel}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ────────────────────────────────────────────────────────────────

export function WeekPlanModal({ isOpen, onClose, week }: WeekPlanModalProps) {
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) || [];
  const [copied, setCopied] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);

  const sections = React.useMemo(
    () => buildSections(tasks, week),
    [tasks, week]
  );
  const plainText = React.useMemo(
    () => buildPlainText(sections, week),
    [sections, week]
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      message.error("复制失败，请手动选择文本复制");
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadDocx(sections, week);
    } catch (err: any) {
      message.error("下载失败：" + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const weekLabel = formatWeekRange(week);
  const dateRange = getWeekDateRange(week);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`周任务计划 — ${weekLabel}（${dateRange}）`}
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCopy}
              className="gap-1.5 text-slate-600 border-slate-200"
            >
              {copied ? (
                <Check size={14} className="text-green-500" />
              ) : (
                <Copy size={14} />
              )}
              {copied ? "已复制" : "复制文本"}
            </Button>
            <Button
              onClick={handleDownload}
              disabled={downloading || sections.length === 0}
              className="gap-1.5"
            >
              <Download size={14} />
              {downloading ? "生成中…" : "下载 Word"}
            </Button>
          </div>
          <Button variant="ghost" onClick={onClose}>
            关闭
          </Button>
        </div>
      }
    >
      {sections.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          本周暂无新建或进行中的任务
        </div>
      ) : (
        <div className="space-y-5">
          {sections.map((section, si) => (
            <div key={section.type}>
              {/* Section header */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  {si + 1}.
                </span>
                <h3 className="text-sm font-bold text-slate-700">
                  {section.label}
                </h3>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">
                  {section.tasks.length}
                </span>
              </div>

              <div className="space-y-2 pl-4">
                {section.tasks.map((task, ti) => {
                  const statusLabel = STATUS_LABEL[task.status] ?? task.status;
                  const pendingSubs = (task.subTasks ?? []).filter(
                    (s) => !s.done
                  );
                  return (
                    <div
                      key={task.id}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-[11px] text-slate-400 font-mono shrink-0 mt-0.5">
                          {ti + 1}.
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 mt-0.5 ${
                            task.status === "in_progress"
                              ? "bg-blue-50 text-blue-600 border-blue-200"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}
                        >
                          {statusLabel}
                        </span>
                        <p className="text-[13px] text-slate-700 leading-snug flex-1">
                          {task.description}
                        </p>
                      </div>

                      {pendingSubs.length > 0 && (
                        <div className="mt-2 pl-6 space-y-1">
                          {pendingSubs.map((sub, si2) => (
                            <div
                              key={sub.id}
                              className="flex items-center gap-1.5 text-[11px] text-slate-500"
                            >
                              <span className="text-slate-300 font-mono">
                                {si2 + 1})
                              </span>
                              <span>{sub.title}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Plain text preview for easy copy */}
          <details className="mt-4">
            <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 select-none">
              查看纯文本（可手动选择复制）
            </summary>
            <pre className="mt-2 text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3 whitespace-pre-wrap leading-relaxed font-mono overflow-x-auto">
              {plainText}
            </pre>
          </details>
        </div>
      )}
    </Modal>
  );
}
