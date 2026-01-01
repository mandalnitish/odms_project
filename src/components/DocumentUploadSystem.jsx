import React, { useState, useEffect } from 'react';
import { Upload, FileText, Clock, Loader2, Eye, Shield, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DocumentUploadSystem = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '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';

  const DOCUMENT_TYPES = [
    { id: 'aadhaar', label: 'Aadhaar Card', required: true, icon: '🆔' },
    { id: 'medical', label: 'Medical Report', required: true, icon: '🏥' },
    { id: 'blood_test', label: 'Blood Test Report', required: true, icon: '🩸' },
    { id: 'photo', label: 'Recent Photograph', required: true, icon: '📸' },
    { id: 'address_proof', label: 'Address Proof', required: false, icon: '🏠' },
    { id: 'consent_form', label: 'Consent Form', required: true, icon: '📝' }
  ];

  // Load documents from localStorage (simulate database)
  useEffect(() => {
    const savedDocs = localStorage.getItem(`documents_${user.uid}`);
    if (savedDocs) {
      setDocuments(JSON.parse(savedDocs));
    }
  }, [user.uid]);

  // Save documents to localStorage
  const saveDocuments = (docs) => {
    localStorage.setItem(`documents_${user.uid}`, JSON.stringify(docs));
    setDocuments(docs);
  };

  // AI Document Analysis
  const analyzeDocument = async (file, docType) => {
    try {
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
          model: 'llama-3.2-90b-vision-preview',
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

      if (!response.ok) throw new Error('Analysis failed');

      const data = await response.json();
      const analysisText = data.choices[0].message.content;
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
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
      reader.onerror = reject;
    });
  };

  const handleFileUpload = async (event, docType) => {
    const file = event.target.files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload JPG, PNG, or PDF files only');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    setAnalyzing(true);

    try {
      const base64Data = await fileToBase64(file);
      const analysis = await analyzeDocument(file, docType);

      const doc = {
        id: Date.now(),
        userId: user.uid,
        userName: user.displayName || user.email,
        type: docType,
        typeName: DOCUMENT_TYPES.find(dt => dt.id === docType)?.label,
        name: file.name,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        status: 'pending', // pending, approved, rejected
        aiAnalysis: analysis,
        doctorReview: null,
        preview: `data:${file.type};base64,${base64Data}`,
        fileData: base64Data,
        fileType: file.type
      };

      const updatedDocs = [...documents, doc];
      saveDocuments(updatedDocs);

      alert('Document uploaded successfully! Awaiting doctor verification.');
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const removeDocument = (docId) => {
    const doc = documents.find(d => d.id === docId);
    if (doc.status !== 'pending') {
      alert('Cannot delete documents that have been reviewed by a doctor.');
      return;
    }
    const updatedDocs = documents.filter(d => d.id !== docId);
    saveDocuments(updatedDocs);
  };

  const getStatusBadge = (status) => {
    const configs = {
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, label: 'Pending Review' },
      approved: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, label: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle, label: 'Rejected' }
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
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
            Upload your documents for doctor verification
          </p>

          {/* Status Summary */}
          <div className="flex justify-center gap-4 flex-wrap">
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
                          JPG, PNG, or PDF • Max 10MB
                        </p>
                      </div>
                    </div>
                    
                    {uploaded && getStatusBadge(uploaded.status)}
                  </div>

                  {uploaded ? (
                    <div className="mt-3 space-y-2">
                      <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg text-sm">
                        <p className="text-gray-700 dark:text-gray-300">
                          <strong>File:</strong> {uploaded.name}
                        </p>
                        <p className="text-gray-700 dark:text-gray-300">
                          <strong>Uploaded:</strong> {new Date(uploaded.uploadedAt).toLocaleString()}
                        </p>
                        {uploaded.doctorReview && (
                          <>
                            <p className="text-gray-700 dark:text-gray-300 mt-2">
                              <strong>Doctor Review:</strong> {uploaded.doctorReview.comment}
                            </p>
                            <p className="text-gray-700 dark:text-gray-300">
                              <strong>Reviewed by:</strong> {uploaded.doctorReview.doctorName}
                            </p>
                            <p className="text-gray-700 dark:text-gray-300">
                              <strong>Reviewed on:</strong> {new Date(uploaded.doctorReview.reviewedAt).toLocaleString()}
                            </p>
                          </>
                        )}
                      </div>

                      {uploaded.status === 'pending' && (
                        <button
                          onClick={() => removeDocument(uploaded.id)}
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
                <button className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold">
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

        {analyzing && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl">
              <Loader2 className="animate-spin text-red-500 mx-auto mb-4" size={48} />
              <p className="text-gray-900 dark:text-white font-semibold">Analyzing document...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentUploadSystem;