import React, { useMemo } from 'react';
import { EmployeeStats } from '../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from 'recharts';
import { format } from 'date-fns';

interface Props {
  employee: EmployeeStats | null;
}

const Icon = ({ name, className = "" }: { name: string, className?: string }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

export const IndividualStats: React.FC<Props> = ({ employee }) => {
  if (!employee) return null;

  const sortedRecords = useMemo(() => {
    return [...employee.records].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [employee]);

  // Calculate streaks & stats
  let currentStreak = 0;
  // Simple streak calc from end
  for (let i = sortedRecords.length - 1; i >= 0; i--) {
    const r = sortedRecords[i];
    if (r.isSunday) continue;
    if (r.hoursWorked > 0) currentStreak++;
    else break;
  }
  const overtimeHours = sortedRecords.reduce((acc, curr) => acc + (curr.hoursWorked > 9 ? curr.hoursWorked - 9 : 0), 0);

  // Heatmap generation: Fill a grid of approx 35 days (5 weeks) or just the days we have
  // The reference uses a 7-column grid
  // We need to pad the start to align with Monday
  const firstDate = sortedRecords[0]?.date;
  const startOffset = firstDate ? (firstDate.getDay() + 6) % 7 : 0; // Mon=0, Sun=6
  const padding = Array(startOffset).fill(null);

  return (
    <div className="grid grid-cols-12 gap-6 animate-fade-in">
      {/* LEFT PANEL: Profile & Stats */}
      <section className="col-span-12 lg:col-span-5 flex flex-col gap-6">
        {/* Profile Card */}
        <div className="bg-card-dark border border-border-dark rounded-xl p-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="size-16 rounded-xl border-2 border-primary bg-slate-800 flex items-center justify-center text-primary text-xl font-bold">
                 {employee.fullName.charAt(0)}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-green-500 size-4 rounded-full border-2 border-card-dark"></div>
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold leading-none text-white">{employee.fullName}</h3>
                  <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">{employee.position}</p>
                </div>
                <span className="px-2 py-1 rounded bg-primary/10 text-primary text-[10px] font-bold border border-primary/20">ACTIVO</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">ID: {employee.uuid.substring(0, 8)}</p>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card-dark border border-border-dark p-4 rounded-xl">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Horas Promedio</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-white">{employee.avgDailyHours.toFixed(1)}h</span>
            </div>
          </div>
          <div className="bg-card-dark border border-border-dark p-4 rounded-xl">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Racha Actual</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-white">{currentStreak} días</span>
              <Icon name="local_fire_department" className="text-orange-500 text-sm" />
            </div>
          </div>
          <div className="bg-card-dark border border-border-dark p-4 rounded-xl">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Horas Extra</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-primary">+{Math.round(overtimeHours)}h</span>
            </div>
          </div>
        </div>

        {/* Attendance Heatmap */}
        <div className="bg-card-dark border border-border-dark rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Icon name="event_available" className="text-primary text-lg" />
              Mapa de Asistencia
            </h4>
            <div className="flex gap-2">
              <div className="flex items-center gap-1"><div className="size-2 rounded-sm bg-emerald-500"></div><span className="text-[10px] text-slate-400">P</span></div>
              <div className="flex items-center gap-1"><div className="size-2 rounded-sm bg-rose-500"></div><span className="text-[10px] text-slate-400">A</span></div>
              <div className="flex items-center gap-1"><div className="size-2 rounded-sm bg-yellow-500"></div><span className="text-[10px] text-slate-400">E</span></div>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {['L','M','M','J','V','S','D'].map(d => (
                <div key={d} className="text-[9px] text-center font-bold text-slate-600">{d}</div>
            ))}
            
            {padding.map((_, i) => <div key={`pad-${i}`} className="aspect-square bg-slate-800/20 rounded"></div>)}

            {sortedRecords.map((r) => {
                let colorClass = "bg-slate-800";
                if (r.isAbsent) colorClass = "bg-rose-500";
                else if (r.isError) colorClass = "bg-yellow-500";
                else if (r.hoursWorked > 0) colorClass = "bg-emerald-500";
                
                return (
                    <div 
                        key={r.id} 
                        className={`aspect-square rounded-sm flex items-center justify-center text-[10px] font-bold text-white ${colorClass}`}
                        title={`${r.dateString}: ${r.hoursWorked}h`}
                    >
                        {format(r.date, 'd')}
                    </div>
                )
            })}
          </div>
        </div>
      </section>

      {/* RIGHT PANEL: Charts & Logs */}
      <section className="col-span-12 lg:col-span-7 flex flex-col gap-6">
        {/* Daily Evolution */}
        <div className="bg-card-dark border border-border-dark rounded-xl p-5">
            <h4 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                <Icon name="stacked_line_chart" className="text-primary text-lg" />
                Evolución de Horas Diarias
            </h4>
            <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sortedRecords}>
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                            cursor={{fill: '#334155', opacity: 0.4}}
                        />
                        <Bar dataKey="hoursWorked" fill="#3680f7" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Detailed Log Table */}
        <div className="bg-card-dark border border-border-dark rounded-xl flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border-dark flex justify-between items-center bg-slate-800/20">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Icon name="list_alt" className="text-primary text-lg" />
                    Log Detallado
                </h4>
            </div>
            <div className="flex-1 overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-800 text-slate-400">
                        <tr>
                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest">Fecha</th>
                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest">Entrada</th>
                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest">Salida</th>
                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest">Horas</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 text-slate-300 text-xs">
                        {[...sortedRecords].reverse().map(r => (
                            <tr key={r.id} className="hover:bg-slate-800/30">
                                <td className="px-4 py-3">{format(r.date, 'dd MMM yyyy')}</td>
                                <td className="px-4 py-3 font-mono text-slate-400">{r.checkIn ? format(r.checkIn, 'HH:mm') : '--:--'}</td>
                                <td className="px-4 py-3 font-mono text-slate-400">{r.checkOut ? format(r.checkOut, 'HH:mm') : '--:--'}</td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 rounded-full font-bold ${r.hoursWorked > 0 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-700 text-slate-400'}`}>
                                        {r.hoursWorked.toFixed(1)}h
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </section>
    </div>
  );
};