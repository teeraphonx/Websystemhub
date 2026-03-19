import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  suffix?: string;
  icon: LucideIcon;
  tone?: 'blue' | 'green' | 'yellow' | 'slate';
}

export default function StatCard({
  title,
  value,
  suffix,
  icon: Icon,
  tone = 'blue',
}: StatCardProps) {
  return (
    <article className={`stat-card stat-card--${tone}`}>
      <div className="stat-card__icon">
        <Icon size={18} />
      </div>
      <p className="stat-card__label">{title}</p>
      <div className="stat-card__value-row">
        <strong className="stat-card__value">{value}</strong>
        {suffix ? <span className="stat-card__suffix">{suffix}</span> : null}
      </div>
    </article>
  );
}
