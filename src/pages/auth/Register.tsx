import { Logo } from '../../components/Logo';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function Register() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    schoolName: '',
    schoolType: '',
    principalName: '',
    email: '',
    phone: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // 1. Sign up the user (Principal)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Create School (pending status)
        const { data: schoolData, error: schoolError } = await supabase
          .from('schools')
          .insert({
            name: formData.schoolName,
            type: formData.schoolType,
            principal_name: formData.principalName,
            email: formData.email,
            phone: formData.phone,
            admin_password: formData.password,
            status: 'pending'
          })
          .select()
          .single();
          
        if (schoolError) throw schoolError;

        // 3. Create Profile linked to School
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            school_id: schoolData.id,
            role: 'school_admin',
            first_name: formData.principalName.split(' ')[0] || '',
            last_name: formData.principalName.split(' ').slice(1).join(' ') || ''
          });

        if (profileError) throw profileError;

        setStatus('success');
        setMessage('Registration successful! Please wait for super admin approval.');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (error: any) {
      setStatus('error');
      
      if (error.message?.includes('rate limit')) {
        setMessage('Security Alert: You have requested too many registrations. For security reasons, please wait 1 hour before trying again (Supabase free tier limit).');
      } else {
        setMessage(error.message || 'An error occurred during registration.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen md:h-screen flex flex-col md:flex-row antialiased text-[#0F172A] bg-white font-sans">
      {/* Left Side: Branding / Marketing */}
      <div className="hidden md:flex flex-col flex-1 bg-[#1A2747] text-white p-12 relative overflow-hidden">
        <div className="relative z-20 flex flex-col h-full justify-center">
          <div className="flex-1 flex flex-col items-center justify-center -mt-20">
            {/* Campus Illustration Placeholder */}
            <svg viewBox="0 0 400 200" className="w-full max-w-lg mb-8" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Ground */}
              <path d="M 50 160 L 350 160" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
              <path d="M 70 170 L 120 170 M 140 170 L 260 170 M 280 170 L 330 170" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
              <path d="M 190 180 L 210 180" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
              
              {/* Main Building */}
              <rect x="150" y="80" width="100" height="80" fill="#BFDBFE" stroke="#fff" strokeWidth="2" />
              <path d="M 150 80 L 200 40 L 250 80 Z" fill="#E0F2FE" stroke="#fff" strokeWidth="2" />
              
              {/* Clock Tower */}
              <rect x="185" y="40" width="30" height="40" fill="#DBEAFE" stroke="#fff" strokeWidth="2" />
              <circle cx="200" cy="55" r="10" fill="#EFF6FF" stroke="#1E3A8A" strokeWidth="1.5" />
              <path d="M 200 55 L 200 50 M 200 55 L 204 55" stroke="#1E3A8A" strokeWidth="1.5" strokeLinecap="round" />
              
              {/* Doors */}
              <rect x="185" y="130" width="30" height="30" fill="#EFF6FF" stroke="#1E3A8A" strokeWidth="1.5" />
              <path d="M 200 130 L 200 160" stroke="#1E3A8A" strokeWidth="1.5" />
              
              {/* Windows Main */}
              <rect x="160" y="90" width="15" height="20" rx="2" fill="#fff" stroke="#1E3A8A" strokeWidth="1.5" />
              <rect x="192.5" y="90" width="15" height="20" rx="2" fill="#fff" stroke="#1E3A8A" strokeWidth="1.5" />
              <rect x="225" y="90" width="15" height="20" rx="2" fill="#fff" stroke="#1E3A8A" strokeWidth="1.5" />

              {/* Left Wing */}
              <rect x="90" y="100" width="60" height="60" fill="#EFF6FF" stroke="#fff" strokeWidth="2" />
              <path d="M 90 100 L 120 70 L 150 100 Z" fill="#DBEAFE" stroke="#fff" strokeWidth="2" />
              <rect x="100" y="110" width="12" height="12" fill="#fff" stroke="#1E3A8A" strokeWidth="1.5" />
              <rect x="128" y="110" width="12" height="12" fill="#fff" stroke="#1E3A8A" strokeWidth="1.5" />
              <rect x="100" y="135" width="12" height="12" fill="#fff" stroke="#1E3A8A" strokeWidth="1.5" />
              <rect x="128" y="135" width="12" height="12" fill="#fff" stroke="#1E3A8A" strokeWidth="1.5" />

              {/* Right Wing */}
              <rect x="250" y="100" width="60" height="60" fill="#EFF6FF" stroke="#fff" strokeWidth="2" />
              <path d="M 250 100 L 280 70 L 310 100 Z" fill="#DBEAFE" stroke="#fff" strokeWidth="2" />
              <rect x="260" y="110" width="12" height="12" fill="#fff" stroke="#1E3A8A" strokeWidth="1.5" />
              <rect x="288" y="110" width="12" height="12" fill="#fff" stroke="#1E3A8A" strokeWidth="1.5" />
              <rect x="260" y="135" width="12" height="12" fill="#fff" stroke="#1E3A8A" strokeWidth="1.5" />
              <rect x="288" y="135" width="12" height="12" fill="#fff" stroke="#1E3A8A" strokeWidth="1.5" />

              {/* Trees */}
              <path d="M 70 120 Q 55 120 55 135 Q 55 145 65 145 Q 65 155 75 155 Q 85 155 85 140 Q 85 120 70 120 Z" fill="#DBEAFE" stroke="#1E3A8A" strokeWidth="1.5" />
              <path d="M 70 145 L 70 160" stroke="#1E3A8A" strokeWidth="1.5" />
              
              <path d="M 330 130 Q 315 130 315 145 Q 315 155 325 155 Q 325 165 335 165 Q 345 165 345 150 Q 345 130 330 130 Z" fill="#DBEAFE" stroke="#1E3A8A" strokeWidth="1.5" />
              <path d="M 330 155 L 330 160" stroke="#1E3A8A" strokeWidth="1.5" />

              <path d="M 130 130 Q 115 130 115 145 Q 115 155 125 155 Q 125 165 135 165 Q 145 165 145 150 Q 145 130 130 130 Z" fill="#BFDBFE" stroke="#1E3A8A" strokeWidth="1.5" />
              <path d="M 130 155 L 130 160" stroke="#1E3A8A" strokeWidth="1.5" />
              
              {/* Clouds */}
              <path d="M 120 40 Q 120 30 130 30 Q 140 30 140 40 Z M 110 40 Q 110 35 120 35 Q 120 40 120 40 Z M 140 40 Q 140 35 150 35 Q 150 40 150 40 Z" fill="#fff" opacity="0.6" />
              <path d="M 110 40 L 150 40" stroke="#fff" strokeWidth="1.5" opacity="0.6" strokeLinecap="round" />
              
              <path d="M 280 50 Q 280 40 290 40 Q 300 40 300 50 Z M 270 50 Q 270 45 280 45 Q 280 50 280 50 Z M 300 50 Q 300 45 310 45 Q 310 50 310 50 Z" fill="#fff" opacity="0.6" />
              <path d="M 270 50 L 310 50" stroke="#fff" strokeWidth="1.5" opacity="0.6" strokeLinecap="round" />
            </svg>
          </div>

          <div className="mb-8 flex flex-col items-center text-center">
            <div className="flex items-center gap-4 text-white/90">
              <div className="w-12 h-12 rounded-full border-2 border-white/20 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-left">
                <h3 className="font-bold text-lg">Trusted by 10k+ Institutes</h3>
                <p className="text-sm text-white/70 max-w-[280px]">CampusDesk is natively trusted by 10k+ institutes to maintain real estate to the institution campus verification.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right Side: Registration Form Canvas */}
      <div className="flex-1 bg-white md:overflow-y-auto">
        <div className="flex flex-col items-center justify-center min-h-full px-6 py-12 md:px-12">
          <div className="w-full max-w-[440px]">
          {/* Form Header */}
          <div className="mb-8 flex flex-col items-center text-center">
            <Logo variant="light" className="scale-75 origin-center mb-4" />
            <h2 className="text-3xl font-bold text-[#0F172A] tracking-tight mb-2">Register Your Institute</h2>
            <p className="text-sm text-gray-500">Setup your institution's central hub in minutes.</p>
          </div>

          {status === 'success' && (
            <div className="mb-6 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
              {message}
            </div>
          )}

          {status === 'error' && (
            <div className="mb-6 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm">
              {message}
            </div>
          )}
          
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-1.5" htmlFor="schoolName">Institute Name</label>
              <input 
                className="w-full rounded-lg border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] py-2.5 px-3.5 transition-all text-sm outline-none placeholder:text-gray-400" 
                id="schoolName" name="schoolName" 
                placeholder="e.g. Lincoln High Institute" 
                required type="text"
                value={formData.schoolName}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-1.5" htmlFor="schoolType">Institute Type</label>
              <select 
                className="w-full rounded-lg border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] py-2.5 px-3.5 transition-all text-sm outline-none text-gray-600" 
                id="schoolType" name="schoolType"
                required
                value={formData.schoolType}
                onChange={handleChange}
              >
                <option disabled value="">Select institution type</option>
                <option value="Primary School">Primary Institute</option>
                <option value="High School">High Institute</option>
                <option value="Montessori">Montessori</option>
                <option value="College">College / University</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-1.5" htmlFor="principalName">Principal / Primary Admin Name</label>
              <input 
                className="w-full rounded-lg border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] py-2.5 px-3.5 transition-all text-sm outline-none placeholder:text-gray-400" 
                id="principalName" name="principalName" 
                placeholder="Full Name" required type="text"
                value={formData.principalName}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-1.5" htmlFor="email">Work Email</label>
              <input 
                className="w-full rounded-lg border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] py-2.5 px-3.5 transition-all text-sm outline-none placeholder:text-gray-400" 
                id="email" name="email" 
                placeholder="admin@institute.edu" required type="email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-1.5" htmlFor="phone">Phone Number</label>
              <input 
                className="w-full rounded-lg border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] py-2.5 px-3.5 transition-all text-sm outline-none placeholder:text-gray-400" 
                id="phone" name="phone" 
                placeholder="+1 (555) 000-0000" required type="tel"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-1.5" htmlFor="password">Admin Password</label>
              <input 
                className="w-full rounded-lg border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] py-2.5 px-3.5 transition-all text-sm outline-none placeholder:text-gray-400 tracking-widest" 
                id="password" name="password" 
                placeholder="••••••••" required type="password"
                value={formData.password}
                onChange={handleChange}
                minLength={8}
              />
              <p className="text-xs text-gray-500 mt-1.5">Must be at least 8 characters.</p>
            </div>
            
            <div className="pt-4">
              <button 
                disabled={isLoading}
                className="w-full flex justify-center py-3.5 px-4 rounded-full shadow-sm font-medium text-white bg-[#0EA5E9] hover:bg-[#0284C7] focus:outline-none transition-colors disabled:opacity-50" 
                type="submit"
              >
                {isLoading ? 'Creating Account...' : 'Create Institution Account'}
              </button>
            </div>
          </form>
          
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Already have an account? <Link to="/login" className="text-[#0EA5E9] font-medium hover:underline">Sign in here</Link>
            </p>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
