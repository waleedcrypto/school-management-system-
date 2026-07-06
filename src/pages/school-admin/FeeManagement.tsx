import React, { useEffect, useState, useRef } from 'react';
import useSWR from 'swr';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Download, Search, DollarSign, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import Papa from 'papaparse';

export default function FeeManagement() {
  const { schoolId } = useAuth();
  
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const [schemaError, setSchemaError] = useState(false);

  const { data, mutate, isLoading: loading, error: swrError } = useSWR(schoolId ? `fees-${schoolId}-${selectedMonth}-${selectedYear}` : null, async () => {
    const [studentsData, classesData, sectionsData, sessionData] = await Promise.all([
      supabase.from('students').select('*').eq('school_id', schoolId).order('first_name'),
      supabase.from('classes').select('*').eq('school_id', schoolId).order('name'),
      supabase.from('sections').select('*').eq('school_id', schoolId).order('name'),
      supabase.from('academic_sessions').select('id').eq('school_id', schoolId).eq('is_current', true).maybeSingle()
    ]);

    let studentsWithSections = studentsData.data || [];
    if (sessionData.data && studentsWithSections.length > 0) {
      const { data: studentSections } = await supabase
        .from('student_sections')
        .select('student_id, section_id')
        .eq('session_id', sessionData.data.id);
        
      if (studentSections) {
        studentsWithSections = studentsWithSections.map(student => {
          const sectionAssignment = studentSections.find(s => s.student_id === student.id);
          return {
            ...student,
            section_id: sectionAssignment?.section_id || null
          };
        });
      }
    }

    // Auto-generate missing records for the viewed month
    await generateMonthlyFees(studentsWithSections, selectedMonth, selectedYear);

    const { data: feesData, error: feesErr } = await supabase
      .from('student_fees')
      .select('*')
      .eq('school_id', schoolId)
      .eq('fee_month', selectedMonth)
      .eq('fee_year', selectedYear);
      
    if (feesErr && feesErr.message.includes('fee_month')) {
      setSchemaError(true);
    }

    return {
      students: studentsWithSections,
      classes: classesData.data || [],
      sections: sectionsData.data || [],
      studentFees: feesData || []
    };
  });

  const students = data?.students || [];
  const classes = data?.classes || [];
  const sections = data?.sections || [];
  const studentFees = data?.studentFees || [];

  const [generating, setGenerating] = useState(false);
  const generatingRef = useRef(false);

  // Filters
  const [search, setSearch] = useState('');
  const [filterClassId, setFilterClassId] = useState('');
  const [filterSectionId, setFilterSectionId] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedFeeRecord, setSelectedFeeRecord] = useState<any>(null);
  const [editBilledAmount, setEditBilledAmount] = useState('');
  const [editPaidAmount, setEditPaidAmount] = useState('');
  const [paymentMsg, setPaymentMsg] = useState('');

  // History Modal
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyStudent, setHistoryStudent] = useState<any>(null);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);

  const months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' }
  ];

  const years = Array.from({ length: 10 }, (_, i) => currentDate.getFullYear() - 5 + i);

  const generateMonthlyFees = async (studentsList: any[], month: number, year: number) => {
    if (!schoolId) return;
    if (generatingRef.current) return;
    
    generatingRef.current = true;
    
    // Get existing fees for this month/year
    const { data: existingFees } = await supabase
      .from('student_fees')
      .select('student_id')
      .eq('school_id', schoolId)
      .eq('fee_month', month)
      .eq('fee_year', year);
      
    const existingIds = new Set((existingFees || []).map(f => f.student_id));
    
    const missingStudents = studentsList.filter(s => s.status === 'active' && !existingIds.has(s.id));
    if (missingStudents.length === 0) {
      generatingRef.current = false;
      return;
    }
    
    setGenerating(true);
    try {
      const { data: previousFees, error: fetchErr } = await supabase
        .from('student_fees')
        .select('student_id, total_amount, amount_paid, fee_year, fee_month')
        .eq('school_id', schoolId)
        .in('student_id', missingStudents.map(s => s.id))
        .order('fee_year', { ascending: false })
        .order('fee_month', { ascending: false });
        
      if (fetchErr && fetchErr.message.includes('fee_month')) {
         setSchemaError(true);
         return;
      }
        
      const latestDues = new Map<string, number>();
      if (previousFees) {
        for (const fee of previousFees) {
          if (!latestDues.has(fee.student_id)) {
             latestDues.set(fee.student_id, (fee.total_amount || 0) - (fee.amount_paid || 0));
          }
        }
      }
      
      let feeStructId = null;
      let { data: sessionData } = await supabase.from('academic_sessions').select('id').eq('school_id', schoolId).eq('is_current', true).maybeSingle();
      
      if (!sessionData) {
        const currYear = new Date().getFullYear();
        const { data: newSession } = await supabase.from('academic_sessions').insert({
          school_id: schoolId,
          name: `${currYear}-${currYear + 1}`,
          start_date: `${currYear}-01-01`,
          end_date: `${currYear + 1}-12-31`,
          is_current: true
        }).select('id').single();
        sessionData = newSession;
      }

      if (sessionData) {
        let { data: feeStruct } = await supabase.from('fee_structures').select('id').eq('school_id', schoolId).eq('name', 'General Monthly Fee').maybeSingle();
        if (!feeStruct) {
          const { data: newStruct } = await supabase.from('fee_structures').insert({
            school_id: schoolId, session_id: sessionData.id, name: 'General Monthly Fee', amount: 0
          }).select('id').single();
          if (newStruct) feeStructId = newStruct.id;
        } else {
          feeStructId = feeStruct.id;
        }
      }
      
      if (!feeStructId) return;
      
      const newFeeRecords = missingStudents.map(student => {
         const previousDue = latestDues.get(student.id) || 0;
         const monthlyFee = student.monthly_fee || 0;
         const totalAmount = monthlyFee + previousDue;
         
         return {
           school_id: schoolId,
           student_id: student.id,
           fee_structure_id: feeStructId,
           fee_month: month,
           fee_year: year,
           total_amount: totalAmount,
           amount_paid: 0,
           status: totalAmount > 0 ? 'pending' : 'paid',
           payment_date: null
         };
      });
      
      if (newFeeRecords.length > 0) {
         await supabase.from('student_fees').insert(newFeeRecords);
      }
      await mutate();
    } finally {
      setGenerating(false);
      generatingRef.current = false;
    }
  };

  const openPaymentModal = (feeRecord: any, student: any) => {
    setSelectedFeeRecord({ ...(feeRecord || {}), student });
    setEditBilledAmount((feeRecord?.total_amount ?? student?.monthly_fee ?? 0).toString());
    setEditPaidAmount((feeRecord?.amount_paid || 0).toString());
    setPaymentMsg('');
    setIsPaymentModalOpen(true);
  };

  const openHistoryModal = async (student: any) => {
    setHistoryStudent(student);
    setIsHistoryModalOpen(true);
    
    const { data } = await supabase
      .from('student_fees')
      .select('*')
      .eq('school_id', schoolId)
      .eq('student_id', student.id)
      .order('fee_year', { ascending: false })
      .order('fee_month', { ascending: false });
      
    if (data) setHistoryRecords(data);
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeeRecord) return;
    setPaymentMsg('Saving record...');

    const billed = parseFloat(editBilledAmount) || 0;
    const paid = parseFloat(editPaidAmount) || 0;
    
    if (billed < 0 || paid < 0) {
      setPaymentMsg('Error: Amounts cannot be negative');
      return;
    }
    
    if (paid > billed) {
      setPaymentMsg('Error: Paid amount cannot exceed billed amount');
      return;
    }

    const newDueAmount = billed - paid;
    
    let newStatus = 'pending';
    if (newDueAmount <= 0) newStatus = 'paid';
    else if (paid > 0) newStatus = 'partial';

    try {
      let targetId = selectedFeeRecord.id;

      if (!targetId) {
        // Find or create academic session and fee structure
        let feeStructId = null;
        let { data: sessionData } = await supabase.from('academic_sessions').select('id').eq('school_id', schoolId).eq('is_current', true).maybeSingle();
        if (!sessionData) {
          const currYear = new Date().getFullYear();
          const { data: newSession } = await supabase.from('academic_sessions').insert({ school_id: schoolId, name: `${currYear}-${currYear + 1}`, start_date: `${currYear}-01-01`, end_date: `${currYear + 1}-12-31`, is_current: true }).select('id').single();
          sessionData = newSession;
        }
        if (sessionData) {
          let { data: feeStruct } = await supabase.from('fee_structures').select('id').eq('school_id', schoolId).eq('name', 'General Monthly Fee').maybeSingle();
          if (!feeStruct) {
            const { data: newStruct } = await supabase.from('fee_structures').insert({ school_id: schoolId, session_id: sessionData.id, name: 'General Monthly Fee', amount: 0 }).select('id').single();
            feeStruct = newStruct;
          }
          if (feeStruct) feeStructId = feeStruct.id;
        }

        if (!feeStructId) throw new Error("Could not create or find fee structure.");

        const { data: newFee, error: insertError } = await supabase.from('student_fees').insert({
          school_id: schoolId,
          student_id: selectedFeeRecord.student.id,
          fee_structure_id: feeStructId,
          fee_month: selectedMonth,
          fee_year: selectedYear,
          total_amount: billed,
          amount_paid: paid,
          status: newStatus,
          payment_date: paid > 0 ? new Date().toISOString().split('T')[0] : null
        }).select('id').single();

        if (insertError) throw insertError;
        targetId = newFee.id;
      } else {
        const { error } = await supabase
          .from('student_fees')
          .update({
            total_amount: billed,
            amount_paid: paid,
            status: newStatus,
            payment_date: paid > (selectedFeeRecord.amount_paid || 0) ? new Date().toISOString().split('T')[0] : selectedFeeRecord.payment_date
          })
          .eq('id', targetId);
          
        if (error) throw error;
      }

      await mutate();
      setIsPaymentModalOpen(false);
    } catch (error: any) {
      setPaymentMsg(`Error: ${error.message}`);
    }
  };

  const exportData = (type: 'all' | 'due') => {
    const dataToExport = filteredData.filter(item => {
      if (type === 'all') return true;
      const fee = item.fee;
      const due = fee ? (fee.total_amount || 0) - (fee.amount_paid || 0) : (item.student.monthly_fee || 0);
      return due > 0;
    });

    const exportFormat = dataToExport.map(item => {
      const { student, fee } = item;
      const studentSection = sections.find(s => s.id === student.section_id);
      const studentClass = classes.find(c => c.id === studentSection?.class_id);
      
      const monthName = months.find(m => m.value === selectedMonth)?.label;

      return {
        'Registration No': student.student_id || '',
        'First Name': student.first_name,
        'Last Name': student.last_name,
        'Class': studentClass ? studentClass.name : 'Not assigned',
        'Section': studentSection ? studentSection.name : 'Not assigned',
        'Month': `${monthName} ${selectedYear}`,
        'Base Monthly Fee': student.monthly_fee || 0,
        'Total Billed': fee ? fee.total_amount : 0,
        'Amount Paid': fee ? fee.amount_paid : 0,
        'Due Amount': fee ? (fee.total_amount || 0) - (fee.amount_paid || 0) : 0,
        'Payment Status': fee ? fee.status : 'No Record',
        'Last Payment Date': fee && fee.payment_date ? fee.payment_date : ''
      };
    });

    const csv = Papa.unparse(exportFormat);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const fileNameSuffix = type === 'due' ? '_unpaid' : '';
    link.setAttribute('download', `fee_report_${selectedMonth}_${selectedYear}${fileNameSuffix}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Map each student to their fee record
  const studentFeeData = students.map(student => {
    const fee = studentFees.find(f => f.student_id === student.id);
    return { student, fee };
  });

  const filteredData = studentFeeData.filter(item => {
    const { student, fee } = item;
    const searchMatch = (student.first_name + ' ' + student.last_name).toLowerCase().includes(search.toLowerCase()) || 
      (student.student_id && student.student_id.toLowerCase().includes(search.toLowerCase()));
    
    let classMatch = true;
    let sectionMatch = true;

    if (filterClassId) {
      const studentSection = sections.find(sec => sec.id === student.section_id);
      classMatch = studentSection?.class_id === filterClassId;
    }

    if (filterSectionId) {
      sectionMatch = student.section_id === filterSectionId;
    }

    let statusMatch = true;
    if (filterStatus !== 'all') {
      const status = fee ? fee.status : 'pending';
      statusMatch = status === filterStatus;
    }

    // Only show active students or those with a fee record this month
    const isRelevant = student.status === 'active' || fee;

    return isRelevant && searchMatch && classMatch && sectionMatch && statusMatch;
  });

  return (
    <div className="space-y-6">
      {schemaError && (
        <div className="bg-error/10 border border-error text-error rounded-xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold">Database Schema Update Required</h3>
            <p className="mt-1 text-sm text-error/80">
              The fee management module requires an update to the database schema. Please run the following SQL command in your Supabase SQL Editor:
            </p>
            <pre className="mt-3 bg-black/10 p-3 rounded-lg text-xs overflow-x-auto whitespace-pre font-mono">
              {`ALTER TABLE student_fees ADD COLUMN IF NOT EXISTS fee_month INTEGER;
ALTER TABLE student_fees ADD COLUMN IF NOT EXISTS fee_year INTEGER;
ALTER TABLE student_fees ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2) DEFAULT 0;`}
            </pre>
            <p className="mt-2 text-sm text-error/80">
              After running this SQL query, refresh the page and the fee management system will work correctly.
            </p>
          </div>
        </div>
      )}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-on-surface">Fee Management</h1>
            {generating && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-medium animate-pulse">
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating fees...
              </span>
            )}
          </div>
          <p className="text-on-surface-variant mt-1">Track and manage student monthly payments and dues.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportData('all')} className="flex items-center gap-2 px-3 py-2 bg-surface-container border border-outline-variant rounded-lg text-sm font-medium hover:bg-surface-container-high transition-colors">
            <Download className="w-4 h-4" /> Export All
          </button>
          <button onClick={() => exportData('due')} className="flex items-center gap-2 px-3 py-2 bg-error/10 text-error border border-error/20 rounded-lg text-sm font-medium hover:bg-error/20 transition-colors">
            <Download className="w-4 h-4" /> Export Unpaid
          </button>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="p-4 border-b border-outline-variant flex flex-wrap gap-4 bg-surface-bright items-center">
          <div className="flex items-center gap-2 mr-2">
            <Calendar className="w-5 h-5 text-on-surface-variant" />
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="border border-outline-variant rounded-lg px-3 py-2 text-sm bg-surface-container-lowest focus:ring-1 focus:ring-secondary font-medium"
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="border border-outline-variant rounded-lg px-3 py-2 text-sm bg-surface-container-lowest focus:ring-1 focus:ring-secondary font-medium"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          
          <div className="w-px h-8 bg-outline-variant hidden md:block mx-1"></div>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
            />
          </div>
          <select 
            value={filterClassId} 
            onChange={(e) => { setFilterClassId(e.target.value); setFilterSectionId(''); }}
            className="border border-outline-variant rounded-lg px-4 py-2 text-sm bg-surface-container-lowest focus:ring-1 focus:ring-secondary"
          >
            <option value="">All Classes</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select 
            value={filterSectionId} 
            onChange={(e) => setFilterSectionId(e.target.value)}
            disabled={!filterClassId}
            className="border border-outline-variant rounded-lg px-4 py-2 text-sm bg-surface-container-lowest focus:ring-1 focus:ring-secondary disabled:opacity-50"
          >
            <option value="">All Sections</option>
            {sections.filter(s => s.class_id === filterClassId).map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-outline-variant rounded-lg px-4 py-2 text-sm bg-surface-container-lowest focus:ring-1 focus:ring-secondary"
          >
            <option value="all">All Statuses</option>
            <option value="paid">Fully Paid</option>
            <option value="partial">Partially Paid</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant text-xs text-on-surface-variant uppercase bg-surface">
                <th className="py-3 px-6 font-medium">Student</th>
                <th className="py-3 px-6 font-medium">Class & Section</th>
                <th className="py-3 px-6 font-medium text-right">Total Billed</th>
                <th className="py-3 px-6 font-medium text-right">Paid</th>
                <th className="py-3 px-6 font-medium text-right">Due</th>
                <th className="py-3 px-6 font-medium">Status</th>
                <th className="py-3 px-6 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr><td colSpan={7} className="py-8 text-center text-on-surface-variant">Loading fees...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-on-surface-variant">
                  {generating ? 'Generating monthly fees...' : 'No students match your filters for this month.'}
                </td></tr>
              ) : filteredData.map(({ student, fee }) => {
                const studentSection = sections.find(s => s.id === student.section_id);
                const studentClass = classes.find(c => c.id === studentSection?.class_id);
                
                const totalFee = fee ? fee.total_amount : 0;
                const paid = fee ? fee.amount_paid : 0;
                const due = fee ? (fee.total_amount || 0) - (fee.amount_paid || 0) : 0;
                const status = fee ? fee.status : 'none';

                return (
                <tr key={student.id} className="border-b border-outline-variant last:border-0 hover:bg-surface-bright">
                  <td className="py-4 px-6 font-medium text-on-surface">
                    {student.first_name} {student.last_name}
                    {student.student_id && <div className="text-xs text-on-surface-variant font-normal">{student.student_id}</div>}
                  </td>
                  <td className="py-4 px-6 text-on-surface">
                    {studentClass ? (
                      <div>
                        <div className="font-medium">{studentClass.name}</div>
                        <div className="text-xs text-on-surface-variant">{studentSection?.name}</div>
                      </div>
                    ) : (
                      <span className="text-on-surface-variant italic text-xs">Not assigned</span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-on-surface text-right font-medium">
                    {fee ? `Rs. ${totalFee.toFixed(2)}` : (student.monthly_fee ? `Rs. ${student.monthly_fee.toFixed(2)}` : '-')}
                  </td>
                  <td className="py-4 px-6 text-emerald-600 text-right font-medium">
                    {fee ? `Rs. ${paid.toFixed(2)}` : 'Rs. 0.00'}
                  </td>
                  <td className="py-4 px-6 text-error text-right font-medium">
                    {fee ? `Rs. ${due.toFixed(2)}` : (student.monthly_fee ? `Rs. ${student.monthly_fee.toFixed(2)}` : '-')}
                  </td>
                  <td className="py-4 px-6">
                    {!fee ? (
                      <span className="text-on-surface-variant italic text-xs">No Record</span>
                    ) : (
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium capitalize 
                        ${status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 
                          status === 'partial' ? 'bg-amber-50 text-amber-700' : 
                          'bg-error/10 text-error'}`}>
                        {status === 'paid' && <CheckCircle className="w-3 h-3" />}
                        {status === 'partial' && <AlertCircle className="w-3 h-3" />}
                        {status === 'pending' && <AlertCircle className="w-3 h-3" />}
                        {status}
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => openHistoryModal(student)}
                        className="px-3 py-1.5 bg-surface-container border border-outline-variant text-on-surface rounded text-xs font-medium hover:bg-surface-container-high transition-colors"
                      >
                        History
                      </button>
                      <button 
                        onClick={() => openPaymentModal(fee, student)}
                        className="px-3 py-1.5 bg-secondary text-on-secondary rounded text-xs font-medium hover:bg-secondary/90 transition-colors"
                      >
                        Manage Fee
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && selectedFeeRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-sm w-full p-6 shadow-lg border border-outline-variant">
            <h2 className="text-xl font-bold text-on-surface mb-4">Manage Fee Record</h2>
            <div className="mb-4 p-3 bg-surface-bright rounded-lg border border-outline-variant">
              <p className="font-medium text-on-surface">{selectedFeeRecord.student.first_name} {selectedFeeRecord.student.last_name}</p>
              <p className="text-xs text-on-surface-variant mb-2">{months.find(m => m.value === selectedFeeRecord.fee_month)?.label} {selectedFeeRecord.fee_year}</p>
            </div>
            
            <form onSubmit={handlePayment} className="space-y-4">
              {paymentMsg && (
                <div className={`p-3 rounded-md text-sm ${paymentMsg.startsWith('Error') ? 'bg-error/10 text-error' : 'bg-emerald-50 text-emerald-700'}`}>
                  {paymentMsg}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Total Billed (Rs.)</label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={editBilledAmount}
                      onChange={e => setEditBilledAmount(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Total Paid (Rs.)</label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={editPaidAmount}
                      onChange={e => setEditPaidAmount(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between text-sm mt-4 pt-4 border-t border-outline-variant/50">
                <span className="text-on-surface-variant">New Due Amount:</span>
                <span className="font-medium text-error">
                  Rs. {Math.max(0, (parseFloat(editBilledAmount) || 0) - (parseFloat(editPaidAmount) || 0)).toFixed(2)}
                </span>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 text-on-surface-variant hover:bg-surface-container rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-secondary text-on-secondary rounded-lg font-medium hover:bg-secondary/90 transition-colors"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryModalOpen && historyStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-lg w-full p-6 shadow-lg border border-outline-variant max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-on-surface">Payment History</h2>
              <button 
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface transition-colors"
              >
                Close
              </button>
            </div>
            
            <div className="mb-4 p-3 bg-surface-bright rounded-lg border border-outline-variant">
              <p className="font-medium text-on-surface">{historyStudent.first_name} {historyStudent.last_name}</p>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-on-surface-variant">Base Monthly Fee:</span>
                <span className="font-medium">Rs. {(historyStudent.monthly_fee || 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {historyRecords.length === 0 ? (
                <div className="text-center py-8 text-on-surface-variant text-sm">
                  No billing history found.
                </div>
              ) : (
                <div className="space-y-3">
                  {historyRecords.map((record) => (
                    <div key={record.id} className="flex justify-between items-center p-3 rounded-lg border border-outline-variant bg-surface-bright">
                      <div>
                        <div className="text-sm font-medium text-on-surface">
                          {months.find(m => m.value === record.fee_month)?.label} {record.fee_year}
                        </div>
                        <div className="text-xs text-on-surface-variant mt-1 flex gap-2">
                           <span className={record.status === 'paid' ? 'text-emerald-600' : record.status === 'partial' ? 'text-amber-600' : 'text-error'}>
                             {record.status.toUpperCase()}
                           </span>
                           {record.payment_date && <span>Paid on {record.payment_date}</span>}
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="font-medium">Billed: Rs. {Number(record.total_amount).toFixed(2)}</div>
                        <div className="text-emerald-600">Paid: Rs. {Number(record.amount_paid).toFixed(2)}</div>
                        {(record.total_amount - record.amount_paid) > 0 && <div className="text-error">Due: Rs. {Number(record.total_amount - record.amount_paid).toFixed(2)}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
