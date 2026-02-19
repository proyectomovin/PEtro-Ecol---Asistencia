import React from 'react';
import { AttendanceRecord, EmployeeStats } from '../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, AreaChart, Area } from 'recharts';
import { format } from 'date-fns';

interface Props {
  records: AttendanceRecord[];
  stats: EmployeeStats[];
}

const Icon = ({ name, className = "" }: { name: string, className?: string }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

export const ChartsSection: React.FC<Props> = ({ records, stats }) => {
  // --- Data Prep (Keep logic, update visuals) ---
  const weeklyDataMap = new Map<string, { name: string, totalHours: number, activeDays: number, errors: number }>();
  records.forEach(r => {
    const d = new Date(r.date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(d.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    const key = format(weekStart, 'yyyy-MM-dd');
    const label = `Sem ${format(weekStart, 'w')}`;
    if (!weeklyDataMap.has(key)) weeklyDataMap.set(key, { name: label, totalHours: 0, activeDays: 0, errors: 0 });
    const entry = weeklyDataMap.get(key)!;
    entry.totalHours += r.hoursWorked;
    if (r.hoursWorked > 0) entry.activeDays += 1;
    if (r.isError) entry.errors += 1;
  });
  const weeklyData = Array.from(weeklyDataMap.values()).sort((a,b) => a.name.localeCompare(b.name));

  // Absenteeism
  const dailyAbsenceMap = new Map<string, number>();
  records.forEach(r => {
      if (!r.isSunday) {
        const key = r.dateString;
        if (!dailyAbsenceMap.has(key)) dailyAbsenceMap.set(key, 0);
        if (r.isAbsent) dailyAbsenceMap.set(key, dailyAbsenceMap.get(key)! + 1);
      }
  });
  const absenceData = Array.from(dailyAbsenceMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Extreme Shifts (Overtime table)
  const extremeShifts = records.filter(r => r.hoursWorked > 11).sort((a, b) => b.hoursWorked - a.hoursWorked).slice(0, 5);

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Weekly Comparison Chart */}
      <div className="col-span-12 xl:col-span-8 bg-card-dark p-6 rounded-xl border border-border-dark">
        <div className="flex justify-between items-center mb-6">
           <div>
             <h3 className="text-lg font-bold text-white">Comparativa Semanal</h3>
             <p className="text-xs text-slate-400">Horas trabajadas agregadas</p>
           </div>
           {/* Visual toggle placeholder */}
           <div className="flex p-1 bg-background-dark rounded-lg border border-border-dark">
              <button className="px-3 py-1 text-xs font-bold rounded bg-primary text-white">Por empleado</button>
           </div>
        </div>
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="name" tick={{fill: '#94a3b8', fontSize: 10}} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{backgroundColor: '#1e293b', borderColor: '#475569'}} />
                    <Bar dataKey="totalHours" name="Horas" fill="#3680f7" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* Absenteeism Chart */}
      <div className="col-span-12 xl:col-span-4 bg-card-dark p-6 rounded-xl border border-border-dark flex flex-col">
         <h3 className="text-lg font-bold text-white mb-4">Ausentismo Diario</h3>
         <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={absenceData}>
                    <defs>
                        <linearGradient id="colorAbsence" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="date" tick={{fill: '#94a3b8', fontSize: 10}} tickFormatter={(val) => format(new Date(val), 'dd')} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{backgroundColor: '#1e293b', borderColor: '#475569'}} />
                    <Area type="monotone" dataKey="count" stroke="#f97316" fill="url(#colorAbsence)" />
                </AreaChart>
            </ResponsiveContainer>
         </div>
      </div>

      {/* Detailed Table for Extreme Shifts */}
      <div className="col-span-12 bg-card-dark rounded-xl border border-border-dark overflow-hidden">
         <div className="p-6 border-b border-border-dark flex justify-between items-center bg-slate-800/20">
            <h3 className="text-lg font-bold text-white">Turnos Extremos (&gt;11h)</h3>
            <button className="text-primary text-sm font-bold flex items-center gap-1 hover:underline">
               Ver todos <Icon name="open_in_new" className="text-sm" />
            </button>
         </div>
         <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm whitespace-nowrap">
               <thead className="bg-slate-800/40 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <tr>
                     <th className="px-6 py-4">Empleado</th>
                     <th className="px-6 py-4">Fecha</th>
                     <th className="px-6 py-4">Entrada</th>
                     <th className="px-6 py-4">Salida</th>
                     <th className="px-6 py-4">Duración</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-700/50">
                  {extremeShifts.map(r => (
                     <tr key={r.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-white">{r.fullName}</td>
                        <td className="px-6 py-4 text-slate-300">{r.dateString}</td>
                        <td className="px-6 py-4 font-mono text-slate-400">{r.checkIn ? format(r.checkIn, 'HH:mm') : '-'}</td>
                        <td className="px-6 py-4 font-mono text-slate-400">{r.checkOut ? format(r.checkOut, 'HH:mm') : '-'}</td>
                        <td className="px-6 py-4 text-orange-400 font-bold">{r.hoursWorked.toFixed(2)}h</td>
                     </tr>
                  ))}
                  {extremeShifts.length === 0 && (
                     <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Sin registros extremos</td></tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};