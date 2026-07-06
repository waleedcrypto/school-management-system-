import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, Upload, Search, Filter, Trash2, Download, Eye, History, X, Clock, Edit2, AlertTriangle, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface DocumentCategory {
  id: string;
  name: string;
}

interface SchoolDocument {
  id: string;
  title: string;
  description: string;
  category_id: string;
  file_path: string;
  file_url?: string;
  file_name: string;
  file_size: number;
  uploaded_by: string;
  visibility?: string;
  assigned_teachers?: string[];
  created_at: string;
  document_categories?: DocumentCategory;
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

interface DocumentHistory {
  id: string;
  action: string;
  document_title: string;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

export default function Documents() {
  const { user } = useAuth();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  
  const [documents, setDocuments] = useState<SchoolDocument[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [history, setHistory] = useState<DocumentHistory[]>([]);
  const [teachersList, setTeachersList] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newDoc, setNewDoc] = useState({
    title: '',
    description: '',
    category_id: '',
    file: null as File | null,
    visibility: 'all',
    assigned_teachers: [] as string[]
  });

  const [uploadMsg, setUploadMsg] = useState('');
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);
  const [backgroundUploadMsg, setBackgroundUploadMsg] = useState('');

  // Delete Modal State
  const [docToDelete, setDocToDelete] = useState<SchoolDocument | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit Modal State
  const [docToEdit, setDocToEdit] = useState<SchoolDocument | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    category_id: '',
    visibility: 'all',
    assigned_teachers: [] as string[]
  });
  const [editMsg, setEditMsg] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, [user]);

  async function fetchInitialData() {
    if (!user) return;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .single();

      if (profile?.school_id) {
        setSchoolId(profile.school_id);
        await Promise.all([
          fetchCategories(profile.school_id),
          fetchDocuments(profile.school_id),
          fetchTeachers(profile.school_id)
        ]);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCategories(sId: string) {
    const { data, error } = await supabase
      .from('document_categories')
      .select('*')
      .eq('school_id', sId)
      .order('name');
    
    if (error) {
      console.error('Error fetching categories:', error);
    } else if (data) {
      if (data.length === 0) {
        // Seed default categories
        const defaults = ['Circular', 'Syllabus', 'Timetable', 'Examination', 'Meeting', 'Notice', 'Training', 'Other'];
        const records = defaults.map(name => ({ school_id: sId, name }));
        const { data: inserted, error: insertError } = await supabase.from('document_categories').insert(records).select();
        if (!insertError && inserted) {
          setCategories(inserted);
        }
      } else {
        setCategories(data);
      }
    }
  }

  async function fetchTeachers(sId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('school_id', sId)
      .eq('role', 'teacher')
      .order('first_name');
    
    if (error) console.error('Error fetching teachers:', error);
    else if (data) setTeachersList(data);
  }

  async function fetchDocuments(sId: string) {
    const { data, error } = await supabase
      .from('school_documents')
      .select(`
        *,
        document_categories (id, name),
        profiles (first_name, last_name)
      `)
      .eq('school_id', sId)
      .order('created_at', { ascending: false });
    
    if (error) console.error('Error fetching docs:', error);
    else if (data) setDocuments(data);
  }

  async function fetchHistory() {
    if (!schoolId) return;
    const { data, error } = await supabase
      .from('document_history')
      .select(`
        *,
        profiles (first_name, last_name)
      `)
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) console.error('Error fetching history:', error);
    else if (data) setHistory(data);
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoc.file || !newDoc.title || !newDoc.category_id || !schoolId || !user) {
      setUploadMsg('Please fill all required fields and select a file.');
      return;
    }

    const docToUpload = { ...newDoc };
    const uploadedFile = newDoc.file;

    // Optimistically close modal
    setIsUploadModalOpen(false);
    setNewDoc({ title: '', description: '', category_id: '', file: null, visibility: 'all', assigned_teachers: [] });
    setUploadProgress(null);
    setUploadMsg('');
    
    // Set background uploading state
    setIsUploadingBackground(true);
    setBackgroundUploadMsg(`Uploading "${docToUpload.title}"...`);

    try {
      const fileExt = uploadedFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${schoolId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('school_documents')
        .upload(filePath, uploadedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        // If bucket doesn't exist, we fallback or show message
        if (uploadError.message.includes('Bucket not found')) {
            throw new Error('Storage bucket "school_documents" does not exist. Please contact Super Admin to create it via Supabase console.');
        }
        throw uploadError;
      }

      const { data: insertedDoc, error: dbError } = await supabase
        .from('school_documents')
        .insert([{
          school_id: schoolId,
          category_id: docToUpload.category_id,
          title: docToUpload.title,
          description: docToUpload.description,
          file_path: filePath,
          file_url: supabase.storage.from('school_documents').getPublicUrl(filePath).data.publicUrl,
          file_name: uploadedFile.name,
          file_size: uploadedFile.size,
          uploaded_by: user.id,
          visibility: docToUpload.visibility,
          assigned_teachers: docToUpload.visibility === 'specific' ? docToUpload.assigned_teachers : []
        }])
        .select(`
          *,
          document_categories (id, name),
          profiles (first_name, last_name)
        `)
        .single();

      if (dbError) throw dbError;

      // Log history
      await supabase.from('document_history').insert([{
        school_id: schoolId,
        document_id: insertedDoc.id,
        action: 'uploaded',
        document_title: docToUpload.title,
        performed_by: user.id
      }]);

      setDocuments(prev => [insertedDoc, ...prev]);
      setBackgroundUploadMsg(`"${docToUpload.title}" uploaded successfully!`);
      setTimeout(() => {
        setIsUploadingBackground(false);
        setBackgroundUploadMsg('');
      }, 3000);

    } catch (error: any) {
      console.error('Upload error:', error);
      setBackgroundUploadMsg(`Failed to upload "${docToUpload.title}": ${error.message || 'Error uploading document.'}`);
      setTimeout(() => {
        setIsUploadingBackground(false);
        setBackgroundUploadMsg('');
      }, 5000);
    }
  };

  const handleDeleteClick = (doc: SchoolDocument) => {
    setDocToDelete(doc);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!docToDelete || !schoolId || !user) return;
    setIsDeleting(true);

    try {
      // 1. Delete from storage
      const { error: storageError } = await supabase.storage
        .from('school_documents')
        .remove([docToDelete.file_path]);
        
      if (storageError) console.error('Storage deletion error:', storageError);

      // 2. Delete from DB
      const { error: dbError } = await supabase
        .from('school_documents')
        .delete()
        .eq('id', docToDelete.id);

      if (dbError) throw dbError;

      // 3. Log history
      await supabase.from('document_history').insert([{
        school_id: schoolId,
        document_id: docToDelete.id,
        action: 'deleted',
        document_title: docToDelete.title,
        performed_by: user.id
      }]);

      setDocuments(documents.filter(d => d.id !== docToDelete.id));
      setIsDeleteModalOpen(false);
      setDocToDelete(null);
    } catch (error: any) {
      console.error('Delete error:', error);
      alert('Error deleting document: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditClick = (doc: SchoolDocument) => {
    setDocToEdit(doc);
    setEditForm({
      title: doc.title,
      description: doc.description || '',
      category_id: doc.category_id,
      visibility: doc.visibility || 'all',
      assigned_teachers: doc.assigned_teachers || []
    });
    setEditMsg('');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docToEdit || !schoolId || !user) return;
    setIsEditing(true);
    setEditMsg('Updating document...');

    try {
      const { data: updatedDoc, error: dbError } = await supabase
        .from('school_documents')
        .update({
          title: editForm.title,
          description: editForm.description,
          category_id: editForm.category_id,
          visibility: editForm.visibility,
          assigned_teachers: editForm.visibility === 'specific' ? editForm.assigned_teachers : [],
          updated_at: new Date().toISOString()
        })
        .eq('id', docToEdit.id)
        .select(`
          *,
          document_categories (id, name),
          profiles (first_name, last_name)
        `)
        .single();

      if (dbError) throw dbError;

      // Log history
      await supabase.from('document_history').insert([{
        school_id: schoolId,
        document_id: docToEdit.id,
        action: 'updated',
        document_title: editForm.title,
        performed_by: user.id,
        details: { previous_title: docToEdit.title }
      }]);

      setDocuments(documents.map(d => d.id === docToEdit.id ? updatedDoc : d));
      setEditMsg('Document updated successfully!');
      setTimeout(() => {
        setIsEditModalOpen(false);
        setDocToEdit(null);
        setEditMsg('');
      }, 1000);
    } catch (error: any) {
      console.error('Update error:', error);
      setEditMsg(error.message || 'Error updating document.');
    } finally {
      setIsEditing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileUrl = async (filePath: string) => {
    const { data } = supabase.storage.from('school_documents').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleOpen = async (filePath: string) => {
    const url = await getFileUrl(filePath);
    window.open(url, '_blank');
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          doc.file_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory ? doc.category_id === filterCategory : true;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return <div className="p-8 text-center text-on-surface-variant">Loading documents...</div>;
  }

  return (
    <div className="space-y-6">
      {isUploadingBackground && (
        <div className={`p-4 rounded-xl border flex items-center justify-between ${backgroundUploadMsg.includes('Failed') ? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
          <div className="flex items-center space-x-3">
            {backgroundUploadMsg.includes('Failed') ? (
              <X className="w-5 h-5 text-red-500" />
            ) : backgroundUploadMsg.includes('successfully') ? (
              <Check className="w-5 h-5 text-green-500" />
            ) : (
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            )}
            <span className="font-medium text-sm">{backgroundUploadMsg}</span>
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-on-surface">Documents & Resources</h1>
          <p className="text-sm text-on-surface-variant mt-1">Manage school circulars, syllabus, and other files.</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => {
              setIsHistoryModalOpen(true);
              fetchHistory();
            }}
            className="flex items-center px-4 py-2 bg-surface-container text-on-surface rounded-lg hover:bg-surface-container-highest transition-colors"
          >
            <History className="w-4 h-4 mr-2" />
            History
          </button>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface p-4 rounded-xl border border-outline-variant flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Search documents by title or filename..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
          />
        </div>
        <div className="sm:w-48 relative">
          <Filter className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-on-surface-variant" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm appearance-none"
          >
            <option value="">All Categories</option>
            {categories.filter((c, index, self) => self.findIndex(v => v.name === c.name) === index).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant text-xs text-on-surface-variant uppercase bg-surface">
                <th className="py-3 px-6 font-medium">Document Info</th>
                <th className="py-3 px-6 font-medium">Category</th>
                <th className="py-3 px-6 font-medium">Visibility</th>
                <th className="py-3 px-6 font-medium">Size</th>
                <th className="py-3 px-6 font-medium">Uploaded By</th>
                <th className="py-3 px-6 font-medium">Date</th>
                <th className="py-3 px-6 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-on-surface-variant">
                    No documents found.
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="py-3 px-6">
                      <div className="flex items-center">
                        <FileText className="w-8 h-8 text-primary mr-3" />
                        <div>
                          <div className="font-medium text-on-surface">{doc.title}</div>
                          <div className="text-xs text-on-surface-variant">{doc.file_name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-6">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-secondary-container text-on-secondary-container">
                        {doc.document_categories?.name || 'Unknown'}
                      </span>
                    </td>
                    <td className="py-3 px-6">
                      {doc.visibility === 'specific' ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800" title={`${doc.assigned_teachers?.length || 0} teacher(s) assigned`}>
                          Specific ({doc.assigned_teachers?.length || 0})
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          All Staff
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-6 text-sm text-on-surface-variant">
                      {formatFileSize(doc.file_size)}
                    </td>
                    <td className="py-3 px-6 text-sm text-on-surface">
                      {doc.profiles?.first_name} {doc.profiles?.last_name}
                    </td>
                    <td className="py-3 px-6 text-sm text-on-surface-variant">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-6">
                      <div className="flex justify-end space-x-2">
                        <button 
                          onClick={() => handleOpen(doc.file_path)}
                          className="p-1.5 text-on-surface-variant hover:text-primary transition-colors"
                          title="View Document"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleEditClick(doc)}
                          className="p-1.5 text-on-surface-variant hover:text-secondary transition-colors"
                          title="Edit Document"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(doc)}
                          className="p-1.5 text-on-surface-variant hover:text-error transition-colors"
                          title="Delete Document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface w-full max-w-md rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-outline-variant flex-shrink-0">
              <h2 className="text-xl font-semibold text-on-surface">Upload Document</h2>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpload} className="flex flex-col overflow-hidden min-h-0">
              <div className="p-6 space-y-4 overflow-y-auto">
                {uploadMsg && (
                  <div className={`p-3 rounded-lg text-sm ${uploadMsg.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {uploadMsg}
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Document Title *</label>
                  <input
                    type="text"
                    required
                    value={newDoc.title}
                    onChange={e => setNewDoc({...newDoc, title: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                    placeholder="e.g. Mid-Term Syllabus 2026"
                  />
                </div>
  
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Category *</label>
                  <select
                    required
                    value={newDoc.category_id}
                    onChange={e => setNewDoc({...newDoc, category_id: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                  >
                    <option value="">Select Category</option>
                    {categories.filter((c, index, self) => self.findIndex(v => v.name === c.name) === index).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
  
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-2">Visibility *</label>
                  <div className="flex space-x-6 mb-3">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="upload_visibility" 
                        value="all"
                        checked={newDoc.visibility === 'all'}
                        onChange={() => setNewDoc({...newDoc, visibility: 'all', assigned_teachers: []})}
                        className="text-primary focus:ring-primary border-outline-variant" 
                      />
                      <span className="text-sm text-on-surface">All Teachers</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="upload_visibility" 
                        value="specific"
                        checked={newDoc.visibility === 'specific'}
                        onChange={() => setNewDoc({...newDoc, visibility: 'specific'})}
                        className="text-primary focus:ring-primary border-outline-variant" 
                      />
                      <span className="text-sm text-on-surface">Specific Teachers</span>
                    </label>
                  </div>
                  
                  {newDoc.visibility === 'specific' && (
                    <div className="mt-2 max-h-40 overflow-y-auto border border-outline-variant rounded-lg bg-surface-container-lowest p-2 space-y-1">
                      {teachersList.length === 0 ? (
                        <p className="text-sm text-on-surface-variant p-2">No teachers found in the system.</p>
                      ) : (
                        teachersList.map(t => (
                          <label key={t.id} className="flex items-center space-x-3 p-2 hover:bg-surface-container rounded cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={newDoc.assigned_teachers.includes(t.id)}
                              onChange={(e) => {
                                 const newAssigned = e.target.checked
                                   ? [...newDoc.assigned_teachers, t.id]
                                   : newDoc.assigned_teachers.filter(id => id !== t.id);
                                 setNewDoc({ ...newDoc, assigned_teachers: newAssigned });
                              }}
                              className="rounded border-outline-variant text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-on-surface">{t.first_name} {t.last_name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  )}
                </div>
  
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Description (Optional)</label>
                  <textarea
                    value={newDoc.description}
                    onChange={e => setNewDoc({...newDoc, description: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                    rows={3}
                  />
                </div>
  
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">File (PDF max 10MB) *</label>
                  <input
                    type="file"
                    required
                    accept=".pdf,.doc,.docx"
                    ref={fileInputRef}
                    onChange={e => {
                      if (e.target.files && e.target.files.length > 0) {
                        setNewDoc({...newDoc, file: e.target.files[0]});
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-on-primary hover:file:bg-primary/90"
                  />
                </div>
              </div>

              <div className="flex justify-end p-6 pt-4 border-t border-outline-variant flex-shrink-0 bg-surface">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:text-on-surface mr-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadProgress !== null}
                  className="px-4 py-2 text-sm font-medium bg-primary text-on-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center"
                >
                  {uploadProgress !== null ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface w-full max-w-md rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-outline-variant flex-shrink-0">
              <h2 className="text-xl font-semibold text-on-surface">Edit Document Details</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="flex flex-col overflow-hidden min-h-0">
              <div className="p-6 space-y-4 overflow-y-auto">
                {editMsg && (
                  <div className={`p-3 rounded-lg text-sm ${editMsg.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {editMsg}
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Document Title *</label>
                  <input
                    type="text"
                    required
                    value={editForm.title}
                    onChange={e => setEditForm({...editForm, title: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                  />
                </div>
  
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Category *</label>
                  <select
                    required
                    value={editForm.category_id}
                    onChange={e => setEditForm({...editForm, category_id: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                  >
                    <option value="">Select Category</option>
                    {categories.filter((c, index, self) => self.findIndex(v => v.name === c.name) === index).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
  
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-2">Visibility *</label>
                  <div className="flex space-x-6 mb-3">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="edit_visibility" 
                        value="all"
                        checked={editForm.visibility === 'all'}
                        onChange={() => setEditForm({...editForm, visibility: 'all', assigned_teachers: []})}
                        className="text-primary focus:ring-primary border-outline-variant" 
                      />
                      <span className="text-sm text-on-surface">All Teachers</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="edit_visibility" 
                        value="specific"
                        checked={editForm.visibility === 'specific'}
                        onChange={() => setEditForm({...editForm, visibility: 'specific'})}
                        className="text-primary focus:ring-primary border-outline-variant" 
                      />
                      <span className="text-sm text-on-surface">Specific Teachers</span>
                    </label>
                  </div>
                  
                  {editForm.visibility === 'specific' && (
                    <div className="mt-2 max-h-40 overflow-y-auto border border-outline-variant rounded-lg bg-surface-container-lowest p-2 space-y-1">
                      {teachersList.length === 0 ? (
                        <p className="text-sm text-on-surface-variant p-2">No teachers found in the system.</p>
                      ) : (
                        teachersList.map(t => (
                          <label key={t.id} className="flex items-center space-x-3 p-2 hover:bg-surface-container rounded cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={editForm.assigned_teachers.includes(t.id)}
                              onChange={(e) => {
                                 const newAssigned = e.target.checked
                                   ? [...editForm.assigned_teachers, t.id]
                                   : editForm.assigned_teachers.filter(id => id !== t.id);
                                 setEditForm({ ...editForm, assigned_teachers: newAssigned });
                              }}
                              className="rounded border-outline-variant text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-on-surface">{t.first_name} {t.last_name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  )}
                </div>
  
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">Description (Optional)</label>
                  <textarea
                    value={editForm.description}
                    onChange={e => setEditForm({...editForm, description: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-secondary text-sm"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end p-6 pt-4 border-t border-outline-variant flex-shrink-0 bg-surface">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:text-on-surface mr-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditing}
                  className="px-4 py-2 text-sm font-medium bg-primary text-on-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center"
                >
                  {isEditing ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && docToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface w-full max-w-sm rounded-2xl shadow-xl overflow-hidden p-6 text-center">
            <div className="w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-semibold text-on-surface mb-2">Delete Document?</h2>
            <p className="text-sm text-on-surface-variant mb-6">
              Are you sure you want to delete <span className="font-medium text-on-surface">"{docToDelete.title}"</span>? This action cannot be undone and will permanently remove the file.
            </p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDocToDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium text-on-surface-variant bg-surface-container hover:bg-surface-container-highest rounded-lg transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium bg-error text-on-error rounded-lg hover:bg-error/90 disabled:opacity-50 transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center p-6 border-b border-outline-variant">
              <h2 className="text-xl font-semibold text-on-surface">Document History</h2>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {history.length === 0 ? (
                <div className="text-center text-on-surface-variant py-8">No history records found.</div>
              ) : (
                <div className="space-y-4">
                  {history.map((log) => (
                    <div key={log.id} className="flex items-start space-x-4 p-4 rounded-lg bg-surface-container-lowest border border-outline-variant/50">
                      <div className={`p-2 rounded-full ${log.action === 'deleted' ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'}`}>
                        <Clock className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-on-surface">
                          <span className="font-medium">{log.profiles?.first_name} {log.profiles?.last_name}</span>
                          {' '} {log.action === 'deleted' ? 'deleted' : 'uploaded'} document {' '}
                          <span className="font-medium">"{log.document_title}"</span>
                        </p>
                        <p className="text-xs text-on-surface-variant mt-1">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
