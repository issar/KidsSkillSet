import { useState, useEffect } from 'react';

type Props = {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  /** When provided, section is controlled externally */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
};

export default function CollapsibleSection({
  title,
  summary,
  defaultOpen = true,
  open: controlledOpen,
  onOpenChange,
  children,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined && onOpenChange !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  useEffect(() => {
    if (isControlled) {
      setInternalOpen(controlledOpen);
    }
  }, [isControlled, controlledOpen]);

  const setOpen = (v: boolean) => {
    if (isControlled) onOpenChange?.(v);
    else setInternalOpen(v);
  };

  return (
    <div className={`collapsible-section ${open ? 'open' : 'collapsed'}`}>
      <button
        type="button"
        className="collapsible-section-header"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="collapsible-section-title">{title}</span>
        {summary && !open && <span className="collapsible-section-summary">{summary}</span>}
        <span className="collapsible-section-toggle" aria-hidden>{open ? '−' : '+'}</span>
      </button>
      {open && <div className="collapsible-section-content">{children}</div>}
    </div>
  );
}
