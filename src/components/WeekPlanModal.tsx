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
  NumberFormat,
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

interface PlanTask {
  description: string;
  pendingSubs: string[];
}

interface PlanSection {
  type: TaskType;
  label: string;
  tasks: PlanTask[];
}

function buildSections(tasks: Task[], week: string): PlanSection[] {
  const types: TaskType[] = ["dev", "dep", "bug"];
  return types
    .map((type) => ({
      type,
      label: TYPE_LABEL[type],
      tasks: tasks
        .filter(
          (t) =>
            t.type === type &&
            t.week === week &&
            (t.status === "new" || t.status === "in_progress")
        )
        .map((t) => ({
          description: t.description,
          pendingSubs: (t.subTasks ?? []).filter((s) => !s.done).map((s) => s.title),
        })),
    }))
    .filter((s) => s.tasks.length > 0);
}

// ── Plain text (for clipboard) ───────────────────────────────────────────────
// Mirrors the visual hierarchy: section title → numbered tasks → indented subtasks

function buildPlainText(sections: PlanSection[], week: string): string {
  const dateRange = getWeekDateRange(week);
  const weekLabel = formatWeekRange(week);
  const lines: string[] = [`周任务计划 — ${weekLabel}（${dateRange}）`, ""];

  sections.forEach((section) => {
    lines.push(section.label);
    section.tasks.forEach((task, ti) => {
      lines.push(`${ti + 1}. ${task.description}`);
      task.pendingSubs.forEach((sub, subi) => {
        lines.push(`    ${subi + 1}) ${sub}`);
      });
    });
    lines.push("");
  });

  return lines.join("\n").trimEnd();
}

// ── Word document ────────────────────────────────────────────────────────────
// Each section gets its own numbering reference so task numbers restart at 1.
// Subtasks use a nested level (1) within the same reference.

async function downloadDocx(sections: PlanSection[], week: string) {
  const dateRange = getWeekDateRange(week);
  const weekLabel = formatWeekRange(week);

  // Build one numbering config entry per section so counters restart
  const numberingConfig = sections.map((_, i) => ({
    reference: `list-${i}`,
    levels: [
      {
        level: 0,
        numberFormat: NumberFormat.DECIMAL,
        text: "%1.",
        alignment: AlignmentType.LEFT,
        style: {
          paragraph: {
            indent: {
              left: convertInchesToTwip(0.5),
              hanging: convertInchesToTwip(0.25),
            },
          },
        },
      },
      {
        level: 1,
        numberFormat: NumberFormat.DECIMAL,
        text: "%2)",
        alignment: AlignmentType.LEFT,
        style: {
          run: { color: "64748B" },
          paragraph: {
            indent: {
              left: convertInchesToTwip(1.0),
              hanging: convertInchesToTwip(0.25),
            },
          },
        },
      },
    ],
  }));

  const children: Paragraph[] = [
    new Paragraph({
      text: `周任务计划 — ${weekLabel}（${dateRange}）`,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }),
  ];

  sections.forEach((section, si) => {
    // Section heading — no number prefix
    children.push(
      new Paragraph({
        children: [new TextRun({ text: section.label, bold: true, size: 26 })],
        spacing: { before: 240, after: 120 },
      })
    );

    section.tasks.forEach((task) => {
      // Numbered task (level 0)
      children.push(
        new Paragraph({
          children: [new TextRun({ text: task.description })],
          numbering: { reference: `list-${si}`, level: 0 },
          spacing: { after: 80 },
        })
      );

      // Numbered subtasks (level 1) — counter resets per task via restart
      task.pendingSubs.forEach((sub) => {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: sub, color: "64748B" })],
            numbering: { reference: `list-${si}`, level: 1 },
            spacing: { after: 40 },
          })
        );
      });
    });
  });

  const doc = new Document({
    numbering: { config: numberingConfig },
    sections: [{ properties: {}, children }],
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

  const sections = React.useMemo(() => buildSections(tasks, week), [tasks, week]);
  const plainText = React.useMemo(() => buildPlainText(sections, week), [sections, week]);

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
              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
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
          <Button variant="ghost" onClick={onClose}>关闭</Button>
        </div>
      }
    >
      {sections.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          本周暂无新建或进行中的任务
        </div>
      ) : (
        <div className="space-y-6 py-1">
          {sections.map((section) => (
            <div key={section.type}>
              {/* Section title — bold, no number */}
              <h3 className="text-[13px] font-bold text-slate-800 mb-2.5">
                {section.label}
              </h3>

              {/* Numbered task list */}
              <ol className="space-y-2 list-decimal list-outside pl-5">
                {section.tasks.map((task, ti) => (
                  <li key={ti} className="text-[13px] text-slate-700 leading-snug pl-1">
                    {task.description}

                    {/* Numbered subtask list */}
                    {task.pendingSubs.length > 0 && (
                      <ol className="mt-1.5 space-y-1 list-decimal list-outside pl-5">
                        {task.pendingSubs.map((sub, subi) => (
                          <li
                            key={subi}
                            className="text-[11px] text-slate-500 leading-snug pl-0.5"
                          >
                            {sub}
                          </li>
                        ))}
                      </ol>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
