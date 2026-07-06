import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { School, Users, BookOpen, AlertCircle, TrendingUp, CheckCircle, Clock } from 'lucide-react';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({
    totalSchools: 0,
    activeSchools: 0,
    pendingSchools: 0,
    totalStudents: 0,
    totalTeachers: 0,
  });
  const [pendingList, setPendingList] = useState<any[]>([]);

  useEffect(() => {
    async function loadStats() {
      // Get school counts
      const { data: schools } = await supabase.from('schools').select('status');
      if (schools) {
        const total = schools.length;
        const active = schools.filter(s => s.status === 'approved').length;
        const pending = schools.filter(s => s.status === 'pending').length;
        
        setStats(prev => ({
          ...prev,
          totalSchools: total,
          activeSchools: active,
          pendingSchools: pending
        }));
      }

      // Get pending schools list
      const { data: pendingData } = await supabase
        .from('schools')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (pendingData) setPendingList(pendingData);

      // We'd normally aggregate students and teachers here using Supabase rpc 
      // or count queries. For Phase 1, we can do count queries if accessible.
      const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true });
      const { count: teacherCount } = await supabase.from('teachers').select('*', { count: 'exact', head: true });
      
      setStats(prev => ({
        ...prev,
        totalStudents: studentCount || 0,
        totalTeachers: teacherCount || 0
      }));
    }

    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-on-surface">System Overview</h1>
          <p className="text-on-surface-variant mt-1">Super Admin Dashboard • Real-time metrics across all institutions.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-lg bg-primary-fixed/20 flex items-center justify-center text-primary">
              <School className="w-6 h-6" />
            </div>
            <span className="flex items-center text-sm font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded">
              <TrendingUp className="w-3 h-3 mr-1" /> System-wide
            </span>
          </div>
          <h3 className="text-sm font-label-md text-on-surface-variant uppercase tracking-wider">Total Institutes</h3>
          <p className="text-3xl font-bold text-on-surface mt-1">{stats.totalSchools}</p>
          <div className="flex items-center mt-4 text-sm text-on-surface-variant">
            <span className="flex items-center text-secondary mr-4">
              <CheckCircle className="w-4 h-4 mr-1" /> {stats.activeSchools} Active
            </span>
            <span className="flex items-center text-error">
              <Clock className="w-4 h-4 mr-1" /> {stats.pendingSchools} Pending
            </span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-lg bg-secondary-fixed/20 flex items-center justify-center text-secondary">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-sm font-label-md text-on-surface-variant uppercase tracking-wider">Total Students</h3>
          <p className="text-3xl font-bold text-on-surface mt-1">{stats.totalStudents}</p>
          <p className="text-sm text-on-surface-variant mt-4">System-wide enrollment</p>
        </div>

        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-lg bg-tertiary-fixed/20 flex items-center justify-center text-tertiary-container">
              <BookOpen className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-sm font-label-md text-on-surface-variant uppercase tracking-wider">Total Teachers</h3>
          <p className="text-3xl font-bold text-on-surface mt-1">{stats.totalTeachers}</p>
          <p className="text-sm text-on-surface-variant mt-4">System-wide faculty</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-bold text-on-surface">Pending Approvals</h2>
              <p className="text-sm text-on-surface-variant">Recently registered institutes awaiting verification.</p>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant text-xs text-on-surface-variant uppercase">
                  <th className="pb-3 font-medium">Institution Name</th>
                  <th className="pb-3 font-medium">Principal / Contact</th>
                  <th className="pb-3 font-medium">Date Applied</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {pendingList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-on-surface-variant">No pending approvals.</td>
                  </tr>
                ) : (
                  pendingList.map((school) => (
                    <tr key={school.id} className="border-b border-outline-variant last:border-0 hover:bg-surface-bright">
                      <td className="py-4 font-medium text-on-surface">{school.name}</td>
                      <td className="py-4">
                        <div className="text-on-surface">{school.principal_name}</div>
                        <div className="text-xs text-on-surface-variant">{school.email}</div>
                      </td>
                      <td className="py-4 text-on-surface-variant">
                        {new Date(school.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded bg-amber-100 text-amber-800 text-xs font-medium">
                          Pending
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
