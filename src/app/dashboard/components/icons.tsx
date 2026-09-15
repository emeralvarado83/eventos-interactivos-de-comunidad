// Iconos SVG inline del dashboard. Mismas convenciones que los del overlay.

interface IconProps {
  className?: string;
}

export function HomeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 3l9 8h-3v9h-4v-6h-4v6H6v-9H3l9-8z" />
    </svg>
  );
}

export function ListIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M4 6h2v2H4V6zm4 0h12v2H8V6zM4 11h2v2H4v-2zm4 0h12v2H8v-2zm-4 5h2v2H4v-2zm4 0h12v2H8v-2z" />
    </svg>
  );
}

export function GearIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 8a4 4 0 1 0 4 4 4 4 0 0 0-4-4zm9.4 4a7.3 7.3 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2-1.2L16.5 3h-4l-.4 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.3 7.3 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7.6 7.6 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.06-.4.1-.8.1-1.2z" />
    </svg>
  );
}

export function HistoryIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 4a8 8 0 1 1-7.7 10.2l2-.6A6 6 0 1 0 12 6a6 6 0 0 0-5.7 4H9v2H3V6h2v2.3A8 8 0 0 1 12 4zm-1 4h2v4.4l3.5 2-1 1.7L11 13.4V8z" />
    </svg>
  );
}

export function BoltIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  );
}

export function CopyIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M8 2h12a1 1 0 0 1 1 1v12h-2V4H8V2zM4 6h12a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zm1 2v11h10V8H5z" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M9.5 16.2L5.3 12l-1.4 1.4 5.6 5.6 12-12-1.4-1.4-10.6 10.6z" />
    </svg>
  );
}

export function ExternalIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M14 3h7v7h-2V6.4l-8.3 8.3-1.4-1.4L17.6 5H14V3zM5 5h6v2H7v10h10v-4h2v6H5V5z" />
    </svg>
  );
}

export function TrashIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M9 2h6l1 2h5v2H3V4h5l1-2zm-4 6h14l-1.3 13.1a1 1 0 0 1-1 .9H7.3a1 1 0 0 1-1-.9L5 8zm5 3v8h1.5v-8H10zm3.5 0v8H15v-8h-1.5z" />
    </svg>
  );
}

export function ChatIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M4 3h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-5l-4 4v-4H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
    </svg>
  );
}

export function HashIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d="M9 3L7 21M17 3l-2 18M4 8h17M3 16h17" />
    </svg>
  );
}

export function TrophyIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M6 2h12v2h4v3a5 5 0 0 1-5 5h-.4A6 6 0 0 1 13 15.9V19h4v2H7v-2h4v-3.1A6 6 0 0 1 7.4 12H7a5 5 0 0 1-5-5V4h4V2zm-2 4v1a3 3 0 0 0 3 3V6H4zm16 0h-3v4a3 3 0 0 0 3-3V6z" />
    </svg>
  );
}

export function CrownIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M3 8l4.5 3.5L12 5l4.5 6.5L21 8l-1.6 10.5H4.6L3 8z" />
    </svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5z" />
    </svg>
  );
}

export function UsersIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M9 11a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 9 11zm7 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm-7 2c-2.8 0-6 1.4-6 3.8V19h12v-2.2c0-2.4-3.2-3.8-6-3.8zm7 .8c-.5 0-1 .1-1.5.2a4.7 4.7 0 0 1 1.5 3.4V19h4v-1.9c0-2-2.2-3.3-4-3.3z" />
    </svg>
  );
}

export function GamepadIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M7 6h10a5 5 0 0 1 5 5v4a3 3 0 0 1-5.2 2L15 15H9l-1.8 2A3 3 0 0 1 2 15v-4a5 5 0 0 1 5-5zm-.5 3v2H5v2h1.5v2h2v-2H10v-2H8.5V9h-2zM16 9.5a1 1 0 1 0 1 1 1 1 0 0 0-1-1zm2.5 2.5a1 1 0 1 0 1 1 1 1 0 0 0-1-1z" />
    </svg>
  );
}

export function ClockIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 10.6l4.5 2.6-1 1.7L11 13.8V7h2v5.6z" />
    </svg>
  );
}

export function LogoutIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M10 3h9a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-9v-2h8V5h-8V3zm1 8v2H3v-2h8zm0 0l-3.5-3.5L8.9 6l5 5-5 5-1.4-1.4L11 11z" />
    </svg>
  );
}
