export function BadgeStatus({ label }: { label: string }) {
  return <span className={`badge-status ${label.toLowerCase()}`}>{label}</span>;
}
