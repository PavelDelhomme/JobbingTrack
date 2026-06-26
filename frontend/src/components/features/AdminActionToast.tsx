"use client";

import { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, Info } from "lucide-react";
import {
  ADMIN_ACTION_FEEDBACK_EVENT,
  type AdminActionFeedbackDetail,
  type AdminActionFeedbackType,
} from "@/lib/adminActionFeedback";

type ToastState = AdminActionFeedbackDetail & { id: number };

const styles: Record<AdminActionFeedbackType, string> = {
  success:
    "bg-green-600 text-white border-green-700 dark:bg-green-700 dark:border-green-600",
  error: "bg-red-600 text-white border-red-700 dark:bg-red-700 dark:border-red-600",
  info: "bg-blue-600 text-white border-blue-700 dark:bg-blue-700 dark:border-blue-600",
};

export function AdminActionToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const onFeedback = (event: Event) => {
      const detail = (event as CustomEvent<AdminActionFeedbackDetail>).detail;
      if (!detail?.message) return;
      setToast({
        id: Date.now(),
        message: detail.message,
        type: detail.type || "success",
      });
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setToast(null), 4500);
    };

    window.addEventListener(ADMIN_ACTION_FEEDBACK_EVENT, onFeedback);
    return () => {
      window.removeEventListener(ADMIN_ACTION_FEEDBACK_EVENT, onFeedback);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!toast) return null;

  const type = toast.type || "success";
  const Icon = type === "error" ? AlertCircle : type === "info" ? Info : CheckCircle;

  return (
    <div
      className="fixed bottom-6 left-1/2 z-[9999] -translate-x-1/2 px-4 w-full max-w-lg pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div
        className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${styles[type]}`}
      >
        <Icon className="h-5 w-5 shrink-0 mt-0.5" />
        <p className="text-sm font-medium leading-snug">{toast.message}</p>
      </div>
    </div>
  );
}
