import toast from 'react-hot-toast';
import { useState } from 'react';
import useSWR from 'swr';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Edit2, Trash2, LayoutGrid, Users } from 'lucide-react';
import { ConfirmModal } from '../../components/ConfirmModal';

export default function ClassesList() {
  const { schoolId } = useAuth();
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'class' | 'section' | null>(null);
  
  const { data, mutate, isLoading: loading } = useSWR(schoolId ? `classes-${schoolId}` : null, async () => {
    const [classesData, sectionsData] = await Promise.all([
      supabase.from('classes').select('*').eq('school_id', schoolId).order('name'),
      supabase.from('sections').select('*').eq('school_id', schoolId).order('name')
    ]);
    return {
      classes: classesData.data || [],
      sections: sectionsData.data || []
    };
  });

  const classes = data?.classes || [];
  const sections = data?.sections || [];

  // Class Modal
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [className, setClassName] = useState('');
  
  // Section Modal
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [sectionName, setSectionName] = useState('');

  const [msg, setMsg] = useState('');

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !className.trim()) return;

    const { error } = await supabase.from('classes').insert({
      school_id: schoolId,
      name: className.trim()
    });

    if (error) {
      setMsg(`Error: ${error.message}`);
    } else {
      await mutate();
      setClassName('');
      setIsClassModalOpen(false);
    }
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !selectedClassId || !sectionName.trim()) return;

    const { error } = await supabase.from('sections').insert({
      school_id: schoolId,
      class_id: selectedClassId,
      name: sectionName.trim()
    });

    if (error) {
      setMsg(`Error: ${error.message}`);
    } else {
      await mutate();
      setSectionName('');
      setSelectedClassId(null);
      setIsSectionModalOpen(false);
    }
  };

  const deleteClass = async (id: string) => {
    const { error } = await supabase.from('classes').delete().eq('id', id);
    if (error) {
       toast.error(`Error deleting class: ${error.message}`);
    } else {
       await mutate();
    }
  };

  const deleteSection = async (id: string) => {
    const { error } = await supabase.from('sections').delete().eq('id', id);
    if (error) {
       toast.error(`Error deleting section: ${error.message}`);
    } else {
       await mutate();
    }
  };

  const executeDelete = async () => {
    if (!deleteId || !deleteType) return;
    if (deleteType === 'class') {
      await deleteClass(deleteId);
    } else {
      await deleteSection(deleteId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-on-surface">Classes & Sections</h1>
          <p className="text-on-surface-variant mt-1">Manage academic classes and their respective custom sections.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsClassModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-on-secondary rounded-lg text-sm font-medium hover:bg-secondary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Class
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-on-surface-variant">Loading...</div>
      ) : classes.length === 0 ? (
        <div className="text-center py-12 bg-surface-container-lowest rounded-xl border border-outline-variant">
          <LayoutGrid className="w-12 h-12 mx-auto text-on-surface-variant/50 mb-3" />
          <p className="text-on-surface font-medium">No classes found</p>
          <p className="text-sm text-on-surface-variant mt-1">Add your first class to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map(cls => (
            <div key={cls.id} className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-outline-variant bg-surface-bright flex justify-between items-center">
                <h3 className="font-bold text-lg text-on-surface">{cls.name}</h3>
                <div className="flex gap-2">
                  <button onClick={() => { setDeleteId(cls.id); setDeleteType('class'); setDeleteConfirmOpen(true); }} className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-4 flex-1">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Sections</span>
                  <button 
                    onClick={() => { setSelectedClassId(cls.id); setIsSectionModalOpen(true); }}
                    className="text-xs font-medium text-secondary hover:text-secondary/80 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {sections.filter(s => s.class_id === cls.id).length === 0 ? (
                    <p className="text-sm text-on-surface-variant italic">No sections added.</p>
                  ) : (
                    sections.filter(s => s.class_id === cls.id).map(sec => (
                      <div key={sec.id} className="flex justify-between items-center p-2 rounded bg-surface-container-highest border border-outline-variant/50">
                        <span className="text-sm font-medium text-on-surface">{sec.name}</span>
                        <button onClick={() => { setDeleteId(sec.id); setDeleteType('section'); setDeleteConfirmOpen(true); }} className="text-on-surface-variant hover:text-error">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Class Modal */}
      {isClassModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-sm w-full p-6 shadow-lg border border-outline-variant">
            <h2 className="text-xl font-bold text-on-surface mb-4">Add Class</h2>
            <form onSubmit={handleAddClass} className="space-y-4">
              {msg && <div className="text-sm text-error">{msg}</div>}
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Class Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Grade 10, Class 1"
                  value={className}
                  onChange={e => setClassName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => { setIsClassModalOpen(false); setMsg(''); }} className="px-4 py-2 text-on-surface-variant hover:bg-surface-container rounded-lg font-medium transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-secondary text-on-secondary rounded-lg font-medium hover:bg-secondary/90 transition-colors">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Section Modal */}
      {isSectionModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-sm w-full p-6 shadow-lg border border-outline-variant">
            <h2 className="text-xl font-bold text-on-surface mb-4">Add Section</h2>
            <form onSubmit={handleAddSection} className="space-y-4">
              {msg && <div className="text-sm text-error">{msg}</div>}
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Section Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., A, Tulip, Red Rose"
                  value={sectionName}
                  onChange={e => setSectionName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                />
                <p className="text-xs text-on-surface-variant mt-1">You can name the section whatever fits your school's system.</p>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => { setIsSectionModalOpen(false); setMsg(''); setSelectedClassId(null); }} className="px-4 py-2 text-on-surface-variant hover:bg-surface-container rounded-lg font-medium transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-secondary text-on-secondary rounded-lg font-medium hover:bg-secondary/90 transition-colors">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        title={`Delete ${deleteType === 'class' ? 'Class' : 'Section'}`}
        message={`Are you sure you want to delete this ${deleteType}? This action cannot be undone.`}
        onConfirm={executeDelete}
        onCancel={() => { setDeleteConfirmOpen(false); setDeleteId(null); setDeleteType(null); }}
      />
    </div>
  );
}
