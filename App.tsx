import React, { useEffect, useState, useMemo } from 'react';
import { RawSheetRow, FilterState, DashboardMetrics } from './types';
import { fetchSheetData, processAttendanceData } from './services/dataService';
import { SummaryCards } from './components/SummaryCards';
import { Rankings } from './components/Rankings';
import { IndividualStats } from './components/IndividualStats';
import { ChartsSection } from './components/ChartsSection';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

// Helper for Material Icons
const Icon = ({ name, className = "" }: { name: string, className?: string }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const App: React.FC = () => {
  const [rawRows, setRawRows] = useState<RawSheetRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');

  const [filters, setFilters] = useState<FilterState>({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
    endDate: new Date(),
    selectedEmployee: 'all',
    selectedPosition: 'all'
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchSheetData();
      
      if (rows.length > 0) {
        let maxDate: Date | null = null;
        rows.forEach(r => {
            if (r.date) {
                let d: Date | null = null;
                const clean = r.date.trim();
                if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
                    const [y, m, dNum] = clean.split('-').map(Number);
                    d = new Date(y, m - 1, dNum);
                } else {
                    d = new Date(clean);
                }
                if (d && !isNaN(d.getTime())) {
                    if (!maxDate || d > maxDate) maxDate = d;
                }
            }
        });

        if (maxDate) {
            const newStart = new Date(maxDate);
            newStart.setDate(maxDate.getDate() - 30);
            setFilters(prev => ({
                ...prev,
                startDate: newStart,
                endDate: maxDate as Date
            }));
        }
      }

      setRawRows(rows);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error("Error loading data:", err);
      setError(err.message || "Error desconocido al cargar datos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const processedData = useMemo(() => {
    if (rawRows.length === 0) return { records: [], stats: [], metrics: null };

    const { records, stats } = processAttendanceData(rawRows, filters.startDate, filters.endDate);

    let filteredStats = stats;
    let filteredRecords = records;

    if (filters.selectedPosition !== 'all') {
      filteredStats = filteredStats.filter(s => s.position === filters.selectedPosition);
      filteredRecords = filteredRecords.filter(r => r.position === filters.selectedPosition);
    }

    if (filters.selectedEmployee !== 'all') {
      filteredStats = filteredStats.filter(s => s.uuid === filters.selectedEmployee);
      filteredRecords = filteredRecords.filter(r => r.uuid === filters.selectedEmployee);
    }

    if (searchQuery.trim() !== '') {
        const lowerQ = searchQuery.toLowerCase();
        filteredStats = filteredStats.filter(s => s.fullName.toLowerCase().includes(lowerQ));
        const allowedIds = new Set(filteredStats.map(s => s.uuid));
        filteredRecords = filteredRecords.filter(r => allowedIds.has(r.uuid));
    }

    const totalHours = filteredStats.reduce((acc, curr) => acc + curr.totalHours, 0);
    const totalErrors = filteredStats.reduce((acc, curr) => acc + curr.errorCount, 0);
    const totalAbsentDays = filteredStats.reduce((acc, curr) => acc + curr.daysAbsent, 0);
    const totalDaysWorked = filteredStats.reduce((acc, curr) => acc + curr.daysWorked, 0);
    const avgDailyHours = totalDaysWorked > 0 ? totalHours / totalDaysWorked : 0;
    const avgAttendance = filteredStats.length > 0 
      ? filteredStats.reduce((acc, curr) => acc + curr.attendanceRate, 0) / filteredStats.length 
      : 0;

    const metrics: DashboardMetrics = {
      totalHours: Math.round(totalHours),
      avgDailyHours: parseFloat(avgDailyHours.toFixed(1)),
      attendanceRate: parseFloat(avgAttendance.toFixed(1)),
      totalErrors,
      totalAbsentDays
    };

    return { records: filteredRecords, stats: filteredStats, metrics };
  }, [rawRows, filters, searchQuery]);

  const uniqueEmployees = useMemo(() => {
    const map = new Map();
    rawRows.forEach(r => {
        if(r.uuid && r.firstName) map.set(r.uuid, `${r.firstName} ${r.lastName}`);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [rawRows]);

  const handleEmployeeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, selectedEmployee: e.target.value }));
  };
  
  const isSingleEmployeeView = filters.selectedEmployee !== 'all' || (searchQuery !== '' && processedData.stats.length === 1);
  const selectedEmployeeStat = isSingleEmployeeView ? processedData.stats[0] : null;

  if (loading && rawRows.length === 0) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center text-white">
        <Loader2 className="animate-spin mr-2" /> Conectando con Airtable...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background-dark flex flex-col items-center justify-center text-white p-6">
        <div className="bg-card-dark p-8 rounded-2xl border border-red-500/30 max-w-lg w-full text-center shadow-2xl">
           <div className="size-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="error" className="text-red-500 text-3xl" />
           </div>
           <h2 className="text-xl font-bold mb-2">Error de Conexión</h2>
           <p className="text-slate-400 mb-6 font-mono text-sm bg-black/20 p-4 rounded break-all whitespace-pre-wrap">
             {error}
           </p>

           <button 
             onClick={loadData}
             className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-bold w-full transition-all"
           >
             Reintentar conexión
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen font-display">
      <header className="sticky top-0 z-50 bg-background-dark/95 backdrop-blur border-b border-border-dark px-6 py-3">
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-start">
            <div className="flex items-center gap-4">
              <div className="bg-primary p-1.5 rounded-lg text-white">
                <Icon name="energy_savings_leaf" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white leading-none">Petro Ecol</h1>
                <span className="text-xs text-slate-400 font-medium">Panel de Asistencia</span>
              </div>
            </div>
            <div className="lg:hidden flex items-center gap-2">
                 <button onClick={loadData} className="text-primary"><Icon name="refresh" /></button>
            </div>
          </div>

          <div className="relative flex-1 max-w-md hidden md:block">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input 
                type="text" 
                className="w-full bg-slate-800 border-none rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-primary placeholder-slate-500"
                placeholder="Buscar empleado..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
            <div className="flex flex-1 gap-2 w-full sm:w-auto">
              <div className="relative flex-1 group">
                 <Icon name="calendar_month" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg pointer-events-none" />
                 <input 
                    type="date"
                    className="w-full bg-card-dark border-border-dark rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 focus:ring-primary focus:border-primary"
                    value={format(filters.startDate, 'yyyy-MM-dd')}
                    onChange={(e) => {
                      const d = new Date(e.target.value);
                      if(!isNaN(d.getTime())) setFilters(p => ({...p, startDate: d}));
                    }}
                 />
              </div>
              
              <div className="relative flex-1">
                 <Icon name="engineering" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg pointer-events-none" />
                 <select 
                    className="w-full bg-card-dark border-border-dark rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 focus:ring-primary focus:border-primary appearance-none"
                    value={filters.selectedEmployee}
                    onChange={handleEmployeeChange}
                 >
                    <option value="all">Todos los empleados</option>
                    {uniqueEmployees.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                 </select>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full sm:w-auto justify-end hidden lg:flex">
                <div className="text-right hidden xl:block">
                    <p className="text-xs text-slate-500">Última actualización</p>
                    <p className="text-xs font-semibold text-slate-300">{lastUpdated ? lastUpdated.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}</p>
                </div>
                <button 
                    onClick={loadData}
                    disabled={loading}
                    className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-70"
                >
                    <Icon name="refresh" className={loading ? "animate-spin" : ""} />
                    <span className="hidden sm:inline">Actualizar</span>
                </button>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
        <div className="md:hidden relative">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input 
                type="text" 
                className="w-full bg-slate-800 border-border-dark rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-primary placeholder-slate-500"
                placeholder="Buscar empleado..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>

        {processedData.metrics && <SummaryCards metrics={processedData.metrics} />}

        {!isSingleEmployeeView && processedData.metrics && (
           <>
              <Rankings stats={processedData.stats} />
              <ChartsSection records={processedData.records} stats={processedData.stats} />
           </>
        )}

        {isSingleEmployeeView && selectedEmployeeStat && (
           <IndividualStats employee={selectedEmployeeStat} />
        )}

        {!loading && processedData.records.length === 0 && !error && (
            <div className="text-center py-20 text-slate-500">
                <Icon name="dataset" className="text-4xl mb-2 block mx-auto opacity-50"/>
                <p>No se encontraron datos para el rango de fechas seleccionado.</p>
                <p className="text-xs text-slate-600 mt-2">Verifica que las fechas coincidan con las de tu base en Airtable.</p>
            </div>
        )}
      </main>
    </div>
  );
};

export default App;