import { useState } from 'react';
import useSWR from 'swr';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Download, Upload, Search, Filter, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ConfirmModal } from '../../components/ConfirmModal';

export default function StudentsList() {
  const { schoolId } = useAuth();
  
  const { data, mutate, isLoading: loading } = useSWR(schoolId ? `students-${schoolId}` : null, async () => {
    // Fetch students with their section info for the current session
    const [studentsData, classesData, sectionsData, sessionData] = await Promise.all([
      supabase.from('students').select('*').eq('school_id', schoolId).order('created_at', { ascending: false }),
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

    return {
      students: studentsWithSections,
      classes: classesData.data || [],
      sections: sectionsData.data || []
    };
  });

  const students = data?.students || [];
  const classes = data?.classes || [];
  const sections = data?.sections || [];

  const [search, setSearch] = useState('');
  
  // Filter states
  const [filterClassId, setFilterClassId] = useState('');
  const [filterSectionId, setFilterSectionId] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [editStudent, setEditStudent] = useState<any>(null);
  const [newStudent, setNewStudent] = useState({
    first_name: '',
    last_name: '',
    student_id: '',
    guardian_name: '',
    guardian_contact: '',
    class_id: '',
    section_id: '',
    monthly_fee: '',
    gender: ''
  });
  const [addMsg, setAddMsg] = useState('');

  const [importStatus, setImportStatus] = useState<{ loading: boolean; message: string; type: 'success' | 'error' | '' }>({
    loading: false,
    message: '',
    type: ''
  });

  const getOrCreateSession = async () => {
    let { data: session } = await supabase
      .from('academic_sessions')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_current', true)
      .single();

    if (!session) {
      const year = new Date().getFullYear();
      const { data: newSession, error } = await supabase
        .from('academic_sessions')
        .insert({
          
          name: `${year}-${year + 1}`,
          start_date: `${year}-01-01`,
          end_date: `${year}-12-31`,
          is_current: true
        })
        .select()
        .single();
      
      if (!error && newSession) session = newSession;
    }
    return session;
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;
    setAddMsg('Adding student...');
    
    try {
      // 1. Create Student
      const { data: studentData, error: studentError } = await supabase.from('students').insert([{
        school_id: schoolId,
        first_name: newStudent.first_name,
        last_name: newStudent.last_name,
        student_id: newStudent.student_id || null,
        guardian_name: newStudent.guardian_name || null,
        guardian_contact: newStudent.guardian_contact || null,
        gender: newStudent.gender || null,
        monthly_fee: newStudent.monthly_fee ? parseFloat(newStudent.monthly_fee) : 0,
        status: 'active'
      }]).select().single();

      if (studentError) throw studentError;

      // 2. Assign to class/section if selected
      if (studentData && newStudent.section_id) {
        const session = await getOrCreateSession();
        if (session) {
          const { error: sectionError } = await supabase.from('student_sections').insert({
            student_id: studentData.id,
            section_id: newStudent.section_id,
            session_id: session.id
          });
          if (sectionError) throw sectionError;
        }
      }

      setAddMsg('Student added successfully.');
      await mutate();
      setIsAddModalOpen(false);
      setNewStudent({ first_name: '', last_name: '', student_id: '', guardian_name: '', guardian_contact: '', class_id: '', section_id: '', monthly_fee: '', gender: '' });
    } catch (error: any) {
      setAddMsg(`Error: ${error.message}`);
    }
  };

  const openEditModal = (student: any) => {
    const studentSection = sections.find(s => s.id === student.section_id);
    setEditStudent({
      ...student,
      class_id: studentSection?.class_id || ''
    });
    setAddMsg('');
    setIsEditModalOpen(true);
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !editStudent) return;
    setAddMsg('Updating student...');

    try {
      const { error: studentError } = await supabase.from('students')
        .update({
          first_name: editStudent.first_name,
          last_name: editStudent.last_name,
          student_id: editStudent.student_id || null,
          guardian_name: editStudent.guardian_name || null,
          guardian_contact: editStudent.guardian_contact || null,
          gender: editStudent.gender || null,
          monthly_fee: editStudent.monthly_fee ? parseFloat(editStudent.monthly_fee) : 0,
        })
        .eq('id', editStudent.id);

      if (studentError) throw studentError;

      // Manage section assignment
      const session = await getOrCreateSession();
      if (session) {
        if (editStudent.section_id) {
          // Check if exists
          const { data: existing } = await supabase.from('student_sections')
            .select('id')
            .eq('student_id', editStudent.id)
            .eq('session_id', session.id)
            .maybeSingle();

          if (existing) {
            const { error: updateError } = await supabase.from('student_sections')
              .update({ section_id: editStudent.section_id })
              .eq('id', existing.id);
            if (updateError) throw updateError;
          } else {
            const { error: insertError } = await supabase.from('student_sections').insert({
              student_id: editStudent.id,
              section_id: editStudent.section_id,
              session_id: session.id
            });
            if (insertError) throw insertError;
          }
        } else {
          // If no section, remove existing mapping
          const { error: deleteError } = await supabase.from('student_sections')
            .delete()
            .eq('student_id', editStudent.id)
            .eq('session_id', session.id);
          if (deleteError) throw deleteError;
        }
      }

      setAddMsg('Student updated successfully.');
      await mutate();
      setIsEditModalOpen(false);
      setEditStudent(null);
    } catch (error: any) {
      setAddMsg(`Error: ${error.message}`);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    try {
      console.log('Attempting to delete student with ID:', id);
      
      // First try to delete child records manually from client to prevent FK errors if CASCADE is not set
      const tablesToClean = [
        'student_sections', 
        'attendance', 
        'marks', 
        'student_fees', 
        'assignment_submissions', 
        'fee_payments'
      ];
      
      for (const table of tablesToClean) {
        await supabase.from(table).delete().eq('student_id', id);
      }

      // Now delete the student
      const { error } = await supabase.from('students').delete().eq('id', id);
      
      if (error) {
        console.error('Supabase delete error:', error);
        toast.error(`Error deleting student: ${error.message}`);
      } else {
        toast.success('Student deleted successfully');
        await mutate();
      }
    } catch (err: any) {
      console.error('Unexpected error during delete:', err);
      toast.error(`Unexpected error: ${err.message}`);
    }
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus({ loading: true, message: 'Processing file...', type: '' });

    if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          await processImport(results.data);
        },
        error: (error) => {
          setImportStatus({ loading: false, message: `Error parsing CSV: ${error.message}`, type: 'error' });
        }
      });
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);
          await processImport(data);
        } catch (error: any) {
          setImportStatus({ loading: false, message: `Error reading Excel file: ${error.message}`, type: 'error' });
        }
      };
      reader.onerror = () => setImportStatus({ loading: false, message: 'Error reading file', type: 'error' });
      reader.readAsBinaryString(file);
    } else {
      setImportStatus({ loading: false, message: 'Unsupported file format. Please upload .csv, .xls, or .xlsx', type: 'error' });
    }
    
    // Reset file input
    e.target.value = '';
  };

  const processImport = async (data: any[]) => {
    if (!schoolId) return;
    
    // Basic validation & transformation
    const validData = data
      .filter(row => row.first_name && row.last_name)
      .map(row => ({
        school_id: schoolId,
        student_id: row.student_id ? String(row.student_id) : null,
        first_name: String(row.first_name),
        last_name: String(row.last_name),
        dob: row.dob ? new Date(row.dob).toISOString().split('T')[0] : null,
        gender: row.gender ? String(row.gender).toLowerCase() : null,
        guardian_name: row.guardian_name ? String(row.guardian_name) : null,
        guardian_contact: row.guardian_contact ? String(row.guardian_contact) : null,
        status: row.status ? String(row.status).toLowerCase() : 'active',
      }));

    if (validData.length === 0) {
      setImportStatus({ loading: false, message: 'No valid student data found in the file. Ensure first_name and last_name columns exist.', type: 'error' });
      return;
    }

    try {
      const { error } = await supabase.from('students').insert(validData);
      if (error) throw error;
      
      setImportStatus({ loading: false, message: `Successfully imported ${validData.length} students.`, type: 'success' });
      await mutate();
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setImportStatus(prev => prev.type === 'success' ? { ...prev, message: '', type: '' } : prev);
      }, 5000);
    } catch (error: any) {
      setImportStatus({ loading: false, message: `Import failed: ${error.message}`, type: 'error' });
    }
  };

  const exportData = () => {
    const exportFormat = filteredStudents.map(student => {
      const studentSection = sections.find(s => s.id === student.section_id);
      const studentClass = classes.find(c => c.id === studentSection?.class_id);
      
      return {
        'Registration No': student.student_id || '',
        'First Name': student.first_name,
        'Last Name': student.last_name,
        'Class': studentClass ? studentClass.name : 'Not assigned',
        'Section': studentSection ? studentSection.name : 'Not assigned',
        'Guardian Name': student.guardian_name || '',
        'Guardian Contact': student.guardian_contact || '',
        'Status': student.status
      };
    });

    const csv = Papa.unparse(exportFormat);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'students_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredStudents = students.filter(s => {
    const searchMatch = (s.first_name + ' ' + s.last_name).toLowerCase().includes(search.toLowerCase()) || 
      (s.student_id && s.student_id.toLowerCase().includes(search.toLowerCase()));
    
    let classMatch = true;
    let sectionMatch = true;

    if (filterClassId) {
      const studentSection = sections.find(sec => sec.id === s.section_id);
      classMatch = studentSection?.class_id === filterClassId;
    }

    if (filterSectionId) {
      sectionMatch = s.section_id === filterSectionId;
    }

    return searchMatch && classMatch && sectionMatch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-on-surface">Student Records</h1>
          <p className="text-on-surface-variant mt-1">Manage and overview all enrolled students.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={exportData} className="flex items-center gap-2 px-4 py-2 bg-surface-container border border-outline-variant rounded-lg text-sm font-medium hover:bg-surface-container-high transition-colors">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          
          <label className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${importStatus.loading ? 'bg-surface-container text-on-surface-variant opacity-50 cursor-not-allowed' : 'bg-secondary-fixed text-on-secondary-fixed hover:bg-secondary-fixed/80'}`}>
            <Upload className="w-4 h-4" /> {importStatus.loading ? 'Importing...' : 'Import CSV/Excel'}
            <input type="file" accept=".csv, .xlsx, .xls" className="hidden" onChange={handleImportCSV} disabled={importStatus.loading} />
          </label>
          
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-on-secondary rounded-lg text-sm font-medium hover:bg-secondary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Student
          </button>
        </div>
      </div>

      {importStatus.message && (
        <div className={`p-4 rounded-lg text-sm font-medium flex items-center justify-between ${
          importStatus.type === 'error' ? 'bg-error/10 text-error' :
          importStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700' :
          'bg-surface-container text-on-surface'
        }`}>
          {importStatus.message}
          <button onClick={() => setImportStatus({ loading: false, message: '', type: '' })} className="hover:opacity-70">
            &times;
          </button>
        </div>
      )}

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="p-4 border-b border-outline-variant flex flex-wrap gap-4 bg-surface-bright">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input 
              type="text" 
              placeholder="Search by Name or Registration No..." 
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
          <button className="flex items-center gap-2 px-4 py-2 bg-surface-container border border-outline-variant rounded-lg text-sm font-medium hover:bg-surface-container-high transition-colors">
            <Filter className="w-4 h-4" /> More Filters
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant text-xs text-on-surface-variant uppercase bg-surface">
                <th className="py-3 px-6 font-medium">Registration No</th>
                <th className="py-3 px-6 font-medium">Name & Gender</th>
                <th className="py-3 px-6 font-medium">Class & Section</th>
                <th className="py-3 px-6 font-medium">Guardian Name</th>
                <th className="py-3 px-6 font-medium">Status</th>
                <th className="py-3 px-6 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center">Loading...</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center">No students found.</td></tr>
              ) : filteredStudents.map((student) => {
                const studentSection = sections.find(s => s.id === student.section_id);
                const studentClass = classes.find(c => c.id === studentSection?.class_id);
                
                return (
                <tr key={student.id} className="border-b border-outline-variant last:border-0 hover:bg-surface-bright">
                  <td className="py-4 px-6 font-medium text-on-surface-variant">{student.student_id || '-'}</td>
                  <td className="py-4 px-6 font-medium text-on-surface flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold text-xs">
                      {student.first_name[0]}{student.last_name[0]}
                    </div>
                    <div>
                      {student.first_name} {student.last_name}
                      <div className="text-xs text-on-surface-variant font-normal">
                        Gender: {student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1) : '-'} | Enrolled: {new Date(student.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-on-surface">
                    {studentClass ? (
                      <div>
                        <div className="font-medium">{studentClass.name}</div>
                        <div className="text-xs text-on-surface-variant">Section: {studentSection?.name}</div>
                      </div>
                    ) : (
                      <span className="text-on-surface-variant italic text-xs">Not assigned</span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-on-surface">
                    <div>
                      {student.guardian_name || '-'}
                      {student.guardian_contact && <div className="text-xs text-on-surface-variant">{student.guardian_contact}</div>}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium capitalize 
                      ${student.status === 'active' ? 'text-emerald-700' : 'text-amber-700'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${student.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                      {student.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button onClick={() => openEditModal(student)} className="p-1.5 text-on-surface-variant hover:text-secondary hover:bg-secondary/10 rounded mr-2 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setDeleteId(student.id); setDeleteConfirmOpen(true); }} className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-md w-full p-6 shadow-lg border border-outline-variant">
            <h2 className="text-xl font-bold text-on-surface mb-4">Add New Student</h2>
            <form onSubmit={handleAddStudent} className="space-y-4">
              {addMsg && (
                <div className={`p-3 rounded-md text-sm ${addMsg.startsWith('Error') ? 'bg-error/10 text-error' : 'bg-emerald-50 text-emerald-700'}`}>
                  {addMsg}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={newStudent.first_name}
                    onChange={e => setNewStudent({...newStudent, first_name: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={newStudent.last_name}
                    onChange={e => setNewStudent({...newStudent, last_name: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Registration No (Optional)</label>
                  <input
                    type="text"
                    value={newStudent.student_id}
                    onChange={e => setNewStudent({...newStudent, student_id: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Gender</label>
                  <select
                    value={newStudent.gender}
                    onChange={e => setNewStudent({...newStudent, gender: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Class</label>
                  <select
                    value={newStudent.class_id}
                    onChange={e => setNewStudent({...newStudent, class_id: e.target.value, section_id: ''})}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                  >
                    <option value="">Select Class</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Section</label>
                  <select
                    value={newStudent.section_id}
                    onChange={e => setNewStudent({...newStudent, section_id: e.target.value})}
                    disabled={!newStudent.class_id}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm disabled:opacity-50"
                  >
                    <option value="">Select Section</option>
                    {sections.filter(s => s.class_id === newStudent.class_id).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Guardian Name (Optional)</label>
                <input
                  type="text"
                  value={newStudent.guardian_name}
                  onChange={e => setNewStudent({...newStudent, guardian_name: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Guardian Contact (Optional)</label>
                  <input
                    type="text"
                    value={newStudent.guardian_contact}
                    onChange={e => setNewStudent({...newStudent, guardian_contact: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Monthly Fee (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newStudent.monthly_fee}
                    onChange={e => setNewStudent({...newStudent, monthly_fee: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-on-surface-variant hover:bg-surface-container rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-secondary text-on-secondary rounded-lg font-medium hover:bg-secondary/90 transition-colors"
                >
                  Add Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Student Modal */}
      {isEditModalOpen && editStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-md w-full p-6 shadow-lg border border-outline-variant">
            <h2 className="text-xl font-bold text-on-surface mb-4">Edit Student</h2>
            <form onSubmit={handleEditStudent} className="space-y-4">
              {addMsg && (
                <div className={`p-3 rounded-md text-sm ${addMsg.startsWith('Error') ? 'bg-error/10 text-error' : 'bg-emerald-50 text-emerald-700'}`}>
                  {addMsg}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={editStudent.first_name}
                    onChange={e => setEditStudent({...editStudent, first_name: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={editStudent.last_name}
                    onChange={e => setEditStudent({...editStudent, last_name: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Registration No (Optional)</label>
                  <input
                    type="text"
                    value={editStudent.student_id || ''}
                    onChange={e => setEditStudent({...editStudent, student_id: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Gender</label>
                  <select
                    value={editStudent.gender || ''}
                    onChange={e => setEditStudent({...editStudent, gender: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Class</label>
                  <select
                    value={editStudent.class_id}
                    onChange={e => setEditStudent({...editStudent, class_id: e.target.value, section_id: ''})}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                  >
                    <option value="">Select Class</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Section</label>
                  <select
                    value={editStudent.section_id || ''}
                    onChange={e => setEditStudent({...editStudent, section_id: e.target.value})}
                    disabled={!editStudent.class_id}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm disabled:opacity-50"
                  >
                    <option value="">Select Section</option>
                    {sections.filter(s => s.class_id === editStudent.class_id).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Guardian Name (Optional)</label>
                <input
                  type="text"
                  value={editStudent.guardian_name || ''}
                  onChange={e => setEditStudent({...editStudent, guardian_name: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Guardian Contact (Optional)</label>
                  <input
                    type="text"
                    value={editStudent.guardian_contact || ''}
                    onChange={e => setEditStudent({...editStudent, guardian_contact: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Monthly Fee (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editStudent.monthly_fee || ''}
                    onChange={e => setEditStudent({...editStudent, monthly_fee: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-on-surface-variant hover:bg-surface-container rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-secondary text-on-secondary rounded-lg font-medium hover:bg-secondary/90 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        title="Delete Student"
        message="Are you sure you want to delete this student? This action cannot be undone."
        onConfirm={() => { if(deleteId) return handleDeleteStudent(deleteId); }}
        onCancel={() => { setDeleteConfirmOpen(false); setDeleteId(null); }}
      />
    </div>
  );
}
