import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type KebabMenuProps = {
  open: boolean;
  onClose: () => void;
  onToggle: () => void;
  children: React.ReactNode;
  triggerLabel: string;
};

export default function KebabMenu({ open, onClose, onToggle, children, triggerLabel }: KebabMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open || !triggerRef.current || !menuRef.current) {
      setPosition(null);
      return;
    }
    const update = () => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;
      const rect = trigger.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const pad = 8;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let left = rect.left;
      let top = rect.bottom + pad;
      if (left + menuRect.width > vw - pad) left = Math.max(pad, vw - menuRect.width - pad);
      if (left < pad) left = pad;
      if (top + menuRect.height > vh - pad) top = rect.top - menuRect.height - pad;
      if (top < pad) top = pad;
      setPosition({ top, left });
    };
    const raf = requestAnimationFrame(() => update());
    const ro = new ResizeObserver(update);
    ro.observe(menuRef.current);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [open]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (open && menuRef.current && triggerRef.current && !menuRef.current.contains(e.target as Node) && !triggerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open, onClose]);

  const dropdown = open && (
    <div
      ref={menuRef}
      className="kebab-menu-dropdown kebab-menu-fixed"
      style={position ? { top: position.top, left: position.left } : { top: -9999, left: -9999, visibility: 'hidden' } as React.CSSProperties}
    >
      {children}
    </div>
  );

  return (
    <div className="kebab-menu-wrap">
      <button
        ref={triggerRef}
        type="button"
        className="kebab-trigger"
        onClick={onToggle}
        aria-label={triggerLabel}
        aria-expanded={open}
      >
        ⋮
      </button>
      {open && createPortal(dropdown, document.body)}
    </div>
  );
}
