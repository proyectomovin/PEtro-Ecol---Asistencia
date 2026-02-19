import React from 'react';
import { DashboardMetrics } from '../types';

interface Props {
  metrics: DashboardMetrics;
}

const Card = ({ title, value, badge, progressColor, progressWidth }: { 
  title: string, 
  value: string | number, 
  badge?: { text: string, color: string },
  progressColor: string,
  progressWidth: string
}) => (
  <div className="bg-card-dark p-5 rounded-xl border border-border-dark">
    <div className="flex justify-between items-start mb-2">
      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">{title}</span>
      {badge && (
        <span className={`${badge.color} px-1.5 py-0.5 rounded text-[10px] font-bold`}>{badge.text}</span>
      )}
    </div>
    <p className="text-2xl font-black text-white">{value}</p>
    <div className="mt-4 h-1 w-full bg-slate-700 rounded-full overflow-hidden">
      <div className={`${progressColor} h-full ${progressWidth}`}></div>
    </div>
  </div>
);

export const SummaryCards: React.FC<Props> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <Card 
        title="Total Horas" 
        value={`${metrics.totalHours.toLocaleString()}h`}
        badge={{ text: "Periodo", color: "text-emerald-400 bg-emerald-400/10" }}
        progressColor="bg-primary"
        progressWidth="w-[75%]"
      />
      <Card 
        title="Promedio Diario" 
        value={`${metrics.avgDailyHours.toFixed(1)}h`}
        badge={{ text: "Estable", color: "text-slate-400 bg-slate-400/10" }}
        progressColor="bg-emerald-500"
        progressWidth="w-[82%]"
      />
      <Card 
        title="Tasa Asistencia" 
        value={`${metrics.attendanceRate}%`}
        badge={{ text: "Normal", color: "text-blue-400 bg-blue-400/10" }}
        progressColor="bg-blue-400"
        progressWidth={`w-[${Math.min(metrics.attendanceRate, 100)}%]`}
      />
      <Card 
        title="Errores Fichaje" 
        value={metrics.totalErrors}
        badge={{ text: "Alerta", color: "text-rose-400 bg-rose-400/10" }}
        progressColor="bg-rose-500"
        progressWidth="w-[15%]"
      />
      <Card 
        title="Ausentismo" 
        value={`${metrics.totalAbsentDays}d`}
        badge={{ text: "Días", color: "text-orange-400 bg-orange-400/10" }}
        progressColor="bg-orange-500"
        progressWidth="w-[28%]"
      />
    </div>
  );
};