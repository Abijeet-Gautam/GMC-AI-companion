const LABELS = {
  live: 'Live',
  connecting: 'Connecting',
  reconnecting: 'Reconnecting',
  offline: 'Offline',
} as const;

export type ConnectionState = keyof typeof LABELS;

/**
 * Small dot + label pill for the tree's poll state. Green when live, amber
 * while (re)connecting, greyed out when the poll has never landed.
 */
export default function ConnectionStatus({ state }: { state: ConnectionState }) {
  return (
    <span className={`ds-connection ds-connection--${state}`} role="status">
      <span className="ds-connection-dot" aria-hidden="true" />
      {LABELS[state]}
    </span>
  );
}
