import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Check, X, Ban, MoreVertical, Download, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ConfirmModal } from '../../components/ConfirmModal';

export default function SchoolsList() {
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchSchools = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (data) setSchools(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('schools')
      .update({ status })
      .eq('id', id);
      
    if (!error) {
      fetchSchools();
    } else {
      alert(error.message);
    }
  };

  const deleteSchool = async (id: string) => {
    const { error } = await supabase
      .from('schools')
      .delete()
      .eq('id', id);
      
    if (!error) {
      fetchSchools();
    } else {
      alert(`Error deleting institute: ${error.message}`);
    }
  };

  const exportData = () => {
    const exportFormat = schools.map(s => ({
      'School Name': s.name,
      'Type': s.type,
      'Principal Name': s.principal_name,
      'Email': s.email,
      'Phone': s.phone || 'N/A',
      'Address': s.address || 'N/A',
      'Status': s.status,
      'Registration Date': new Date(s.created_at).toLocaleDateString()
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportFormat);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Schools");
    XLSX.writeFile(wb, "campusdesk_schools_export.xlsx");
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'approved': return 'bg-emerald-100 text-emerald-800';
      case 'pending': return 'bg-amber-100 text-amber-800';
      case 'suspended': return 'bg-rose-100 text-rose-800';
      case 'rejected': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-on-surface">Institute Management</h1>
          <p className="text-on-surface-variant mt-1">Manage and monitor institutional accounts across the network.</p>
        </div>
        <div className="flex gap-3 self-start sm:self-auto">
          <button onClick={exportData} className="flex items-center gap-2 px-4 py-2 bg-surface-container border border-outline-variant rounded-lg text-sm font-medium hover:bg-surface-container-high transition-colors">
            <Download className="w-4 h-4" /> Export to Excel
          </button>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="p-4 border-b border-outline-variant flex gap-4 bg-surface-bright">
          <input 
            type="text" 
            placeholder="Search institutes..." 
            className="flex-1 max-w-sm rounded-lg border border-outline-variant py-2 px-3 text-sm focus:ring-1 focus:ring-secondary"
          />
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant text-xs text-on-surface-variant uppercase bg-surface">
                <th className="py-3 px-6 font-medium">Institute Name</th>
                <th className="py-3 px-6 font-medium">Type</th>
                <th className="py-3 px-6 font-medium">Principal</th>
                <th className="py-3 px-6 font-medium">Contact</th>
                <th className="py-3 px-6 font-medium">Password</th>
                <th className="py-3 px-6 font-medium">Status</th>
                <th className="py-3 px-6 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center">Loading...</td>
                </tr>
              ) : schools.map((school) => (
                <tr key={school.id} className="border-b border-outline-variant last:border-0 hover:bg-surface-bright">
                  <td className="py-4 px-6 font-medium text-on-surface flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold">
                      {school.name.substring(0, 1)}
                    </div>
                    {school.name}
                  </td>
                  <td className="py-4 px-6 text-on-surface-variant">{school.type}</td>
                  <td className="py-4 px-6 text-on-surface">{school.principal_name}</td>
                  <td className="py-4 px-6 text-on-surface-variant">
                    <div>{school.email}</div>
                    <div className="text-xs text-on-surface-variant opacity-75">{school.phone}</div>
                  </td>
                  <td className="py-4 px-6">
                    {school.admin_password ? (
                      <span className="font-mono text-xs bg-surface-container px-2 py-1 rounded select-all">{school.admin_password}</span>
                    ) : (
                      <span className="text-on-surface-variant italic text-xs">Not Set (Old Record)</span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium capitalize ${getStatusColor(school.status)}`}>
                      {school.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-2">
                      {school.status === 'pending' && (
                        <>
                          <button onClick={() => updateStatus(school.id, 'approved')} title="Approve" className="p-1 rounded hover:bg-emerald-100 text-emerald-600 transition-colors">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => updateStatus(school.id, 'rejected')} title="Reject" className="p-1 rounded hover:bg-rose-100 text-rose-600 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {school.status === 'approved' && (
                        <button onClick={() => updateStatus(school.id, 'suspended')} title="Suspend" className="p-1 rounded hover:bg-amber-100 text-amber-600 transition-colors">
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                      {school.status === 'suspended' && (
                        <button onClick={() => updateStatus(school.id, 'approved')} title="Re-Activate" className="p-1 rounded hover:bg-emerald-100 text-emerald-600 transition-colors">
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => { setDeleteId(school.id); setDeleteConfirmOpen(true); }} title="Delete Institute" className="p-1 rounded hover:bg-error/10 text-error transition-colors">
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

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        title="Delete Institute"
        message="Are you sure you want to completely delete this institute and all of its associated data? This action cannot be undone."
        onConfirm={() => { if(deleteId) return deleteSchool(deleteId); }}
        onCancel={() => { setDeleteConfirmOpen(false); setDeleteId(null); }}
      />
    </div>
  );
}
