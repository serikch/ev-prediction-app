import React from 'react';

/**
 * Status badge for header indicators
 */
export default function StatusBadge({ 
  status = 'info',
  icon,
  label,
  pulse = false,
}) {
  const styles = {
    success: { bg: 'bg-green-500/20', border: 'border-green-500/30', text: 'text-green-400', dot: 'bg-green-500' },
    warning: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', text: 'text-yellow-400', dot: 'bg-yellow-500' },
    error: { bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-400', dot: 'bg-red-500' },
    info: { bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-400', dot: 'bg-blue-500' },
  };

  const s = styles[status] || styles.info;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs ${s.bg} ${s.border} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} ${pulse ? 'animate-pulse' : ''}`} />
      {icon && <span>{icon}</span>}
      {label && <span className="font-medium">{label}</span>}
    </div>
  );
}
