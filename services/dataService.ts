import { AIRTABLE_TOKEN, AIRTABLE_BASE_ID, TABLE_EMPLOYEES, TABLE_ATTENDANCE } from '../constants';
import { RawSheetRow, AttendanceRecord, EmployeeStats } from '../types';
import { isSunday, eachDayOfInterval, format, isFuture } from 'date-fns';

// Helper to fetch all records from Airtable
const fetchAirtableTable = async (tableName: string) => {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableName}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`
      }
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      if (response.status === 404) {
        throw new Error(`No se encontró la tabla o la base. Verifica el Base ID (${AIRTABLE_BASE_ID}) y el Table ID (${tableName}).`);
      }
      if (response.status === 401) {
        throw new Error("Token de Airtable inválido o sin permisos. Verifica el AIRTABLE_TOKEN.");
      }
      throw new Error(err.error?.message || `Error de Airtable: ${response.status}`);
    }

    const data = await response.json();
    return data.records || [];
  } catch (e: any) {
    throw new Error(e.message || "Error de red al conectar con Airtable.");
  }
};

// Helper to safely get field values checking multiple possible names
const getField = (fields: any, ...candidates: string[]) => {
  for (const c of candidates) {
    if (fields[c] !== undefined && fields[c] !== null) return fields[c];
  }
  return undefined;
};

export const fetchSheetData = async (): Promise<RawSheetRow[]> => {
  try {
    // 1. Fetch Employees
    const employeesData = await fetchAirtableTable(TABLE_EMPLOYEES);
    
    // Create a map for quick lookup: RecordID -> Employee Data
    const employeeMap = new Map<string, any>();
    employeesData.forEach((record: any) => {
      employeeMap.set(record.id, {
        firstName: getField(record.fields, 'Nombre', 'Name', 'First Name') || '',
        lastName: getField(record.fields, 'Apellido', 'Last Name', 'Surname') || '',
        position: getField(record.fields, 'Posición', 'Posicion', 'Position', 'Role') || 'Sin Asignar',
        deviceId: getField(record.fields, 'ID en Dispositivo', 'ID_Dispositivo', 'Device ID', 'ID Dispositivo') || '',
        uuid: record.id
      });
    });

    // 2. Fetch Attendance
    const attendanceData = await fetchAirtableTable(TABLE_ATTENDANCE);

    // 3. Join Tables and map to application structure
    const joinedRows: RawSheetRow[] = attendanceData.map((record: any) => {
      const fields = record.fields;
      const linkedEmployee = getField(fields, 'Empleado', 'Employee', 'Link');
      let employeeId = null;

      if (Array.isArray(linkedEmployee) && linkedEmployee.length > 0) {
        employeeId = linkedEmployee[0];
      } else if (typeof linkedEmployee === 'string') {
        employeeId = linkedEmployee;
      }

      const employee = employeeMap.get(employeeId) || {
        firstName: 'Desconocido',
        lastName: '',
        position: 'Desconocido',
        deviceId: '',
        uuid: employeeId || 'unknown'
      };

      return {
        uuid: employee.uuid,
        firstName: employee.firstName,
        lastName: employee.lastName,
        position: employee.position,
        deviceId: employee.deviceId,
        date: getField(fields, 'Fecha', 'Date') || '',
        checkIn: getField(fields, 'Check-in Time', 'Check-in', 'Entrada') || '',
        checkOut: getField(fields, 'Check-out Time', 'Check-out', 'Salida') || '',
        hours: '', 
        note: getField(fields, 'Nota procesamiento', 'Nota', 'Note', 'Notes') || ''
      };
    }).filter((r: RawSheetRow) => r.uuid !== 'unknown');

    return joinedRows;

  } catch (error: any) {
    console.error("Failed to fetch Airtable data:", error);
    throw error;
  }
};

// Helper to parse dates strictly
const parseSheetDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const cleanDate = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
        const [y, m, d] = cleanDate.split('-').map(Number);
        return new Date(y, m - 1, d);
    }
    const d = new Date(cleanDate);
    return isNaN(d.getTime()) ? null : d;
};

// Helper to parse timestamps (CheckIn/Out)
const parseTimestamp = (val: string): Date | null => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
};

export const processAttendanceData = (
  rawRows: RawSheetRow[],
  startDate: Date,
  endDate: Date
): { records: AttendanceRecord[]; stats: EmployeeStats[] } => {
  const allRecords: AttendanceRecord[] = [];
  const employeeMap = new Map<string, RawSheetRow>();

  rawRows.forEach(row => {
    if (!row.uuid) return;
    if (!employeeMap.has(row.uuid)) {
      employeeMap.set(row.uuid, row);
    }

    const dateParsed = parseSheetDate(row.date);
    if (!dateParsed) return;

    const start = new Date(startDate); start.setHours(0,0,0,0);
    const end = new Date(endDate); end.setHours(23,59,59,999);

    if (dateParsed < start || dateParsed > end) return;

    const validCheckIn = parseTimestamp(row.checkIn);
    const validCheckOut = parseTimestamp(row.checkOut);

    let hoursWorked = 0;
    let isError = false;

    if (validCheckIn && validCheckOut) {
      const diffMs = validCheckOut.getTime() - validCheckIn.getTime();
      hoursWorked = diffMs / (1000 * 60 * 60); 
    } 

    if ((!validCheckIn || !validCheckOut) && hoursWorked === 0) {
        if ((validCheckIn && !validCheckOut) || (!validCheckIn && validCheckOut)) {
            isError = true;
        }
    }

    if (hoursWorked < 0) hoursWorked = 0;
    if (hoursWorked > 24) {
        hoursWorked = 24; 
        isError = true;
    }

    allRecords.push({
      id: `${row.uuid}-${format(dateParsed, 'yyyyMMdd')}`,
      uuid: row.uuid,
      fullName: `${row.firstName} ${row.lastName}`,
      position: row.position,
      date: dateParsed,
      dateString: format(dateParsed, 'yyyy-MM-dd'),
      checkIn: validCheckIn,
      checkOut: validCheckOut,
      hoursWorked: parseFloat(hoursWorked.toFixed(2)),
      isError,
      isAbsent: false,
      isSunday: isSunday(dateParsed),
      isOvertime: hoursWorked > 10
    });
  });

  const rangeDays = eachDayOfInterval({ start: startDate, end: endDate });
  const uniqueEmployeeIds = Array.from(employeeMap.keys());
  const recordLookup = new Set(allRecords.map(r => `${r.uuid}|${r.dateString}`));

  uniqueEmployeeIds.forEach(uuid => {
    const employeeInfo = employeeMap.get(uuid)!;
    rangeDays.forEach(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const key = `${uuid}|${dayStr}`;
      const isSun = isSunday(day);

      if (!recordLookup.has(key)) {
        const effectiveToday = isFuture(endDate) ? endDate : new Date();
        if (day <= effectiveToday) {
            allRecords.push({
              id: `gap-${key}`,
              uuid: uuid,
              fullName: `${employeeInfo.firstName} ${employeeInfo.lastName}`,
              position: employeeInfo.position,
              date: day,
              dateString: dayStr,
              checkIn: null,
              checkOut: null,
              hoursWorked: 0,
              isError: false, 
              isAbsent: !isSun, 
              isSunday: isSun,
              isOvertime: false
            });
        }
      }
    });
  });

  const stats: EmployeeStats[] = uniqueEmployeeIds.map(uuid => {
    const empRecords = allRecords.filter(r => r.uuid === uuid);
    const workDays = empRecords.filter(r => !r.isAbsent && !r.isSunday && !r.isError && r.hoursWorked > 0);
    const absentDays = empRecords.filter(r => r.isAbsent).length;
    const errorCount = empRecords.filter(r => r.isError).length;
    const totalHours = workDays.reduce((acc, curr) => acc + curr.hoursWorked, 0);
    const potentialWorkDays = empRecords.filter(r => !r.isSunday).length;

    return {
      uuid,
      fullName: empRecords[0]?.fullName || 'Unknown',
      position: empRecords[0]?.position || 'Unknown',
      totalHours: parseFloat(totalHours.toFixed(2)),
      daysWorked: workDays.length,
      daysAbsent: absentDays,
      errorCount,
      avgDailyHours: workDays.length > 0 ? parseFloat((totalHours / workDays.length).toFixed(2)) : 0,
      attendanceRate: potentialWorkDays > 0 ? parseFloat(((1 - (absentDays / potentialWorkDays)) * 100).toFixed(1)) : 0,
      records: empRecords.sort((a, b) => a.date.getTime() - b.date.getTime())
    };
  });

  return { records: allRecords.sort((a, b) => a.date.getTime() - b.date.getTime()), stats };
};