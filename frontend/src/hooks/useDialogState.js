import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useDialogState — controlled Dialog state that keeps the rendered payload
 * alive during the closing animation so React + Radix Portal don't race on
 * `removeChild` when text nodes inside DialogTitle become null.
 *
 * Usage:
 *   const dlg = useDialogState();
 *   dlg.open(item);          // open the dialog with a payload
 *   dlg.payload;             // current payload (kept until animation ends)
 *   dlg.isOpen;              // boolean for <Dialog open={...}>
 *   dlg.onOpenChange;        // pass straight to <Dialog onOpenChange={...}>
 *   dlg.close();             // request close (animation runs, payload clears later)
 */
export function useDialogState(closeDelayMs = 250) {
  const [payload, setPayload] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const open = useCallback((value) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setPayload(value ?? {});
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    timerRef.current = setTimeout(() => {
      setPayload(null);
      timerRef.current = null;
    }, closeDelayMs);
  }, [closeDelayMs]);

  const onOpenChange = useCallback((next) => {
    if (next) setIsOpen(true);
    else close();
  }, [close]);

  const setPayloadSafe = useCallback((updater) => {
    setPayload((prev) => (typeof updater === "function" ? updater(prev) : updater));
  }, []);

  return { isOpen, payload, open, close, onOpenChange, setPayload: setPayloadSafe };
}
