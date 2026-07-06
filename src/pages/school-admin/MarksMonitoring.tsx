import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, Search, Filter } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function MarksMonitoring() {
  const { user } = useAuth();
  const [marks, setMarks] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedSection, setSelectedSection] = useState('all');
  const [selectedExam, setSelectedExam] = useState('all');

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', user.id).single();
      if (!profile?.school_id) return;

      const [marksRes, classesRes, sectionsRes, examsRes, subjectsRes] = await Promise.all([
        supabase.from('marks').select(`
          id, marks_obtained, total_marks, grade, remarks, 
          student:students (id, first_name, last_name, student_id, student_sections (section_id)),
          exam_id,
          subject_id
        `).order('created_at', { ascending: false }),
        supabase.from('classes').select('*').eq('school_id', profile.school_id).order('name'),
        supabase.from('sections').select('*').eq('school_id', profile.school_id).order('name'),
        supabase.from('exams').select('*').eq('school_id', profile.school_id).order('name'),
        supabase.from('subjects').select('*').eq('school_id', profile.school_id)
      ]);

      if (marksRes.data) setMarks(marksRes.data);
      if (classesRes.data) setClasses(classesRes.data);
      if (sectionsRes.data) setSections(sectionsRes.data);
      if (examsRes.data) setExams(examsRes.data);
      if (subjectsRes.data) setSubjects(subjectsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStudentSection = (studentSections: any[]) => {
    if (!studentSections || studentSections.length === 0) return null;
    return sections.find(s => s.id === studentSections[0].section_id);
  };

  const processedMarks = marks.map(m => {
    const studentSection = getStudentSection(m.student?.student_sections);
    const studentClass = studentSection ? classes.find(c => c.id === studentSection.class_id) : null;
    const exam = exams.find(e => e.id === m.exam_id);
    const subject = subjects.find(s => s.id === m.subject_id);
    
    return {
      ...m,
      studentName: m.student ? `${m.student.first_name} ${m.student.last_name}` : 'Unknown',
      studentRoll: m.student?.student_id || 'N/A',
      sectionId: studentSection?.id || null,
      sectionName: studentSection?.name || 'Unknown',
      classId: studentClass?.id || null,
      className: studentClass?.name || 'Unknown',
      examName: exam?.name || 'Unknown',
      subjectName: subject?.name || 'Unknown',
    };
  });

  const filteredMarks = processedMarks.filter(m => {
    const matchesSearch = m.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || m.studentRoll.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = selectedClass === 'all' || m.classId === selectedClass;
    const matchesSection = selectedSection === 'all' || m.sectionId === selectedSection;
    const matchesExam = selectedExam === 'all' || m.exam_id === selectedExam;
    return matchesSearch && matchesClass && matchesSection && matchesExam;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Student Marks Monitoring
          </h1>
          <p className="text-on-surface-variant mt-1">Overview of all student marks across classes and sections.</p>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 sm:p-6">
        <div className="mb-6 flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Search students by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-container rounded-lg border-none focus:ring-2 focus:ring-primary text-on-surface"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center bg-surface-container px-3 rounded-lg">
              <Filter className="w-4 h-4 text-on-surface-variant mr-2" />
              <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedSection('all'); }} className="bg-transparent border-none focus:ring-0 text-sm text-on-surface py-2 outline-none">
                <option value="all">All Classes</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            
            <div className="flex items-center bg-surface-container px-3 rounded-lg">
              <select disabled={selectedClass === 'all'} value={selectedSection} onChange={e => setSelectedSection(e.target.value)} className="bg-transparent border-none focus:ring-0 text-sm text-on-surface py-2 outline-none">
                <option value="all">All Sections</option>
                {sections.filter(s => s.class_id === selectedClass).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            
            <div className="flex items-center bg-surface-container px-3 rounded-lg">
              <select value={selectedExam} onChange={e => setSelectedExam(e.target.value)} className="bg-transparent border-none focus:ring-0 text-sm text-on-surface py-2 outline-none">
                <option value="all">All Exams</option>
                {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
        ) : filteredMarks.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant">No marks found for the selected filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant text-on-surface-variant font-medium text-sm">
                  <th className="p-4 pl-0 font-medium">Student Name</th>
                  <th className="p-4 font-medium">Class / Section</th>
                  <th className="p-4 font-medium">Exam</th>
                  <th className="p-4 font-medium">Subject</th>
                  <th className="p-4 font-medium">Marks</th>
                  <th className="p-4 font-medium">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredMarks.map((m) => (
                  <tr key={m.id} className="hover:bg-surface-container/50 transition-colors">
                    <td className="p-4 pl-0">
                      <div className="flex flex-col">
                        <span className="font-medium text-on-surface">{m.studentName}</span>
                        <span className="text-xs text-on-surface-variant">ID: {m.studentRoll}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-block px-2 py-1 bg-surface-container-high text-xs rounded-md whitespace-nowrap">
                        {m.className} - {m.sectionName}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-on-surface">{m.examName}</td>
                    <td className="p-4 text-sm text-on-surface font-medium">{m.subjectName}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-on-surface">{m.marks_obtained}</span>
                        <span className="text-on-surface-variant text-xs">/ {m.total_marks}</span>
                      </div>
                      {m.total_marks && (
                        <div className="w-24 h-1.5 bg-surface-container mt-1 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary" 
                            style={{ width: `${Math.min(100, Math.max(0, (m.marks_obtained / m.total_marks) * 100))}%` }}
                          />
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        "px-2 py-1 rounded-md text-xs font-bold",
                        m.grade === 'A' || m.grade === 'A+' ? "bg-green-500/10 text-green-500" :
                        m.grade === 'B' || m.grade === 'B+' ? "bg-blue-500/10 text-blue-500" :
                        m.grade === 'C' ? "bg-yellow-500/10 text-yellow-500" :
                        "bg-red-500/10 text-red-500"
                      )}>
                        {m.grade || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
