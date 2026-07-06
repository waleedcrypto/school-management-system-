import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Logo } from '../../components/Logo';

export default function ForgotPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      // Step 1: Verify if a school exists with this email and phone
      const { data: school, error: schoolError } = await supabase
        .from('schools')
        .select('id, name')
        .eq('email', email)
        .eq('phone', phone)
        .single();

      if (schoolError || !school) {
        setStatus('error');
        setMessage('We could not find an institute matching that email and phone number.');
        setIsLoading(false);
        return;
      }

      // Step 2: Since it matched, send the password reset email
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });

      if (resetError) {
        throw resetError;
      }

      setStatus('success');
      setMessage(`A password reset link has been sent to ${email} for ${school.name}.`);
    } catch (error: any) {
      setStatus('error');
      
      if (error.message?.includes('rate limit')) {
        setMessage('Security Alert: You have requested too many password resets. For security reasons, please wait 1 hour before trying again (Supabase free tier limit).');
      } else {
        setMessage(error.message || 'An error occurred while trying to reset your password.');
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
      
      {/* Right Side: Forgot Password Form Canvas */}
      <div className="flex-1 bg-white md:overflow-y-auto">
        <div className="flex flex-col items-center justify-center min-h-full px-6 py-12 md:px-12">
          <div className="w-full max-w-[440px]">
            {/* Form Header */}
            <div className="mb-8 flex flex-col items-center text-center">
              <Logo variant="light" className="scale-75 origin-center mb-4" />
              <h2 className="text-3xl font-bold text-[#0F172A] tracking-tight mb-2">Recover Password</h2>
              <p className="text-sm text-gray-500">Confirm your email and phone number to reset your password.</p>
            </div>
            
            {status === 'success' ? (
              <div className="bg-emerald-50 text-emerald-800 p-4 rounded-lg border border-emerald-200 text-sm mb-6 text-center">
                <p>{message}</p>
                <div className="mt-4">
                  <Link to="/login" className="text-emerald-700 font-bold hover:underline">
                    Return to Login
                  </Link>
                </div>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={handleSubmit}>
                {status === 'error' && (
                  <div className="bg-rose-50 text-rose-800 p-3 rounded-lg border border-rose-200 text-sm">
                    {message}
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1.5" htmlFor="email">Registered Email</label>
                  <input 
                    className="w-full rounded-lg border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] py-2.5 px-3.5 transition-all text-sm outline-none placeholder:text-gray-400" 
                    id="email" name="email" 
                    placeholder="admin@institute.edu" 
                    required type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1.5" htmlFor="phone">Registered Phone Number</label>
                  <input 
                    className="w-full rounded-lg border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] py-2.5 px-3.5 transition-all text-sm outline-none placeholder:text-gray-400" 
                    id="phone" name="phone" 
                    placeholder="+1 (555) 000-0000" 
                    required type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                
                <div className="pt-4">
                  <button 
                    disabled={isLoading}
                    className="w-full flex justify-center py-3.5 px-4 rounded-full shadow-sm font-medium text-white bg-[#0EA5E9] hover:bg-[#0284C7] focus:outline-none transition-colors disabled:opacity-50" 
                    type="submit"
                  >
                    {isLoading ? 'Verifying...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            )}
            
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                Remember your password? <Link to="/login" className="text-[#0EA5E9] font-medium hover:underline">Sign in here</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
