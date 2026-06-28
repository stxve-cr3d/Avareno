import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, Bell, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { formatUiText } from "../../lib/uiText";

export type NotificationVariant = "success" | "info" | "warning" | "danger" | "neutral";

type NotificationBase = {
  variant?: NotificationVariant;
  title: string;
  description?: string;
  icon?: ReactNode;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
  dismissible?: boolean;
};

export type ToastNotification = NotificationBase & {
  duration?: number;
};

type ToastRecord = ToastNotification & {
  id: string;
  closing?: boolean;
};

type NotificationContextValue = {
  notify: (toast: ToastNotification) => string;
  dismiss: (id: string) => void;
};

type NotificationActionProps = {
  label?: string;
  to?: string;
  onAction?: () => void;
  secondary?: boolean;
};

type InlineNoticeProps = NotificationBase & {
  onDismiss?: () => void;
};

type SuggestionPanelProps = NotificationBase & {
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  onDismiss?: () => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);
const MAX_VISIBLE_TOASTS = 3;
const DEFAULT_TOAST_DURATION = 4200;
let toastIndex = 0;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }

    setToasts((current) => current.map((toast) => (toast.id === id ? { ...toast, closing: true } : toast)));
    const removeTimer = setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
      timers.current.delete(`remove-${id}`);
    }, 160);
    timers.current.set(`remove-${id}`, removeTimer);
  }, []);

  const notify = useCallback((toast: ToastNotification) => {
    const id = `av-toast-${Date.now()}-${toastIndex++}`;
    const nextToast: ToastRecord = {
      variant: "neutral",
      dismissible: true,
      ...toast,
      id
    };

    setToasts((current) => [nextToast, ...current].slice(0, MAX_VISIBLE_TOASTS));

    if (toast.duration !== 0) {
      const timer = setTimeout(() => dismiss(id), toast.duration ?? DEFAULT_TOAST_DURATION);
      timers.current.set(id, timer);
    }

    return id;
  }, [dismiss]);

  useEffect(() => {
    return () => {
      timers.current.forEach((timer) => clearTimeout(timer));
      timers.current.clear();
    };
  }, []);

  const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="av-toast-region" aria-live="polite" aria-relevant="additions text">
        {toasts.map((toast) => (
          <AppToast key={toast.id} toast={toast} onClose={() => dismiss(toast.id)} />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used inside NotificationProvider");
  }
  return context;
}

export function AppToast({ toast, onClose }: { toast: ToastRecord; onClose: () => void }) {
  const variant = toast.variant ?? "neutral";

  return (
    <article className="av-toast-card" data-state={toast.closing ? "closing" : "open"} data-variant={variant} role={variant === "danger" ? "alert" : "status"}>
      <NotificationIcon icon={toast.icon} variant={variant} />
      <div className="av-notification-copy">
        <strong>{formatUiText(toast.title)}</strong>
        {toast.description ? <p>{formatUiText(toast.description)}</p> : null}
        <NotificationAction label={toast.actionLabel} onAction={toast.onAction} to={toast.actionTo} />
      </div>
      {toast.dismissible !== false ? <NotificationCloseButton onClick={onClose} /> : null}
    </article>
  );
}

export function InlineNotice({
  actionLabel,
  actionTo,
  description,
  dismissible = false,
  icon,
  onAction,
  onDismiss,
  title,
  variant = "neutral"
}: InlineNoticeProps) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  return (
    <div className="av-inline-notice" data-variant={variant}>
      <NotificationIcon icon={icon} variant={variant} />
      <div className="av-notification-copy">
        <strong>{formatUiText(title)}</strong>
        {description ? <p>{formatUiText(description)}</p> : null}
      </div>
      <NotificationAction label={actionLabel} onAction={onAction} to={actionTo} />
      {dismissible ? (
        <NotificationCloseButton
          onClick={() => {
            setVisible(false);
            onDismiss?.();
          }}
        />
      ) : null}
    </div>
  );
}

export function SuggestionPanel({
  actionLabel,
  actionTo,
  description,
  dismissible = true,
  icon,
  onAction,
  onDismiss,
  onSecondaryAction,
  secondaryActionLabel,
  title,
  variant = "info"
}: SuggestionPanelProps) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  function close() {
    setVisible(false);
    onDismiss?.();
  }

  return (
    <section className="av-suggestion-panel" data-variant={variant}>
      <div className="av-suggestion-main">
        <NotificationIcon icon={icon} variant={variant} />
        <div className="av-notification-copy">
          <strong>{formatUiText(title)}</strong>
          {description ? <p>{formatUiText(description)}</p> : null}
        </div>
      </div>
      <div className="av-suggestion-actions">
        <NotificationAction label={actionLabel} onAction={onAction} to={actionTo} />
        <NotificationAction label={secondaryActionLabel} onAction={onSecondaryAction ?? close} secondary />
      </div>
      {dismissible ? <NotificationCloseButton onClick={close} /> : null}
    </section>
  );
}

export function NotificationIcon({ icon, variant = "neutral" }: { icon?: ReactNode; variant?: NotificationVariant }) {
  return (
    <span className="av-notification-icon" data-variant={variant} aria-hidden="true">
      {icon ?? defaultIcon(variant)}
    </span>
  );
}

export function NotificationAction({ label, onAction, secondary = false, to }: NotificationActionProps) {
  if (!label) return null;

  const className = secondary ? "av-notification-action is-secondary" : "av-notification-action";
  const content = formatUiText(label);

  if (to) {
    return (
      <Link className={className} onClick={onAction} to={to}>
        {content}
      </Link>
    );
  }

  return (
    <button className={className} onClick={onAction} type="button">
      {content}
    </button>
  );
}

export function NotificationCloseButton({ label = "Meldung schließen", onClick }: { label?: string; onClick: () => void }) {
  return (
    <button className="av-notification-close" onClick={onClick} type="button" aria-label={formatUiText(label)}>
      <X size={14} />
    </button>
  );
}

function defaultIcon(variant: NotificationVariant) {
  if (variant === "success") return <CheckCircle2 size={15} />;
  if (variant === "warning") return <AlertTriangle size={15} />;
  if (variant === "danger") return <XCircle size={15} />;
  if (variant === "info") return <Info size={15} />;
  return <Bell size={15} />;
}
