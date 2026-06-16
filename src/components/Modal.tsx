import { type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "../lib/util";
import { XIcon } from "./Icons";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  widthClass?: string;
};

export function Modal({ open, onClose, title, children, widthClass = "max-w-md" }: Props) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className={cn(
              "panel relative max-h-[88vh] w-full overflow-hidden rounded-2xl",
              widthClass,
            )}
            initial={{ scale: 0.97, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <h2 className="font-display text-base font-semibold uppercase tracking-wide text-text">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="rounded-md p-1 text-faint transition hover:bg-surface-3 hover:text-text"
                aria-label="Закрыть"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[calc(88vh-3.5rem)] overflow-y-auto px-5 py-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
