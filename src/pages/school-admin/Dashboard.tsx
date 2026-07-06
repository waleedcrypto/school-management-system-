import useSWR from 'swr';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Users, GraduationCap, DollarSign, DoorOpen, Presentation } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, Tooltip as RechartsTooltip,
  PieChart, Pie, Cell as PieCell
} from 'recharts';

export default function SchoolAdminDashboard() {
  const { user } = useAuth();
  
  const getGreeting = () => {
    // Get current hour in Pakistan Time (Asia/Karachi)
    const options = { timeZone: 'Asia/Karachi', hour: 'numeric', hour12: false };
    const formatter = new Intl.DateTimeFormat('en-US', options as any);
    const hour = parseInt(formatter.format(new Date()), 10);
    
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };
  
  const { data: profile } = useSWR(user ? `profile-${user.id}` : null, async () => {
     const { data } = await supabase.from('profiles').select('school_id').eq('id', user.id).single();
     return data;
  });
  const schoolId = profile?.school_id;

  const { data: dashboardData } = useSWR(schoolId ? `dashboard-${schoolId}` : null, async () => {
      // Get current session
      const { data: sessionData } = await supabase.from('academic_sessions').select('id').eq('school_id', schoolId).eq('is_current', true).maybeSingle();

      const [studentsRes, teachersRes, classesRes, sectionsCountRes, studentsDataRes, feesDataRes, classesDataRes, sectionsListRes, studentSectionsRes] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
        supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
        supabase.from('classes').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
        supabase.from('sections').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
        supabase.from('students').select('id, monthly_fee, created_at, status').eq('school_id', schoolId),
        supabase.from('student_fees').select('amount_paid').eq('school_id', schoolId),
        supabase.from('classes').select('id, name').eq('school_id', schoolId).order('name'),
        supabase.from('sections').select('id, class_id').eq('school_id', schoolId),
        sessionData ? supabase.from('student_sections').select('student_id, section_id').eq('session_id', sessionData.id) : Promise.resolve({ data: [] })
      ]);

      const stats = {
        totalStudents: studentsRes.count || 0,
        totalTeachers: teachersRes.count || 0,
        activeClasses: classesRes.count || 0,
        totalSections: sectionsCountRes.count || 0
      };
      
      const allStudents = studentsDataRes.data || [];
      const activeStudents = allStudents.filter(s => s.status === 'active');
      const inactiveStudents = allStudents.filter(s => s.status !== 'active');
      
      const totalExpected = activeStudents.reduce((sum, s) => sum + (Number(s.monthly_fee) || 0), 0);
      const totalPaid = (feesDataRes.data || []).reduce((sum, f) => sum + (Number(f.amount_paid) || 0), 0);
      const feeStats = { totalExpected, totalPaid };
      
      const peopleChartData = [
        { name: 'Total Students', count: allStudents.length },
        { name: 'Active Students', count: activeStudents.length },
        { name: 'Teachers', count: teachersRes.count || 0 }
      ];

      return { stats, feeStats, peopleChartData };
  });

  const stats = dashboardData?.stats || {
    totalStudents: 0,
    totalTeachers: 0,
    activeClasses: 0,
    totalSections: 0
  };
  const feeStats = dashboardData?.feeStats || { totalExpected: 0, totalPaid: 0 };
  const peopleChartData = dashboardData?.peopleChartData || [];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface-container-lowest p-2 border border-outline-variant shadow-md rounded-lg">
          <p className="font-medium text-sm text-on-surface">{`${label}: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-2">
        <div>
          <h1 className="text-[28px] font-bold text-on-surface tracking-tight">Welcome, {getGreeting()}</h1>
          <p className="text-on-surface-variant text-base mt-0.5">Institute Overview</p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {[
          { title: "TOTAL STUDENTS", value: stats.totalStudents, icon: GraduationCap, color: "text-blue-500", bg: "bg-blue-50", borderColor: "border-blue-100" },
          { title: "TOTAL TEACHERS", value: stats.totalTeachers, icon: Users, color: "text-purple-500", bg: "bg-purple-50", borderColor: "border-purple-100" },
          { title: "ACTIVE CLASSES", value: stats.activeClasses, icon: Presentation, color: "text-emerald-500", bg: "bg-emerald-50", borderColor: "border-emerald-100" },
          { title: "TOTAL SECTIONS", value: stats.totalSections, icon: DoorOpen, color: "text-indigo-500", bg: "bg-indigo-50", borderColor: "border-indigo-100" },
        ].map((stat, i) => (
          <div key={i} className="bg-surface-container-lowest rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-outline-variant p-5 flex flex-col justify-between h-36 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 z-10">
              <div className={`p-1.5 rounded-lg border ${stat.borderColor} ${stat.bg}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} strokeWidth={2.5} />
              </div>
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{stat.title}</span>
            </div>
            <div className="text-4xl font-bold text-on-surface z-10">
              {stat.value.toLocaleString()}
            </div>
            {/* Decorative Icon mimicking the illustration */}
            <div className={`absolute -right-2 -bottom-4 opacity-[0.07] transform rotate-12 transition-transform group-hover:scale-110 duration-300 ${stat.color}`}>
              <stat.icon className="w-28 h-28" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* People Chart */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-outline-variant p-6 xl:col-span-2 flex flex-col">
          <h2 className="text-lg font-bold text-on-surface mb-6">People Overview</h2>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peopleChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                  <linearGradient id="highlightGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#4f46e5" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#64748b' }} 
                  allowDecimals={false}
                />
                <RechartsTooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip />} />
                <Bar 
                  dataKey="count" 
                  radius={[6, 6, 6, 6] as any}
                  background={{ fill: '#f1f5f9', radius: 6 }}
                  barSize={40}
                >
                  {peopleChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={'url(#barGradient)'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fee Collection Widget */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-outline-variant p-6 flex flex-col">
          <h2 className="text-lg font-bold text-on-surface mb-6">Fee Collection</h2>
          
          <div className="bg-emerald-50 rounded-xl p-5 mb-8 border border-emerald-100">
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-medium text-emerald-800">Paid</span>
              <span className="text-sm font-bold text-emerald-800">
                {feeStats.totalExpected > 0 ? Math.round((feeStats.totalPaid / feeStats.totalExpected) * 100) : 0}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-emerald-200/50 rounded-full mb-6">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${feeStats.totalExpected > 0 ? Math.round((feeStats.totalPaid / feeStats.totalExpected) * 100) : 0}%` }}></div>
            </div>
            
            <p className="text-xs font-medium text-emerald-700/80 mb-1">Total Expected</p>
            <p className="text-[26px] leading-none font-bold text-emerald-900">Rs. {feeStats.totalExpected.toLocaleString()}</p>
          </div>

          <div className="flex-1 flex items-center justify-center gap-8">
            <div className="w-28 h-28 shrink-0 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Paid', value: feeStats.totalExpected > 0 ? Math.round((feeStats.totalPaid / feeStats.totalExpected) * 100) : 0, color: '#22c55e' },
                      { name: 'Pending', value: feeStats.totalExpected > 0 ? 100 - Math.round((feeStats.totalPaid / feeStats.totalExpected) * 100) : 100, color: '#e2e8f0' }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={32}
                    outerRadius={48}
                    stroke="none"
                    dataKey="value"
                  >
                    {[
                      { name: 'Paid', value: feeStats.totalExpected > 0 ? Math.round((feeStats.totalPaid / feeStats.totalExpected) * 100) : 0, color: '#22c55e' },
                      { name: 'Pending', value: feeStats.totalExpected > 0 ? 100 - Math.round((feeStats.totalPaid / feeStats.totalExpected) * 100) : 100, color: '#e2e8f0' }
                    ].map((entry, index) => (
                      <PieCell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-4 justify-center">
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 mt-0.5 shrink-0"></div>
                <div>
                  <p className="text-sm font-semibold text-on-surface">Paid <span className="text-on-surface-variant font-normal">{feeStats.totalExpected > 0 ? Math.round((feeStats.totalPaid / feeStats.totalExpected) * 100) : 0}%</span></p>
                  <p className="text-xs text-on-surface-variant">Rs. {feeStats.totalPaid.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-200 mt-0.5 shrink-0"></div>
                <div>
                  <p className="text-sm font-semibold text-on-surface">Pending <span className="text-on-surface-variant font-normal">{feeStats.totalExpected > 0 ? 100 - Math.round((feeStats.totalPaid / feeStats.totalExpected) * 100) : 100}%</span></p>
                  <p className="text-xs text-on-surface-variant">Rs. {Math.max(0, feeStats.totalExpected - feeStats.totalPaid).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
