import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Edit2, Trash2, BookOpen, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { ConfirmModal } from '../../components/ConfirmModal';

export default function Subjects() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [classSubjects, setClassSubjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', code: '', class_ids: [] as string[] });

  const [errorMsg, setErrorMsg] = useState('');
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();

    // Set up real-time subscription
    const subscription = supabase
      .channel('subjects_management')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subjects' }, payload => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_subjects' }, payload => {
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

      const [subjectsRes, classesRes, classSubjectsRes] = await Promise.all([
        supabase.from('subjects').select('*').eq('school_id', profile.school_id).order('name'),
        supabase.from('classes').select('*').eq('school_id', profile.school_id).order('name'),
        supabase.from('class_subjects').select('*').eq('school_id', profile.school_id)
      ]);

      if (subjectsRes.error) {
        console.error('Subjects fetch error:', subjectsRes.error);
        setErrorMsg('Error fetching subjects: ' + subjectsRes.error.message);
      } else if (subjectsRes.data) {
        setSubjects(subjectsRes.data);
      }

      if (classesRes.data) setClasses(classesRes.data);
      if (classSubjectsRes.data) setClassSubjects(classSubjectsRes.data);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setErrorMsg('Unexpected error: ' + (error.message || error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', user.id).single();
      if (!profile?.school_id) {
        toast.error('You do not have a school assigned to your profile.');
        return;
      }

      let subjectId = editingSubject?.id;

      if (editingSubject) {
        const { error } = await supabase.from('subjects').update({ name: formData.name, code: formData.code }).eq('id', editingSubject.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('subjects').insert([{ 
          school_id: profile.school_id, 
          name: formData.name, 
          code: formData.code 
        }]).select().single();
        if (error) {
          console.error('Insert subject error:', error);
          throw error;
        }
        subjectId = data.id;
      }

      // Update class links
      // Delete old links
      if (editingSubject) {
        await supabase.from('class_subjects').delete().eq('subject_id', subjectId);
      }
      
      // Insert new links
      if (formData.class_ids.length > 0) {
        const classSubjectData = formData.class_ids.map(classId => ({
          school_id: profile.school_id,
          class_id: classId,
          subject_id: subjectId
        }));
        
        const { error: csError } = await supabase.from('class_subjects').insert(classSubjectData);
        if (csError) {
          console.error('Failed to link classes:', csError);
          toast.error('Subject saved, but linking to classes failed. The class_subjects table might be missing or there is an RLS issue.');
        }
      }

      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving subject:', error);
      toast.error('Failed to save subject: ' + (error.message || 'Unknown error'));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      console.log('Attempting to delete subject with ID:', id);

      const tablesToClean = [
        'class_subjects', 
        'teacher_subjects', 
        'timetables', 
        'assignments', 
        'marks'
      ];
      
      for (const table of tablesToClean) {
        await supabase.from(table).delete().eq('subject_id', id);
      }

      const { error } = await supabase.from('subjects').delete().eq('id', id);
      if (error) {
        console.error('Supabase delete error:', error);
        toast.error(`Error deleting subject: ${error.message}`);
        return;
      }
      
      toast.success('Subject deleted successfully!');
      fetchData();
    } catch (error: any) {
      console.error('Error deleting subject:', error);
      toast.error('Failed to delete subject: ' + (error.message || 'Unknown error'));
    }
  };

  const openModal = (subject?: any) => {
    if (subject) {
      setEditingSubject(subject);
      const linkedClasses = classSubjects.filter(cs => cs.subject_id === subject.id).map(cs => cs.class_id);
      setFormData({ name: subject.name, code: subject.code || '', class_ids: linkedClasses });
    } else {
      setEditingSubject(null);
      setFormData({ name: '', code: '', class_ids: [] });
    }
    setIsModalOpen(true);
  };

  const toggleClassSelection = (classId: string) => {
    setFormData(prev => ({
      ...prev,
      class_ids: prev.class_ids.includes(classId) 
        ? prev.class_ids.filter(id => id !== classId)
        : [...prev.class_ids, classId]
    }));
  };

  const filteredSubjects = subjects.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || (s.code && s.code.toLowerCase().includes(searchQuery.toLowerCase())));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            Subject Management
          </h1>
          <p className="text-on-surface-variant mt-1">Create and link subjects to classes.</p>
        </div>
        <button onClick={() => openModal()} className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-5 h-5" /> Add Subject
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
              placeholder="Search subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-container rounded-lg border-none focus:ring-2 focus:ring-primary text-on-surface"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
        ) : filteredSubjects.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant">No subjects found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSubjects.map(subject => {
              const linkedClasses = classSubjects.filter(cs => cs.subject_id === subject.id);
              const classNames = linkedClasses.map(cs => classes.find(c => c.id === cs.class_id)?.name).filter(Boolean);
              
              return (
                <div key={subject.id} className="bg-surface-container p-4 rounded-xl border border-outline-variant flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-lg text-on-surface">{subject.name}</h3>
                      {subject.code && <span className="text-sm text-on-surface-variant font-mono bg-surface-container-high px-2 py-0.5 rounded">{subject.code}</span>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openModal(subject)} className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => { setDeleteId(subject.id); setDeleteConfirmOpen(true); }} className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="mt-auto pt-4 border-t border-outline-variant">
                    <p className="text-xs text-on-surface-variant font-medium mb-1">Linked Classes:</p>
                    <div className="flex flex-wrap gap-1">
                      {classNames.length > 0 ? classNames.map((name, i) => (
                        <span key={i} className="text-xs bg-secondary/10 text-secondary px-2 py-1 rounded-full">{name}</span>
                      )) : <span className="text-xs text-on-surface-variant italic">Not linked to any class</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-surface-container-lowest rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-on-surface mb-4">{editingSubject ? 'Edit Subject' : 'Add Subject'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Subject Name *</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 bg-surface-container border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary text-on-surface" placeholder="e.g. Mathematics" />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Subject Code</label>
                <input type="text" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} className="w-full px-4 py-2 bg-surface-container border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary text-on-surface" placeholder="e.g. MATH-101" />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">Link to Classes (Optional)</label>
                <div className="max-h-40 overflow-y-auto bg-surface-container border border-outline-variant rounded-lg p-2 flex flex-col gap-1">
                  {classes.map(c => (
                    <label key={c.id} className="flex items-center gap-2 p-2 hover:bg-surface-container-high rounded cursor-pointer">
                      <input type="checkbox" checked={formData.class_ids.includes(c.id)} onChange={() => toggleClassSelection(c.id)} className="w-4 h-4 text-primary rounded border-outline-variant" />
                      <span className="text-sm text-on-surface">{c.name}</span>
                    </label>
                  ))}
                  {classes.length === 0 && <p className="text-sm text-on-surface-variant p-2">No classes found.</p>}
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-on-surface-variant hover:bg-surface-container rounded-lg font-medium transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-on-primary rounded-lg font-medium hover:bg-primary/90 transition-colors">Save Subject</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        title="Delete Subject"
        message="Are you sure you want to delete this subject? This will also remove the subject from any assigned classes, teachers, and timetables."
        onConfirm={() => { if(deleteId) return handleDelete(deleteId); }}
        onCancel={() => { setDeleteConfirmOpen(false); setDeleteId(null); }}
      />
    </div>
  );
}
