import toast from 'react-hot-toast';
import { useState } from 'react';
import useSWR from 'swr';
import { supabase, supabaseNoSession } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Download, Upload, Search, Edit2, Trash2 } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ConfirmModal } from '../../components/ConfirmModal';

export default function TeachersList() {
  const { schoolId } = useAuth();
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const { data: teachers, mutate, isLoading: loading } = useSWR(schoolId ? `teachers-${schoolId}` : null, async () => {
    const { data } = await supabase
      .from('teachers')
      .select(`
        *,
        profiles (first_name, last_name, role, gender)
      `)
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });
    return data || [];
  });
  const [addMsg, setAddMsg] = useState('');
  const [newTeacher, setNewTeacher] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    department: '',
    employeeId: '',
    gender: '',
    hireDate: new Date().toISOString().split('T')[0],
  });

  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [editMsg, setEditMsg] = useState('');

  const [importStatus, setImportStatus] = useState<{ loading: boolean; message: string; type: 'success' | 'error' | 'info' | '' }>({
    loading: false,
    message: '',
    type: ''
  });

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus({ loading: true, message: 'Processing file...', type: 'info' });

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
    
    // Basic validation
    const validData = data.filter(row => row.first_name && row.last_name && row.email && row.password);

    if (validData.length === 0) {
      setImportStatus({ loading: false, message: 'No valid teacher data found. Ensure first_name, last_name, email, and password columns exist.', type: 'error' });
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < validData.length; i++) {
      const row = validData[i];
      setImportStatus({ loading: true, message: `Importing teacher ${i + 1} of ${validData.length}...`, type: 'info' });
      
      try {
        let { data: authData, error: authError } = await supabaseNoSession.auth.signUp({
          email: String(row.email),
          password: String(row.password),
          options: {
            data: {
              first_name: String(row.first_name),
              last_name: String(row.last_name),
              role: 'teacher',
              school_id: schoolId
            }
          }
        });

        let userId = authData?.user?.id;

        if (authError) {
          if (authError.message.includes('User already registered')) {
            const { data: signInData, error: signInError } = await supabaseNoSession.auth.signInWithPassword({
              email: String(row.email),
              password: String(row.password),
            });

            if (signInError) throw new Error('Email registered with different password.');
            
            userId = signInData?.user?.id;
          } else {
            throw authError;
          }
        } else {
          if (!authData?.session) {
            await supabaseNoSession.auth.signInWithPassword({
              email: String(row.email),
              password: String(row.password),
            });
          }
        }

        if (userId) {
          const { error: profileError } = await supabaseNoSession
            .from('profiles')
            .upsert({
              id: userId,
              school_id: schoolId,
              role: 'teacher',
              first_name: String(row.first_name),
              last_name: String(row.last_name),
              gender: row.gender ? String(row.gender).toLowerCase() : null
            }, { onConflict: 'id' });

          if (profileError) throw profileError;

          const { error: teacherError } = await supabaseNoSession
            .from('teachers')
            .upsert({
              id: userId,
              school_id: schoolId,
              department: row.department ? String(row.department) : null,
              employee_id: row.employee_id ? String(row.employee_id) : null,
              hire_date: row.hire_date ? new Date(row.hire_date).toISOString().split('T')[0] : null,
              login_password: row.password ? String(row.password) : null,
            }, { onConflict: 'id' });
          
          await supabaseNoSession.auth.signOut();

          if (teacherError) throw teacherError;
          successCount++;
        }
      } catch (error: any) {
        console.error(`Failed to import teacher ${row.email}:`, error);
        failCount++;
        await supabaseNoSession.auth.signOut();
      }
    }

    setImportStatus({ 
      loading: false, 
      message: `Import complete. ${successCount} successful, ${failCount} failed.`, 
      type: failCount === 0 ? 'success' : 'error' 
    });
    await mutate();
    
    setTimeout(() => {
      setImportStatus(prev => ({ ...prev, message: '', type: '' }));
    }, 6000);
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;
    
    setAddMsg('Creating teacher account...');
    
    // Create user without logging out the current admin
    let { data: authData, error: authError } = await supabaseNoSession.auth.signUp({
      email: newTeacher.email,
      password: newTeacher.password,
      options: {
        data: {
          first_name: newTeacher.firstName,
          last_name: newTeacher.lastName,
          role: 'teacher',
          school_id: schoolId
        }
      }
    });

    let userId = authData?.user?.id;

    if (authError) {
      if (authError.message.includes('User already registered')) {
        // Attempt to sign in to retrieve the user ID so we can link them
        const { data: signInData, error: signInError } = await supabaseNoSession.auth.signInWithPassword({
          email: newTeacher.email,
          password: newTeacher.password,
        });

        if (signInError) {
          setAddMsg('Error: This email is already registered, but the password provided is incorrect. Please use the original password to link this account, or use a new email address.');
          return;
        }
        
        userId = signInData?.user?.id;
      } else {
        setAddMsg(`Error: ${authError.message}`);
        return;
      }
    } else {
      // If sign up succeeded, we might need to explicitly sign in to ensure the session exists
      if (!authData?.session) {
        await supabaseNoSession.auth.signInWithPassword({
          email: newTeacher.email,
          password: newTeacher.password,
        });
      }
    }

    if (userId) {
      // Upsert profile using the new user's session to bypass RLS
      const { error: profileError } = await supabaseNoSession
        .from('profiles')
        .upsert({
          id: userId,
          school_id: schoolId,
          role: 'teacher',
          first_name: newTeacher.firstName,
          last_name: newTeacher.lastName,
          gender: newTeacher.gender || null
        }, { onConflict: 'id' });

      if (profileError) {
        setAddMsg(`Error creating profile: ${profileError.message}`);
        // Ensure we sign out the temporary session
        await supabaseNoSession.auth.signOut();
        return;
      }

      // Upsert teacher record
      const { error: teacherError } = await supabaseNoSession
        .from('teachers')
        .upsert({
          id: userId,
          school_id: schoolId,
          department: newTeacher.department,
          employee_id: newTeacher.employeeId,
          hire_date: newTeacher.hireDate,
          login_password: newTeacher.password
        }, { onConflict: 'id' });

      // Sign out the temporary session
      await supabaseNoSession.auth.signOut();

      if (teacherError) {
        setAddMsg(`Error creating teacher record: ${teacherError.message}`);
        return;
      }

      setAddMsg('Teacher successfully created and added to the database.');
      await mutate();
      setTimeout(() => {
        setIsAddModalOpen(false);
        setAddMsg('');
        setNewTeacher({ firstName: '', lastName: '', email: '', password: '', department: '', employeeId: '', gender: '', hireDate: new Date().toISOString().split('T')[0] });
      }, 2000);
    }
  };

  const handleUpdateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !editingTeacher) return;
    
    setEditMsg('Updating teacher...');
    
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        first_name: editingTeacher.first_name,
        last_name: editingTeacher.last_name,
        gender: editingTeacher.gender || null
      })
      .eq('id', editingTeacher.id);

    if (profileError) {
      setEditMsg(`Error updating profile: ${profileError.message}`);
      return;
    }

    const { error: teacherError } = await supabase
      .from('teachers')
      .update({
        department: editingTeacher.department,
        employee_id: editingTeacher.employee_id,
        hire_date: editingTeacher.hire_date,
        login_password: editingTeacher.login_password
      })
      .eq('id', editingTeacher.id);

    if (teacherError) {
      setEditMsg(`Error updating teacher record: ${teacherError.message}`);
      return;
    }

    setEditMsg('Teacher successfully updated.');
    await mutate();
    setTimeout(() => {
      setEditingTeacher(null);
      setEditMsg('');
    }, 1500);
  };

  const handleDeleteTeacher = async (id: string) => {
    // First delete from teachers, then profiles
    const { error: tError } = await supabase.from('teachers').delete().eq('id', id);
    if (tError) {
      toast.error(`Error deleting teacher from school: ${tError.message}`);
      return;
    }
    
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    
    if (error) {
      toast.error(`Error deleting teacher profile: ${error.message}`);
    } else {
      await mutate();
    }
  };

  const exportData = () => {
    const exportFormat = filteredTeachers.map(t => ({
      'First Name': t.profiles?.first_name || '',
      'Last Name': t.profiles?.last_name || '',
      'Employee ID': t.employee_id || '',
      'Department': t.department || '',
      'Hire Date': t.hire_date || '',
      'Password': t.login_password || ''
    }));

    const csv = Papa.unparse(exportFormat);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'teachers_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredTeachers = (teachers || []).filter(t => {
    const fullName = `${t.profiles?.first_name} ${t.profiles?.last_name}`.toLowerCase();
    return fullName.includes(search.toLowerCase()) || 
           (t.employee_id && t.employee_id.toLowerCase().includes(search.toLowerCase()));
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-on-surface">Teacher Management</h1>
          <p className="text-on-surface-variant mt-1">Manage teaching staff, assignments, and access credentials.</p>
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
            <Plus className="w-4 h-4" /> Add Teacher
          </button>
        </div>
      </div>

      {importStatus.message && (
        <div className={`p-4 rounded-lg text-sm font-medium flex items-center justify-between ${
          importStatus.type === 'error' ? 'bg-error/10 text-error' :
          importStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700' :
          'bg-blue-50 text-blue-700'
        }`}>
          {importStatus.message}
          <button onClick={() => setImportStatus({ loading: false, message: '', type: '' })} className="hover:opacity-70">
            &times;
          </button>
        </div>
      )}

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="p-4 border-b border-outline-variant flex gap-4 bg-surface-bright">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input 
              type="text" 
              placeholder="Search teachers..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant text-xs text-on-surface-variant uppercase bg-surface">
                <th className="py-3 px-6 font-medium">Name & Gender</th>
                <th className="py-3 px-6 font-medium">Department</th>
                <th className="py-3 px-6 font-medium">Hire Date</th>
                <th className="py-3 px-6 font-medium">Password</th>
                <th className="py-3 px-6 font-medium">Status</th>
                <th className="py-3 px-6 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center">Loading...</td></tr>
              ) : filteredTeachers.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center">No teachers found.</td></tr>
              ) : filteredTeachers.map((teacher) => (
                <tr key={teacher.id} className="border-b border-outline-variant last:border-0 hover:bg-surface-bright">
                  <td className="py-4 px-6 font-medium text-on-surface flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-fixed-dim text-on-primary-fixed flex items-center justify-center font-bold text-xs">
                      {teacher.profiles?.first_name?.[0]}{teacher.profiles?.last_name?.[0]}
                    </div>
                    <div>
                      {teacher.profiles?.first_name} {teacher.profiles?.last_name}
                      <div className="text-xs text-on-surface-variant font-normal">
                        Gender: {teacher.profiles?.gender ? teacher.profiles?.gender.charAt(0).toUpperCase() + teacher.profiles?.gender.slice(1) : '-'} | {teacher.employee_id || 'ID Pending'}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-on-surface">
                    {teacher.department ? (
                       <span className="bg-surface-container px-2 py-1 rounded text-xs font-medium text-on-surface-variant">{teacher.department}</span>
                    ) : '-'}
                  </td>
                  <td className="py-4 px-6 text-on-surface-variant">
                    {teacher.hire_date ? new Date(teacher.hire_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="py-4 px-6">
                    {teacher.login_password ? (
                      <span className="font-mono text-xs bg-surface-container px-2 py-1 rounded select-all">{teacher.login_password}</span>
                    ) : (
                      <span className="text-on-surface-variant italic text-xs">Not Set</span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
                      Active
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => setEditingTeacher({
                          id: teacher.id,
                          first_name: teacher.profiles?.first_name || '',
                          last_name: teacher.profiles?.last_name || '',
                          gender: teacher.profiles?.gender || '',
                          department: teacher.department || '',
                          employee_id: teacher.employee_id || '',
                          login_password: teacher.login_password || '',
                          hire_date: teacher.hire_date || new Date().toISOString().split('T')[0]
                        })}
                        className="p-1.5 text-on-surface-variant hover:text-secondary hover:bg-secondary/10 rounded-lg transition-colors"
                        title="Edit Teacher"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => { setDeleteId(teacher.id); setDeleteConfirmOpen(true); }}
                        className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                        title="Delete Teacher"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-md w-full p-6 shadow-lg border border-outline-variant">
            <h2 className="text-xl font-bold text-on-surface mb-4">Add New Teacher</h2>
            <p className="text-sm text-on-surface-variant mb-4">
              Create an account for the new teacher. They can use these credentials to log in.
            </p>
            <form onSubmit={handleAddTeacher} className="space-y-4">
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
                    value={newTeacher.firstName}
                    onChange={e => setNewTeacher({...newTeacher, firstName: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={newTeacher.lastName}
                    onChange={e => setNewTeacher({...newTeacher, lastName: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={newTeacher.email}
                    onChange={e => setNewTeacher({...newTeacher, email: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Password</label>
                  <input
                    type="text"
                    required
                    value={newTeacher.password}
                    onChange={e => setNewTeacher({...newTeacher, password: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Gender</label>
                  <select
                    value={newTeacher.gender}
                    onChange={e => setNewTeacher({...newTeacher, gender: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Employee ID</label>
                  <input
                    type="text"
                    value={newTeacher.employeeId}
                    onChange={e => setNewTeacher({...newTeacher, employeeId: e.target.value})}
                    placeholder="Optional"
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Department / Subject</label>
                  <input
                    type="text"
                    required
                    value={newTeacher.department}
                    onChange={e => setNewTeacher({...newTeacher, department: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Hire Date</label>
                  <input
                    type="date"
                    required
                    value={newTeacher.hireDate}
                    onChange={e => setNewTeacher({...newTeacher, hireDate: e.target.value})}
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
                  Create Teacher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingTeacher && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-md w-full p-6 shadow-lg border border-outline-variant">
            <h2 className="text-xl font-bold text-on-surface mb-4">Edit Teacher</h2>
            <form onSubmit={handleUpdateTeacher} className="space-y-4">
              {editMsg && (
                <div className={`p-3 rounded-md text-sm ${editMsg.startsWith('Error') ? 'bg-error/10 text-error' : 'bg-emerald-50 text-emerald-700'}`}>
                  {editMsg}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={editingTeacher.first_name}
                    onChange={e => setEditingTeacher({...editingTeacher, first_name: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={editingTeacher.last_name}
                    onChange={e => setEditingTeacher({...editingTeacher, last_name: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Password</label>
                  <input
                    type="text"
                    value={editingTeacher.login_password}
                    onChange={e => setEditingTeacher({...editingTeacher, login_password: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Gender</label>
                  <select
                    value={editingTeacher.gender || ''}
                    onChange={e => setEditingTeacher({...editingTeacher, gender: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Employee ID</label>
                  <input
                    type="text"
                    value={editingTeacher.employee_id}
                    onChange={e => setEditingTeacher({...editingTeacher, employee_id: e.target.value})}
                    placeholder="Optional"
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Department</label>
                  <input
                    type="text"
                    value={editingTeacher.department}
                    onChange={e => setEditingTeacher({...editingTeacher, department: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Hire Date</label>
                  <input
                    type="date"
                    required
                    value={editingTeacher.hire_date}
                    onChange={e => setEditingTeacher({...editingTeacher, hire_date: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setEditingTeacher(null)}
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
        title="Delete Teacher"
        message="Are you sure you want to delete this teacher? This action cannot be undone."
        onConfirm={() => { if(deleteId) return handleDeleteTeacher(deleteId); }}
        onCancel={() => { setDeleteConfirmOpen(false); setDeleteId(null); }}
      />
    </div>
  );
}
