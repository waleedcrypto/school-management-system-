import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Trash2, Search, GraduationCap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ConfirmModal } from '../../components/ConfirmModal';

export default function TeacherAssignments() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [formData, setFormData] = useState({
    teacher_id: '',
    subject_id: '',
    section_id: ''
  });

  const [errorMsg, setErrorMsg] = useState('');
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();

    const subscription = supabase
      .channel('teacher_assignments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teacher_subjects' }, payload => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const { data: profile, error: profileError } = await supabase.from('profiles').select('school_id').eq('id', user.id).single();
      if (profileError) {
        setErrorMsg('Error fetching profile: ' + profileError.message);
        return;
      }
      if (!profile?.school_id) {
        setErrorMsg('No school assigned to profile.');
        return;
      }

      const [assignmentsRes, teachersRes, subjectsRes, classesRes, sectionsRes] = await Promise.all([
        supabase.from('teacher_subjects').select('id, teacher_id, subject_id, section_id'),
        supabase.from('teachers').select('id, profiles(first_name, last_name)').eq('school_id', profile.school_id),
        supabase.from('subjects').select('id, name').eq('school_id', profile.school_id),
        supabase.from('classes').select('id, name').eq('school_id', profile.school_id).order('name'),
        supabase.from('sections').select('id, name, class_id').eq('school_id', profile.school_id).order('name')
      ]);

      if (assignmentsRes.error) {
        console.error('Assignments fetch error:', assignmentsRes.error);
        setErrorMsg('Error fetching assignments: ' + assignmentsRes.error.message);
      } else if (assignmentsRes.data) {
        setAssignments(assignmentsRes.data);
      }

      if (teachersRes.data) setTeachers(teachersRes.data);
      if (subjectsRes.data) setSubjects(subjectsRes.data);
      if (classesRes.data) setClasses(classesRes.data);
      if (sectionsRes.data) setSections(sectionsRes.data);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setErrorMsg('Unexpected error: ' + (error.message || error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.teacher_id || !formData.subject_id || !formData.section_id) {
      toast.error('Please fill all fields');
      return;
    }
    
    try {
      // Check if assignment exists
      const existing = assignments.find(a => a.subject_id === formData.subject_id && a.section_id === formData.section_id);
      if (existing) {
        
        const { error } = await supabase.from('teacher_subjects').update({ teacher_id: formData.teacher_id }).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('teacher_subjects').insert([formData]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error assigning teacher:', error);
      toast.error('Failed to assign teacher: ' + (error.message || 'Unknown error'));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('teacher_subjects').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error: any) {
      console.error('Error removing assignment:', error);
      toast.error('Failed to remove assignment: ' + (error.message || 'Unknown error'));
    }
  };

  const getTeacherName = (id: string) => {
    const t = teachers.find(t => t.id === id);
    return t ? `${t.profiles?.first_name} ${t.profiles?.last_name}` : 'Unknown';
  };

  // Group assignments by class -> section
  const mappedData = classes.map(c => ({
    ...c,
    sections: sections.filter(s => s.class_id === c.id).map(s => ({
      ...s,
      assignments: assignments.filter(a => a.section_id === s.id).map(a => ({
        ...a,
        teacherName: getTeacherName(a.teacher_id),
        subjectName: subjects.find(sub => sub.id === a.subject_id)?.name || 'Unknown Subject'
      }))
    }))
  })).filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                   c.sections.some(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                   s.assignments.some(a => a.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) || a.subjectName.toLowerCase().includes(searchQuery.toLowerCase()))));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary" />
            Teacher Assignments
          </h1>
          <p className="text-on-surface-variant mt-1">Assign teachers to classes, sections, and subjects.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-5 h-5" /> Assign Teacher
        </button>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 sm:p-6">
        {errorMsg && (
          <div className="mb-6 p-4 bg-error/10 text-error border border-error/20 rounded-lg">
            {errorMsg}
          </div>
        )}

        <div className="mb-6 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Search by class, section, subject or teacher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-container rounded-lg border-none focus:ring-2 focus:ring-primary text-on-surface"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
        ) : mappedData.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant">No assignments found.</div>
        ) : (
          <div className="space-y-6">
            {mappedData.map(c => (
              <div key={c.id} className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant">
                <div className="bg-surface-container-high px-4 py-3 border-b border-outline-variant">
                  <h3 className="font-bold text-lg text-on-surface">Class: {c.name}</h3>
                </div>
                <div className="p-4 space-y-4">
                  {c.sections.length === 0 ? (
                    <p className="text-sm text-on-surface-variant">No sections found for this class.</p>
                  ) : (
                    c.sections.map(s => (
                      <div key={s.id} className="bg-surface-container-lowest rounded-lg border border-outline-variant overflow-hidden">
                        <div className="bg-surface-container px-4 py-2 border-b border-outline-variant flex justify-between items-center">
                          <h4 className="font-medium text-on-surface">Section {s.name}</h4>
                          <span className="text-xs text-on-surface-variant">{s.assignments.length} subjects assigned</span>
                        </div>
                        <div className="p-0">
                          {s.assignments.length === 0 ? (
                            <p className="text-sm text-on-surface-variant p-4">No teachers assigned to this section yet.</p>
                          ) : (
                            <div className="divide-y divide-outline-variant">
                              {s.assignments.map(a => (
                                <div key={a.id} className="flex justify-between items-center p-3 hover:bg-surface-container transition-colors">
                                  <div className="flex flex-col">
                                    <span className="font-medium text-on-surface">{a.subjectName}</span>
                                    <span className="text-sm text-on-surface-variant flex items-center gap-1">
                                      Teacher: <span className="text-on-surface font-medium">{a.teacherName}</span>
                                    </span>
                                  </div>
                                  <button onClick={() => { setDeleteId(a.id); setDeleteConfirmOpen(true); }} className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors" title="Remove assignment">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-surface-container-lowest rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-on-surface mb-4">Assign Teacher</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Teacher *</label>
                <select required value={formData.teacher_id} onChange={e => setFormData({ ...formData, teacher_id: e.target.value })} className="w-full px-4 py-2 bg-surface-container border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary text-on-surface">
                  <option value="">Select a teacher</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.profiles?.first_name} {t.profiles?.last_name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Class *</label>
                <select required value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setFormData({ ...formData, section_id: '' }); }} className="w-full px-4 py-2 bg-surface-container border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary text-on-surface">
                  <option value="">Select a class</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Section *</label>
                <select required disabled={!selectedClass} value={formData.section_id} onChange={e => setFormData({ ...formData, section_id: e.target.value })} className="w-full px-4 py-2 bg-surface-container border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary text-on-surface">
                  <option value="">Select a section</option>
                  {sections.filter(s => s.class_id === selectedClass).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Subject *</label>
                <select required value={formData.subject_id} onChange={e => setFormData({ ...formData, subject_id: e.target.value })} className="w-full px-4 py-2 bg-surface-container border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary text-on-surface">
                  <option value="">Select a subject</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-on-surface-variant hover:bg-surface-container rounded-lg font-medium transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-on-primary rounded-lg font-medium hover:bg-primary/90 transition-colors">Assign</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        title="Delete Assignment"
        message="Are you sure you want to remove this teacher's assignment?"
        onConfirm={() => { if(deleteId) return handleDelete(deleteId); }}
        onCancel={() => { setDeleteConfirmOpen(false); setDeleteId(null); }}
      />
    </div>
  );
}
