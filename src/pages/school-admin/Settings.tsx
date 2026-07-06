import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { User, Lock, Save, Building, Camera } from 'lucide-react';
import ImageCropper from '../../components/ImageCropper';

export default function Settings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [passMsg, setPassMsg] = useState('');
  const [schoolId, setSchoolId] = useState<string | null>(null);

  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    gender: '',
    schoolName: '',
    logoUrl: ''
  });

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Image Upload State
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      
      const { data: profileData } = await supabase.from('profiles').select('school_id, first_name, last_name, gender').eq('id', user.id).single();
      if (profileData) {
        setSchoolId(profileData.school_id);
        
        const { data: schoolData } = await supabase.from('schools').select('name, logo_url').eq('id', profileData.school_id).single();
        
        setProfile({
          firstName: profileData.first_name || '',
          lastName: profileData.last_name || '',
          gender: profileData.gender || '',
          schoolName: schoolData?.name || '',
          logoUrl: schoolData?.logo_url || ''
        });
      }
    }
    loadProfile();
  }, [user]);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result?.toString() || null);
      });
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedImage: string) => {
    setProfile((prev) => ({ ...prev, logoUrl: croppedImage }));
    setImageSrc(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropCancel = () => {
    setImageSrc(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !schoolId) return;
    setLoading(true);
    setProfileMsg('');
    
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          first_name: profile.firstName, 
          last_name: profile.lastName,
          gender: profile.gender || null
        })
        .eq('id', user.id);
        
      if (profileError) throw profileError;

      const principalFullName = `${profile.firstName} ${profile.lastName}`.trim();

      const { error: schoolError } = await supabase
        .from('schools')
        .update({ 
          name: profile.schoolName, 
          principal_name: principalFullName,
          logo_url: profile.logoUrl 
        })
        .eq('id', schoolId);
        
      if (schoolError) throw schoolError;

      setProfileMsg('Profile and school details updated successfully.');
      window.dispatchEvent(new Event('profileUpdated'));
    } catch (error: any) {
      setProfileMsg(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email || !schoolId) return;
    
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPassMsg('Passwords do not match.');
      return;
    }
    
    if (passwords.newPassword.length < 6) {
      setPassMsg('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setPassMsg('');
    
    // Verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: passwords.currentPassword
    });

    if (signInError) {
      setPassMsg('Error: Incorrect current password.');
      setLoading(false);
      return;
    }

    const { error: authError } = await supabase.auth.updateUser({
      password: passwords.newPassword
    });

    if (authError) {
      setPassMsg(`Error: ${authError.message}`);
    } else {
      // Sync admin_password in schools table for Super Admin viewing
      await supabase
        .from('schools')
        .update({ admin_password: passwords.newPassword })
        .eq('id', schoolId);

      setPassMsg('Password updated successfully.');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl space-y-6">
      {imageSrc && (
        <ImageCropper 
          imageSrc={imageSrc} 
          onCropComplete={handleCropComplete} 
          onCancel={handleCropCancel} 
        />
      )}

      <div>
        <h1 className="text-3xl font-bold text-on-surface">Settings</h1>
        <p className="text-on-surface-variant mt-1">Manage your profile, institution details, and account security.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-outline-variant">
            <div className="p-2 bg-primary-fixed rounded-lg text-on-primary-fixed">
              <Building className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-on-surface">Institution Profile</h2>
          </div>
          
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            {profileMsg && (
              <div className={`p-3 rounded-md text-sm ${profileMsg.startsWith('Error') ? 'bg-error/10 text-error' : 'bg-emerald-50 text-emerald-700'}`}>
                {profileMsg}
              </div>
            )}
            
            <div className="flex flex-col items-center justify-center mb-6">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full border-4 border-surface-container-high bg-surface-container flex items-center justify-center overflow-hidden">
                  {profile.logoUrl ? (
                    <img src={profile.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Building className="w-10 h-10 text-on-surface-variant opacity-50" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-secondary text-on-secondary p-2 rounded-full shadow-lg hover:scale-105 transition-transform"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-on-surface-variant mt-2">Upload Institution Logo / Picture</p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={onFileChange}
                accept="image/*"
                className="hidden"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Institution Name</label>
              <input
                type="text"
                required
                value={profile.schoolName}
                onChange={e => setProfile({ ...profile, schoolName: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-on-surface"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Principal First Name</label>
                <input
                  type="text"
                  required
                  value={profile.firstName}
                  onChange={e => setProfile({ ...profile, firstName: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-on-surface"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  value={profile.lastName}
                  onChange={e => setProfile({ ...profile, lastName: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-on-surface"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Gender</label>
              <select
                value={profile.gender}
                onChange={e => setProfile({ ...profile, gender: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-on-surface"
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-6 flex items-center justify-center gap-2 w-full py-2.5 bg-secondary text-on-secondary rounded-lg font-medium hover:bg-secondary/90 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> Save Profile Details
            </button>
          </form>
        </div>

        {/* Password Settings */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-outline-variant">
            <div className="p-2 bg-secondary-fixed rounded-lg text-on-secondary-fixed">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-on-surface">Security</h2>
          </div>
          
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            {passMsg && (
              <div className={`p-3 rounded-md text-sm ${passMsg.startsWith('Error') || passMsg.startsWith('Password m') || passMsg.startsWith('Passwords d') ? 'bg-error/10 text-error' : 'bg-emerald-50 text-emerald-700'}`}>
                {passMsg}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Current Password</label>
              <input
                type="password"
                required
                value={passwords.currentPassword}
                onChange={e => setPasswords({ ...passwords, currentPassword: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-on-surface"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">New Password</label>
              <input
                type="password"
                required
                value={passwords.newPassword}
                onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-on-surface"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={passwords.confirmPassword}
                onChange={e => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-on-surface"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-6 flex items-center justify-center gap-2 w-full py-2.5 bg-surface-container border border-outline-variant text-on-surface rounded-lg font-medium hover:bg-surface-container-high transition-colors disabled:opacity-50"
            >
              Update Password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

