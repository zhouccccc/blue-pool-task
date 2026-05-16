import * as React from "react";
import { createRoot } from "react-dom/client";
import { cn } from "@/lib/utils";
import { AlertTriangle, Info } from "lucide-react";

interface ConfirmOptions {
  title: string;
  content: React.ReactNode;
  okText?: string;
  cancelText?: string;
  /** "danger" renders the confirm button in red, "warning" in amber, default is blue */
  variant?: "default" | "danger" | "warning";
  onOk?: () => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
}

// ── Internal dialog component ────────────────────────────────────────────────

interface DialogProps extends ConfirmOptions {
  onClose: () => void;
}

function ConfirmDialog({
  title,
  content,
  okText = "确认",
  cancelText = "取消",
  variant = "default",
  onOk,
  onCancel,
  onClose,
}: DialogProps) {
  const [loading, setLoading] = React.useState(false);

  const handleOk = async () => {
    setLoading(true);
    try {
      await onOk?.();
    } finally {
      setLoading(false);
      onClose();
    }
  };

  const handleCancel = async () => {
    await onCancel?.();
    onClose();
  };

  const okCls = {
    default: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200",
    danger:  "bg-red-500 hover:bg-red-600 text-white shadow-sm shadow-red-200",
    warning: "bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-200",
  }[variant];

  const iconEl =
    variant === "danger" ? (
      <div className="w-9 h-9 rounded-full bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
        <AlertTriangle size={17} className="text-red-500" />
      </div>
    ) : variant === "warning" ? (
      <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
        <AlertTriangle size={17} className="text-amber-500" />
      </div>
    ) : (
      <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
        <Info size={17} className="text-blue-500" />
      </div>
    );

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.45)" }}
    >
      {/* Card */}
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Body */}
        <div className="px-6 pt-6 pb-5 flex gap-4">
          {iconEl}
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-[15px] font-semibold text-slate-800 leading-snug mb-1.5">
              {title}
            </p>
            <div className="text-sm text-slate-500 leading-relaxed">{content}</div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex justify-end gap-2">
          <button
            onClick={handleCancel}
            disabled={loading}
            className="h-9 px-4 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={handleOk}
            disabled={loading}
            className={cn(
              "h-9 px-4 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 flex items-center gap-1.5",
              okCls
            )}
          >
            {loading && (
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            )}
            {okText}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Imperative API ───────────────────────────────────────────────────────────

function mountConfirm(options: ConfirmOptions) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  const destroy = () => {
    root.unmount();
    container.remove();
  };

  root.render(<ConfirmDialog {...options} onClose={destroy} />);
}

export const confirm = (options: ConfirmOptions) => mountConfirm(options);

// Convenience shorthands
confirm.danger  = (options: Omit<ConfirmOptions, "variant">) => mountConfirm({ ...options, variant: "danger" });
confirm.warning = (options: Omit<ConfirmOptions, "variant">) => mountConfirm({ ...options, variant: "warning" });
