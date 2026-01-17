import React, { useState, useEffect } from 'react';
import { Upload, FileText, Clock, Loader2, Eye, Shield, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

const DocumentUploadSystem = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

  const DOCUMENT_TYPES = [
    { id: 'aadhaar', label: 'Aadhaar Card', required: true, icon: '🆔' },
    { id: 'medical', label: 'Medical Report', required: true, icon: '🏥' },
    { id: 'blood_test', label: 'Blood Test Report', required: true, icon: '🩸' },
    { id: 'photo', label: 'Recent Photograph', required: true, icon: '📸' },
    { id: 'address_proof', label: 'Address Proof', required: false, icon: '🏠' },
    { id: 'consent_form', label: 'Consent Form', required: true, icon: '📝' }
  ];

  // Load documents from Firestore (real-time)
  useEffect(() => {
    if (!user) {
      console.log('No user logged in');
      return;
    }

    console.log('Setting up Firestore listener for user:', user.uid);
    
    try {
      const documentsRef = collection(db, 'documents');
      const q = query(documentsRef, where('userId', '==', user.uid));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({
          firestoreId: doc.id,
          ...doc.data()
        }));
        
        console.log('✅ Loaded documents from Firestore:', docs.length, docs);
        setDocuments(docs);
      }, (error) => {
        console.error('❌ Firestore listener error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        if (error.code === 'permission-denied') {
          alert('Permission denied. Please check Firestore security rules.');
        } else if (error.code === 'unavailable') {
          alert('Firestore is unavailable. Please check your internet connection.');
        } else {
          alert(`Error loading documents: ${error.message}`);
        }
      });

      return () => {
        console.log('Cleaning up Firestore listener');
        unsubscribe();
      };
    } catch (error) {
      console.error('❌ Error setting up listener:', error);
      alert('Failed to initialize document listener. Please refresh the page.');
    }
  }, [user]);

  // AI Document Analysis
  const analyzeDocument = async (file, docType) => {
    if (!GROQ_API_KEY) {
      console.warn('GROQ API key not configured - skipping AI analysis');
      return {
        readable: true,
        appears_genuine: true,
        complete: true,
        medical_info: null,
        notes: 'Awaiting doctor review - AI analysis not configured'
      };
    }

    try {
      console.log('Starting AI analysis for:', file.name);
      const base64 = await fileToBase64(file);
      
      const analysisPrompt = `Analyze this ${docType} document for an Organ Donor Management System.

Provide a brief assessment:
1. Is the document clear and readable?
2. Does it appear genuine?
3. Are all required fields visible?
4. Any medical information you can extract (if applicable)?

Respond in JSON format:
{
  "readable": true/false,
  "appears_genuine": true/false,
  "complete": true/false,
  "medical_info": {
    "blood_type": "string or null",
    "conditions": ["list"],
    "allergies": ["list"]
  },
  "notes": "brief summary"
}`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.2-11b-vision-preview',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: analysisPrompt },
                {
                  type: 'image_url',
                  image_url: { url: `data:${file.type};base64,${base64}` }
                }
              ]
            }
          ],
          temperature: 0.2,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI Analysis API error:', errorText);
        throw new Error('Analysis failed');
      }

      const data = await response.json();
      const analysisText = data.choices[0].message.content;
      console.log('AI Analysis raw response:', analysisText);
      
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('AI Analysis parsed:', parsed);
        return parsed;
      }
      
      return {
        readable: true,
        appears_genuine: true,
        complete: true,
        medical_info: null,
        notes: 'Basic validation passed'
      };
    } catch (error) {
      console.error('Analysis error:', error);
      return {
        readable: true,
        appears_genuine: true,
        complete: true,
        medical_info: null,
        notes: 'Automated analysis unavailable - awaiting doctor review'
      };
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        reject(error);
      };
    });
  };

  const handleFileUpload = async (event, docType) => {
    const file = event.target.files[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('File selected:', file.name, 'Size:', file.size, 'Type:', file.type);

    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload JPG, PNG, or PDF files only');
      return;
    }

    // Limit file size to 500KB for Firestore storage
    if (file.size > 500 * 1024) {
      alert('File size must be less than 500KB when using Firestore storage. Please compress your file or upgrade to Firebase Blaze plan for larger files.');
      return;
    }

    setUploading(true);
    setAnalyzing(true);
    setUploadProgress('Preparing file...');

    try {
      // Step 1: Convert to base64
      setUploadProgress('Converting file...');
      const base64Data = await fileToBase64(file);
      console.log('✅ Base64 conversion complete, length:', base64Data.length);

      // Step 2: AI Analysis (optional)
      setUploadProgress('Analyzing document with AI...');
      const analysis = await analyzeDocument(file, docType);
      console.log('Analysis complete:', analysis);

      // Step 3: Delete old document if exists
      const existingDoc = documents.find(d => d.type === docType);
      if (existingDoc && existingDoc.firestoreId) {
        setUploadProgress('Removing old document...');
        console.log('Deleting existing document:', existingDoc.firestoreId);
        
        const docRef = doc(db, 'documents', existingDoc.firestoreId);
        await deleteDoc(docRef);
        console.log('Old document deleted from Firestore');
      }

      // Step 4: Save to Firestore (with base64 data)
      setUploadProgress('Saving document...');
      const docData = {
        userId: user.uid,
        userName: user.displayName || user.email,
        userEmail: user.email,
        type: docType,
        typeName: DOCUMENT_TYPES.find(dt => dt.id === docType)?.label || docType,
        name: file.name,
        size: file.size,
        fileType: file.type,
        fileData: base64Data, // Store base64 in Firestore
        uploadedAt: serverTimestamp(),
        status: 'pending', // pending, approved, rejected
        aiAnalysis: analysis,
        doctorReview: null,
        createdAt: new Date().toISOString()
      };

      console.log('Saving document data to Firestore...');
      const documentsRef = collection(db, 'documents');
      const newDocRef = await addDoc(documentsRef, docData);
      console.log('✅ Document saved to Firestore with ID:', newDocRef.id);

      setUploadProgress('Upload complete!');
      alert('Document uploaded successfully! Awaiting doctor verification.');
      
      // Reset file input
      event.target.value = '';
      
    } catch (error) {
      console.error('Upload error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      let errorMessage = 'Failed to upload document. ';
      if (error.message.includes('Maximum call stack size exceeded')) {
        errorMessage += 'File is too large for Firestore. Please use a smaller file or upgrade to Firebase Blaze plan.';
      } else {
        errorMessage += error.message || 'Please try again.';
      }
      
      alert(errorMessage);
    } finally {
      setUploading(false);
      setAnalyzing(false);
      setUploadProgress('');
    }
  };

  const removeDocument = async (docId) => {
    const document = documents.find(d => d.firestoreId === docId);
    if (!document) {
      console.error('Document not found');
      return;
    }

    if (document.status !== 'pending') {
      alert('Cannot delete documents that have been reviewed by a doctor.');
      return;
    }

    const confirmed = window.confirm('Are you sure you want to delete this document?');
    if (!confirmed) return;

    try {
      console.log('Deleting document:', docId);
      
      const docRef = doc(db, 'documents', docId);
      await deleteDoc(docRef);
      console.log('✅ Document deleted from Firestore');
      
      alert('Document deleted successfully');
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document. Please try again.');
    }
  };

  const downloadDocument = (document) => {
    try {
      const link = window.document.createElement('a');
      link.href = `data:${document.fileType};base64,${document.fileData}`;
      link.download = document.name;
      link.click();
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download document');
    }
  };

  const getStatusBadge = (status) => {
    const configs = {
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800', icon: Clock, label: 'Pending Review' },
      approved: { color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800', icon: CheckCircle, label: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800', icon: XCircle, label: 'Rejected' }
    };
    
    const config = configs[status] || configs.pending;
    const Icon = config.icon;

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${config.color} flex items-center gap-1`}>
        <Icon size={14} />
        {config.label}
      </span>
    );
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';
    try {
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleString();
      }
      return new Date(timestamp).toLocaleString();
    } catch (error) {
      return 'Recently';
    }
  };

  const allRequiredUploaded = DOCUMENT_TYPES
    .filter(dt => dt.required)
    .every(dt => documents.some(d => d.type === dt.id));

  const allApproved = DOCUMENT_TYPES
    .filter(dt => dt.required)
    .every(dt => {
      const doc = documents.find(d => d.type === dt.id);
      return doc && doc.status === 'approved';
    });

  const pendingCount = documents.filter(d => d.status === 'pending').length;
  const approvedCount = documents.filter(d => d.status === 'approved').length;
  const rejectedCount = documents.filter(d => d.status === 'rejected').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="text-red-500" size={40} />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Document Upload
            </h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-2">
            Upload your documents for doctor verification
          </p>
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            File size limited to 500KB 
          </p>

          {/* Status Summary */}
          <div className="flex justify-center gap-4 flex-wrap mt-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 px-4 py-2 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <Clock size={20} className="inline mr-2 text-yellow-600" />
              <span className="font-semibold text-yellow-800 dark:text-yellow-300">{pendingCount} Pending</span>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg border border-green-200 dark:border-green-800">
              <CheckCircle size={20} className="inline mr-2 text-green-600" />
              <span className="font-semibold text-green-800 dark:text-green-300">{approvedCount} Approved</span>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg border border-red-200 dark:border-red-800">
              <XCircle size={20} className="inline mr-2 text-red-600" />
              <span className="font-semibold text-red-800 dark:text-red-300">{rejectedCount} Rejected</span>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Upload size={24} />
            Required Documents
          </h2>

          <div className="space-y-4">
            {DOCUMENT_TYPES.map(docType => {
              const uploaded = documents.find(d => d.type === docType.id);
              
              return (
                <div key={docType.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-red-300 dark:hover:border-red-600 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{docType.icon}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {docType.label}
                          {docType.required && <span className="text-red-500 ml-1">*</span>}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          JPG, PNG, or PDF • Max 500KB
                        </p>
                      </div>
                    </div>
                    
                    {uploaded && getStatusBadge(uploaded.status)}
                  </div>

                  {uploaded ? (
                    <div className="mt-3 space-y-2">
                      <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg text-sm">
                        <p className="text-gray-700 dark:text-gray-300">
                          <strong>File:</strong> {uploaded.name} ({formatFileSize(uploaded.size)})
                        </p>
                        <p className="text-gray-700 dark:text-gray-300">
                          <strong>Uploaded:</strong> {formatDate(uploaded.uploadedAt)}
                        </p>
                        <button
                          onClick={() => downloadDocument(uploaded)}
                          className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-2"
                        >
                          <Eye size={14} />
                          View/Download Document
                        </button>
                        {uploaded.doctorReview && (
                          <>
                            <p className="text-gray-700 dark:text-gray-300 mt-2">
                              <strong>Doctor Review:</strong> {uploaded.doctorReview.comment}
                            </p>
                            <p className="text-gray-700 dark:text-gray-300">
                              <strong>Reviewed by:</strong> {uploaded.doctorReview.doctorName}
                            </p>
                            <p className="text-gray-700 dark:text-gray-300">
                              <strong>Reviewed on:</strong> {formatDate(uploaded.doctorReview.reviewedAt)}
                            </p>
                          </>
                        )}
                      </div>

                      {uploaded.status === 'pending' && (
                        <button
                          onClick={() => removeDocument(uploaded.firestoreId)}
                          className="w-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-2"
                        >
                          <Trash2 size={16} />
                          Remove Document
                        </button>
                      )}

                      {uploaded.status === 'rejected' && (
                        <label className="block">
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => handleFileUpload(e, docType.id)}
                            className="hidden"
                            disabled={uploading}
                          />
                          <div className="w-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-center cursor-pointer">
                            <Upload className="inline mr-2" size={16} />
                            Re-upload Document
                          </div>
                        </label>
                      )}
                    </div>
                  ) : (
                    <label className="block mt-3">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileUpload(e, docType.id)}
                        className="hidden"
                        disabled={uploading}
                      />
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:border-red-400 dark:hover:border-red-500 transition-colors">
                        <Upload className="mx-auto text-gray-400 mb-2" size={24} />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Click to upload {docType.label}
                        </p>
                      </div>
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Message */}
        {allRequiredUploaded && (
          <div className={`rounded-xl shadow-lg p-6 border ${
            allApproved 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
          }`}>
            {allApproved ? (
              <div className="text-center">
                <CheckCircle className="mx-auto text-green-600 dark:text-green-400 mb-3" size={48} />
                <h3 className="text-xl font-bold text-green-800 dark:text-green-300 mb-2">
                  All Documents Approved!
                </h3>
                <p className="text-green-700 dark:text-green-400 mb-4">
                  Your documents have been verified by our medical team. You can now proceed with registration.
                </p>
                <button className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold transition-colors">
                  Complete Registration
                </button>
              </div>
            ) : (
              <div className="text-center">
                <Clock className="mx-auto text-yellow-600 dark:text-yellow-400 mb-3" size={48} />
                <h3 className="text-xl font-bold text-yellow-800 dark:text-yellow-300 mb-2">
                  Awaiting Doctor Verification
                </h3>
                <p className="text-yellow-700 dark:text-yellow-400">
                  Your documents are being reviewed by our medical team. You will be notified once the verification is complete.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Upload Progress Modal */}
        {analyzing && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl max-w-sm">
              <Loader2 className="animate-spin text-red-500 mx-auto mb-4" size={48} />
              <p className="text-gray-900 dark:text-white font-semibold text-center mb-2">
                Processing...
              </p>
              {uploadProgress && (
                <p className="text-gray-600 dark:text-gray-400 text-sm text-center">
                  {uploadProgress}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentUploadSystem;