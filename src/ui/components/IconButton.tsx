import type { ComponentChildren } from 'preact';

interface Props {
  label: string;
  onClick?: () => void;
  pressed?: boolean;
  testId?: string;
  children: ComponentChildren;
}

/** Large round icon button, at least 64 × 64 stage px (SPEC §13.1). */
export function IconButton({ label, onClick, pressed, testId, children }: Props) {
  return (
    <button
      type="button"
      class="icon-btn"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      data-testid={testId}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
