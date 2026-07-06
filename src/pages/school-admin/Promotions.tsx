import { useState } from 'react';
import useSWR from 'swr';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Search, Filter, TrendingUp, CheckSquare, Square, RefreshCcw, Layers, Undo2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Promotions() {
  const { schoolId } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'section' | 'bulk'>('section');
  
  const [fromClassId, setFromClassId] = useState('');
  const [fromSectionId, setFromSectionId] = useState('');
  const [toClassId, setToClassId] = useState('');
  const [toSectionId, setToSectionId] = useState('');
  const [search, setSearch] = useState('');
  
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [promoting, setPromoting] = useState(false);

  const { data, isLoading } = useSWR(schoolId ? `promotions-${schoolId}` : null, async () => {
    const [classesRes, sectionsRes, sessionRes] = await Promise.all([
      supabase.from('classes').select('*').eq('school_id', schoolId).order('name'),
      supabase.from('sections').select('*').eq('school_id', schoolId).order('name'),
      supabase.from('academic_sessions').select('id').eq('school_id', schoolId).eq('is_current', true).maybeSingle()
    ]);
    return {
      classes: classesRes.data || [],
      sections: sectionsRes.data || [],
      session: sessionRes.data
    };
  });

  const { data: students, mutate: mutateStudents, isLoading: loadingStudents } = useSWR(
    (schoolId && data?.session?.id && fromSectionId) ? `students-promo-${fromSectionId}` : null,
    async () => {
      const { data: stdSections } = await supabase.from('student_sections')
        .select('student_id')
        .eq('section_id', fromSectionId)
        .eq('session_id', data!.session!.id);
        
      if (!stdSections || stdSections.length === 0) return [];
      
      const studentIds = stdSections.map(s => s.student_id);
      
      const { data: studentsData } = await supabase.from('students')
        .select('*')
        .in('id', studentIds)
        .eq('status', 'active')
        .order('first_name');
        
      if (!studentsData) return [];
      
      const { data: marks } = await supabase.from('marks')
        .select('student_id, marks_obtained, total_marks')
        .in('student_id', studentIds);

      const { data: audits } = await supabase.from('notices')
        .select('id, content, created_at')
        .eq('target_audience', 'promotion_log')
        .order('created_at', { ascending: false });
        
      return studentsData.map(student => {
        const stMarks = marks?.filter(m => m.student_id === student.id) || [];
        let obtained = 0;
        let total = 0;
        stMarks.forEach(m => {
          obtained += Number(m.marks_obtained || 0);
          total += Number(m.total_marks || 0);
        });
        const percentage = total > 0 ? (obtained / total) * 100 : 0;
        
        const lastPromotion = audits?.find(a => {
          try {
            const data = JSON.parse(a.content);
            return data.student_id === student.id;
          } catch (e) {
            return false;
          }
        });
        
        let lastPromoObj = null;
        if (lastPromotion) {
          try {
            lastPromoObj = { id: lastPromotion.id, ...JSON.parse(lastPromotion.content), created_at: lastPromotion.created_at };
          } catch(e) {}
        }
        
        return { ...student, obtained, total, percentage, lastPromotion: lastPromoObj };
      });
    }
  );

  const classes = data?.classes || [];
  const sections = data?.sections || [];
  const fromSections = sections.filter(s => s.class_id === fromClassId);
  const toSections = sections.filter(s => s.class_id === toClassId);

  const filteredStudents = (students || []).filter(s => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      s.first_name?.toLowerCase().includes(term) ||
      s.last_name?.toLowerCase().includes(term) ||
      s.student_id?.toLowerCase().includes(term)
    );
  });

  const handleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s.id));
    }
  };

  const handleSelect = (id: string) => {
    if (selectedStudents.includes(id)) {
      setSelectedStudents(selectedStudents.filter(s => s !== id));
    } else {
      setSelectedStudents([...selectedStudents, id]);
    }
  };

  const [bulkMappings, setBulkMappings] = useState<Record<string, string>>({});

  const handleUndo = async (student: any) => {
    if (!data?.session) return;
    const promo = student.lastPromotion;
    if (!promo) {
      toast.error('No promotion history found for this student.');
      return;
    }
    
    let targetSectionId = promo.from_section_id;
    
    if (!targetSectionId && promo.from_section && promo.from_class) {
      const clsName = (promo.from_class || '').trim().toLowerCase();
      const secName = (promo.from_section || '').trim().toLowerCase();
      const cls = classes.find(c => (c.name || '').trim().toLowerCase() === clsName);
      if (cls) {
        const sec = sections.find(s => s.class_id === cls.id && (s.name || '').trim().toLowerCase() === secName);
        if (sec) {
          targetSectionId = sec.id;
        }
      }
    }

    if (!targetSectionId) {
      toast.error(`Cannot undo: Missing previous section data for ${promo.from_class || ''} - ${promo.from_section || ''}.`);
      return;
    }
    
    if (!window.confirm(`Are you sure you want to undo promotion for ${student.first_name}? They will be moved back to ${promo.from_class || 'their previous class'} - ${promo.from_section || 'section'}.`)) return;

        try {
      // First, check if they are already in the target section
      if (targetSectionId === fromSectionId) {
         // They are already in the correct section, just delete the invalid log
         await supabase.from('notices').delete().eq('id', promo.id);
         toast.success(`Removed invalid promotion log for ${student.first_name}`);
         mutateStudents();
         return;
      }

      const { error: updateError } = await supabase.from('student_sections')
        .update({ section_id: targetSectionId })
        .eq('student_id', student.id)
        .eq('session_id', data.session.id);
        
      if (updateError) throw updateError;

      const { error: deleteError } = await supabase.from('notices')
        .delete()
        .eq('id', promo.id);
        
      if (deleteError) throw deleteError;
      toast.success(`Promotion undone for ${student.first_name}`);
      mutateStudents();
    } catch (err: any) {
      console.error("Undo error:", err);
      toast.error(err.message || 'Error undoing promotion');
    }
  };

  const handleBulkPromote = async () => {
    if (!data?.session) {
      toast.error('No active academic session found');
      return;
    }
    
    const mappingsToExecute = Object.entries(bulkMappings).filter(([_, toId]) => toId !== '');
    if (mappingsToExecute.length === 0) {
      toast.error('Please map at least one section to a destination class/section');
      return;
    }

    if (!window.confirm(`Are you sure you want to promote ${mappingsToExecute.length} sections? This will move all students in these sections to their new sections.`)) return;

    setPromoting(true);
    try {
      let totalPromoted = 0;
      
      for (const [fromSecId, toSecId] of mappingsToExecute) {
        const { data: stdSections } = await supabase.from('student_sections')
          .select('student_id')
          .eq('section_id', fromSecId)
          .eq('session_id', data.session.id);
          
        if (!stdSections || stdSections.length === 0) continue;
        
        const fSec = sections.find(s => s.id === fromSecId);
        const fCls = classes.find(c => c.id === fSec?.class_id);
        const tSec = sections.find(s => s.id === toSecId);
        const tCls = classes.find(c => c.id === tSec?.class_id);
        
        for (const { student_id } of stdSections) {
          const { error: updateError } = await supabase.from('student_sections')
            .update({ section_id: toSecId })
            .eq('student_id', student_id)
            .eq('session_id', data.session.id);
            
          if (updateError) throw updateError;
          
          await supabase.from('notices').insert({
            school_id: schoolId,
            title: 'Bulk Student Promotion',
            target_audience: 'promotion_log',
            content: JSON.stringify({
              student_id: student_id,
              from_class: fCls?.name,
              from_class_id: fCls?.id,
              from_section: fSec?.name,
              from_section_id: fSec?.id,
              to_class: tCls?.name,
              to_class_id: tCls?.id,
              to_section: tSec?.name,
              to_section_id: tSec?.id
            })
          });
          
          totalPromoted++;
        }
      }
      
      toast.success(`${totalPromoted} student(s) promoted successfully across ${mappingsToExecute.length} sections.`);
      setBulkMappings({});
      mutateStudents();
    } catch (err: any) {
      toast.error(err.message || 'Error bulk promoting students');
    } finally {
      setPromoting(false);
    }
  };

  const handlePromote = async () => {
    if (!data?.session) {
      toast.error('No active academic session found');
      return;
    }
    if (!toSectionId) {
      toast.error('Please select a destination class and section');
      return;
    }
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student to promote');
      return;
    }

    setPromoting(true);
    try {
      // Find the names of classes/sections for logging
      const fClass = classes.find(c => c.id === fromClassId)?.name;
      const fSection = sections.find(s => s.id === fromSectionId)?.name;
      const tClass = classes.find(c => c.id === toClassId)?.name;
      const tSection = sections.find(s => s.id === toSectionId)?.name;

      for (const studentId of selectedStudents) {
        const { error: updateError } = await supabase.from('student_sections')
          .update({ section_id: toSectionId })
          .eq('student_id', studentId)
          .eq('session_id', data.session.id);
          
        if (updateError) throw updateError;
        
        // Use user object or system profile if available. We don't have profileId easily accessible here.
        // We can just rely on RLS and schoolId for audit.
        await supabase.from('notices').insert({
          school_id: schoolId,
          title: 'Student Promotion',
          target_audience: 'promotion_log',
          content: JSON.stringify({
            student_id: studentId,
            from_class: fClass,
            from_class_id: fromClassId,
            from_section: fSection,
            from_section_id: fromSectionId,
            to_class: tClass,
            to_class_id: toClassId,
            to_section: tSection,
            to_section_id: toSectionId
          })
        });
      }
      
      toast.success(`${selectedStudents.length} student(s) promoted successfully`);
      setSelectedStudents([]);
      mutateStudents();
    } catch (err: any) {
      toast.error(err.message || 'Error promoting students');
    } finally {
      setPromoting(false);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-on-surface">Loading promotion system...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-on-surface mb-2">Student Promotion</h1>
          <p className="text-on-surface-variant">Promote students to the next class individually or in bulk.</p>
        </div>
        <div className="flex bg-surface-variant rounded-lg p-1">
          <button
            onClick={() => setActiveTab('section')}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center space-x-2 ${activeTab === 'section' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            <Filter className="w-4 h-4" />
            <span>Section Promotes</span>
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center space-x-2 ${activeTab === 'bulk' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            <Layers className="w-4 h-4" />
            <span>Bulk School Promotes</span>
          </button>
        </div>
      </div>

      {activeTab === 'bulk' ? (
        <div className="bg-surface rounded-xl shadow-sm border border-border p-6 space-y-6">
          <div className="flex items-center justify-between mb-4 border-b border-border pb-4">
            <div>
              <h2 className="text-lg font-semibold text-on-surface flex items-center">
                <Layers className="w-5 h-5 mr-2 text-primary" />
                Map Sections to Promote
              </h2>
              <p className="text-sm text-on-surface-variant mt-1">Select the destination section for each current section. Only mapped sections will be promoted.</p>
            </div>
            <button
              onClick={handleBulkPromote}
              disabled={promoting || Object.values(bulkMappings).filter(Boolean).length === 0}
              className="flex items-center justify-center space-x-2 px-6 py-2 bg-primary text-on-primary rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <TrendingUp className="w-5 h-5" />
              <span>{promoting ? 'Promoting...' : `Execute Bulk Promotion (${Object.values(bulkMappings).filter(Boolean).length} mapped)`}</span>
            </button>
          </div>
          
          <div className="space-y-4">
            {classes.map(cls => {
              const clsSections = sections.filter(s => s.class_id === cls.id);
              if (clsSections.length === 0) return null;
              
              return (
                <div key={cls.id} className="border border-border rounded-lg p-4 bg-background">
                  <h3 className="font-semibold text-on-surface mb-3 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-primary mr-2"></span>
                    {cls.name}
                  </h3>
                  <div className="space-y-3 pl-4 border-l-2 border-surface-variant ml-1">
                    {clsSections.map(sec => (
                      <div key={sec.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <div className="flex-1 text-sm font-medium text-on-surface">
                          {cls.name} - {sec.name}
                        </div>
                        <div className="flex items-center text-on-surface-variant">
                          <TrendingUp className="w-4 h-4 mx-2" />
                        </div>
                        <div className="flex-1">
                          <select
                            value={bulkMappings[sec.id] || ''}
                            onChange={(e) => setBulkMappings({ ...bulkMappings, [sec.id]: e.target.value })}
                            className="w-full p-2 bg-surface border border-border rounded-lg text-sm text-on-surface focus:ring-2 focus:ring-primary"
                          >
                            <option value="">Do not promote / Hold</option>
                            {classes.map(toCls => (
                              <optgroup key={`opt-${toCls.id}`} label={toCls.name}>
                                {sections.filter(toSec => toSec.class_id === toCls.id).map(toSec => (
                                  <option key={`to-${toSec.id}`} value={toSec.id}>
                                    {toCls.name} - {toSec.name}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            
            {classes.length === 0 && (
              <div className="text-center py-8 text-on-surface-variant">No classes and sections found in this school.</div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* FROM SECTION */}
        <div className="bg-surface p-6 rounded-xl shadow-sm border border-border">
          <h2 className="text-lg font-semibold text-on-surface mb-4 flex items-center">
            <Filter className="w-5 h-5 mr-2 text-primary" />
            Current Class (From)
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1">Class</label>
              <select
                value={fromClassId}
                onChange={(e) => { setFromClassId(e.target.value); setFromSectionId(''); setSelectedStudents([]); }}
                className="w-full p-2 bg-background border border-border rounded-lg text-on-surface focus:ring-2 focus:ring-primary"
              >
                <option value="">Select Class</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1">Section</label>
              <select
                value={fromSectionId}
                onChange={(e) => { setFromSectionId(e.target.value); setSelectedStudents([]); }}
                className="w-full p-2 bg-background border border-border rounded-lg text-on-surface focus:ring-2 focus:ring-primary"
                disabled={!fromClassId}
              >
                <option value="">Select Section</option>
                {fromSections.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* TO SECTION */}
        <div className="bg-surface p-6 rounded-xl shadow-sm border border-border">
          <h2 className="text-lg font-semibold text-on-surface mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-success" />
            Next Class (To)
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1">Class</label>
              <select
                value={toClassId}
                onChange={(e) => { setToClassId(e.target.value); setToSectionId(''); }}
                className="w-full p-2 bg-background border border-border rounded-lg text-on-surface focus:ring-2 focus:ring-primary"
              >
                <option value="">Select Class</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1">Section</label>
              <select
                value={toSectionId}
                onChange={(e) => setToSectionId(e.target.value)}
                className="w-full p-2 bg-background border border-border rounded-lg text-on-surface focus:ring-2 focus:ring-primary"
                disabled={!toClassId}
              >
                <option value="">Select Section</option>
                {toSections.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* STUDENTS LIST */}
      <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Search students by name or roll number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-on-surface focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex space-x-3 w-full md:w-auto">
            <button
              onClick={handlePromote}
              disabled={promoting || selectedStudents.length === 0 || !toSectionId}
              className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-6 py-2 bg-primary text-on-primary rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <TrendingUp className="w-5 h-5" />
              <span>{promoting ? 'Promoting...' : `Promote Selected (${selectedStudents.length})`}</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-variant text-on-surface-variant">
              <tr>
                <th className="p-4 w-12">
                  <button onClick={handleSelectAll} className="focus:outline-none">
                    {selectedStudents.length > 0 && selectedStudents.length === filteredStudents.length ? (
                      <CheckSquare className="w-5 h-5 text-primary" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                </th>
                <th className="p-4 font-semibold">Roll No</th>
                <th className="p-4 font-semibold">Student Name</th>
                <th className="p-4 font-semibold">Academic Record (Marks)</th>
                <th className="p-4 font-semibold text-right">Percentage</th>
                <th className="p-4 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {fromSectionId && !loadingStudents ? (
                filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-surface-variant/50 transition-colors">
                      <td className="p-4">
                        <button onClick={() => handleSelect(student.id)} className="focus:outline-none">
                          {selectedStudents.includes(student.id) ? (
                            <CheckSquare className="w-5 h-5 text-primary" />
                          ) : (
                            <Square className="w-5 h-5 text-on-surface-variant" />
                          )}
                        </button>
                      </td>
                      <td className="p-4 font-mono text-sm">{student.student_id || '-'}</td>
                      <td className="p-4 font-medium text-on-surface">
                        {student.first_name} {student.last_name}
                      </td>
                      <td className="p-4 text-on-surface-variant">
                        {student.total > 0 ? (
                          <span>{student.obtained} / {student.total}</span>
                        ) : (
                          <span className="text-xs text-on-surface-variant/70 italic">No marks recorded</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {student.total > 0 ? (
                          <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                            student.percentage >= 80 ? 'bg-success/10 text-success' :
                            student.percentage >= 50 ? 'bg-warning/10 text-warning' :
                            'bg-error/10 text-error'
                          }`}>
                            <span>{student.percentage.toFixed(1)}%</span>
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-4 text-right text-sm">
                        {student.lastPromotion ? (
                          <div className="flex flex-col items-end">
                            <span className="text-success font-medium flex items-center">
                              <TrendingUp className="w-3 h-3 mr-1" />
                              Promoted
                            </span>
                            <span className="text-xs text-on-surface-variant">
                              {new Date(student.lastPromotion.created_at).toLocaleDateString()}
                            </span>
                            <button
                              onClick={() => handleUndo(student)}
                              className="mt-1 text-xs text-primary hover:text-primary/80 flex items-center transition-colors"
                              title={`Undo promotion back to ${student.lastPromotion.from_class}`}
                            >
                              <Undo2 className="w-3 h-3 mr-1" />
                              Undo
                            </button>
                          </div>
                        ) : (
                          <span className="text-on-surface-variant italic text-xs">No history</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-on-surface-variant">
                      No students found in this section.
                    </td>
                  </tr>
                )
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-on-surface-variant">
                    {loadingStudents ? 'Loading students...' : 'Select a class and section to view students.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
