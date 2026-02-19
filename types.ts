export interface RawSheetRow {
  uuid: string;
  firstName: string;
  lastName: string;
  position: string;
  deviceId: string;
  date: string;
  checkIn: string;
  checkOut: string;
  hours: string;
  note: string;
}

export interface AttendanceRecord {
  id: string; // generated unique id for the record
  uuid: string;
  fullName: string;
  position: string;
  date: Date; // Normalized date object (midnight)
  dateString: string; // YYYY-MM-DD
  checkIn: Date | null;
  checkOut: Date | null;
  hoursWorked: number;
  isError: boolean; // Missing check-in or check-out
  isAbsent: boolean; // Generated record for missing days
  isSunday: boolean;
  isOvertime: boolean; // > 10 hours
}

export interface EmployeeStats {
  uuid: string;
  fullName: string;
  position: string;
  totalHours: number;
  daysWorked: number;
  daysAbsent: number;
  errorCount: number;
  avgDailyHours: number;
  attendanceRate: number;
  records: AttendanceRecord[];
}

export interface FilterState {
  startDate: Date;
  endDate: Date;
  selectedEmployee: string; // 'all' or uuid
  selectedPosition: string; // 'all' or position name
}

export interface DashboardMetrics {
  totalHours: number;
  avgDailyHours: number;
  attendanceRate: number;
  totalErrors: number;
  totalAbsentDays: number;
}
