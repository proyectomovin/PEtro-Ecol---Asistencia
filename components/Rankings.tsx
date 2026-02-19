import React from 'react';
import { EmployeeStats } from '../types';

interface Props {
  stats: EmployeeStats[];
}

const Icon = ({ name, className = "" }: { name: string, className?: string }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const RankingCard = ({ title, iconName, iconColor, items, valueFormatter, barColor }: { 
  title: string, 
  iconName: string,
  iconColor: string,
  items: EmployeeStats[], 
  valueFormatter: (e: EmployeeStats) => string | number,
  barColor: string 
}) => {
  const maxValue = Math.max(...items.map(i => typeof valueFormatter(i) === 'number' ? valueFormatter(i) as number : parseFloat(valueFormatter(i) as string)));

  return (
    <div className="bg-card-dark p-5 rounded-xl border border-border-dark flex flex-col h-[320px]">
      <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
        <Icon name={iconName} className={`${iconColor} text-lg`} />
        {title}
      </h3>
      <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-2">
        {items.map((emp) => {
          const val = valueFormatter(emp);
          const numVal = typeof val === 'number' ? val : parseFloat(val as string);
          const percent = maxValue > 0 ? (numVal / maxValue) * 100 : 0;
          
          return (
            <div key={emp.uuid} className="space-y-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400 truncate w-2/3">{emp.fullName}</span>
                <span className="font-bold text-slate-200">{val}</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full ${barColor}`} style={{ width: `${percent}%` }}></div>
              </div>
            </div>
          );
        })}
        {items.length === 0 && <p className="text-slate-500 text-xs italic text-center mt-10">Sin datos registrados</p>}
      </div>
    </div>
  );
};

export const Rankings: React.FC<Props> = ({ stats }) => {
  const topHours = [...stats].sort((a, b) => b.totalHours - a.totalHours).slice(0, 10);
  const activeStats = stats.filter(s => s.totalHours > 0);
  const bottomHours = [...activeStats].sort((a, b) => a.totalHours - b.totalHours).slice(0, 10);
  const topErrors = [...stats].sort((a, b) => b.errorCount - a.errorCount).filter(s => s.errorCount > 0).slice(0, 10);
  const topDays = [...stats].sort((a, b) => b.daysWorked - a.daysWorked).slice(0, 10);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      <RankingCard 
        title="Más Horas Trabajadas"
        iconName="trending_up"
        iconColor="text-emerald-400"
        items={topHours} 
        valueFormatter={(e) => `${e.totalHours}h`}
        barColor="bg-emerald-500"
      />
      <RankingCard 
        title="Menos Horas Trabajadas"
        iconName="trending_down"
        iconColor="text-orange-400"
        items={bottomHours} 
        valueFormatter={(e) => `${e.totalHours}h`}
        barColor="bg-orange-500"
      />
      <RankingCard 
        title="Errores de Marcación"
        iconName="warning"
        iconColor="text-rose-400"
        items={topErrors} 
        valueFormatter={(e) => e.errorCount}
        barColor="bg-rose-500"
      />
      <RankingCard 
        title="Días Trabajados"
        iconName="calendar_today"
        iconColor="text-primary"
        items={topDays} 
        valueFormatter={(e) => `${e.daysWorked}`}
        barColor="bg-primary"
      />
    </div>
  );
};