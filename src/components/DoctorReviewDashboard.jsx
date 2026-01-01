import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, FileText, Clock, Shield, AlertTriangle, User, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DoctorReviewDashboard = () => {
  const { user } = useAuth();
  const [allDocuments, setAllDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [reviewComment, setReviewComment] = useState('');
  const [filterStatus, setFilterStatus] = useState('pending');

  // Load all documents from all users
  useEffect(() => {
    loadAllDocuments();
  }, []);

  const loadAllDocuments = () => {
    const docs = [];
    // Get all documents from localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('documents_')) {
        const userDocs = JSON.parse(localStorage.getItem(key));
        docs.push(...userDocs);
      }
    }
    setAllDocuments(docs);
  };

  const handleReview = (docId, status, comment) => {
    if (!comment.trim()) {
      alert('Please provide a review comment');
      return;
    }

    // Find the document and update it
    const doc = allDocuments.find(d => d.id === docId);
    if (!doc) return;

    const review = {
      status,
      doctorId: user.uid,
      doctorName: user.displayName || user.email,
      comment,
      reviewedAt: new Date().toISOString()
    };

    // Update document
    doc.status = status;
    doc.doctorReview = review;

    // Save back to localStorage
    const userKey = `documents_${doc.userId}`;
    const userDocs = JSON.parse(localStorage.getItem(userKey) || '[]');
    const updatedUserDocs = userDocs.map(d => d.id === docId ? doc : d);
    localStorage.setItem(userKey, JSON.stringify(updatedUserDocs));

    // Refresh
    loadAllDocuments();
    setSelectedDoc(null);
    setReviewComment('');
    alert(`Document ${status}!`);
  };

  const filteredDocs = allDocuments.filter(d => 
    filterStatus === 'all' ? true : d.status === filterStatus
  );

  const pendingCount = allDocuments.filter(d => d.status === 'pending').length;
  const approvedCount = allDocuments.filter(d => d.status === 'approved').length;
  const rejectedCount = allDocuments.filter(d => d.status === 'rejected').length;

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status] || colors.pending;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="text-blue-500" size={40} />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Document Review Dashboard
            </h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Review and verify donor/recipient documents
          </p>
        </div>

        {/* Statistics */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <FileText className="text-blue-500 mb-3" size={32} />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{allDocuments.length}</h3>
            <p className="text-gray-600 dark:text-gray-400">Total Documents</p>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-6 shadow-lg border border-yellow-200 dark:border-yellow-800">
            <Clock className="text-yellow-600 mb-3" size={32} />
            <h3 className="text-2xl font-bold text-yellow-800 dark:text-yellow-300">{pendingCount}</h3>
            <p className="text-yellow-700 dark:text-yellow-400">Pending Review</p>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6 shadow-lg border border-green-200 dark:border-green-800">
            <CheckCircle className="text-green-600 mb-3" size={32} />
            <h3 className="text-2xl font-bold text-green-800 dark:text-green-300">{approvedCount}</h3>
            <p className="text-green-700 dark:text-green-400">Approved</p>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 shadow-lg border border-red-200 dark:border-red-800">
            <XCircle className="text-red-600 mb-3" size={32} />
            <h3 className="text-2xl font-bold text-red-800 dark:text-red-300">{rejectedCount}</h3>
            <p className="text-red-700 dark:text-red-400">Rejected</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Document List */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              
              {/* Filter Tabs */}
              <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
                {[
                  { value: 'pending', label: 'Pending', count: pendingCount },
                  { value: 'approved', label: 'Approved', count: approvedCount },
                  { value: 'rejected', label: 'Rejected', count: rejectedCount },
                  { value: 'all', label: 'All', count: allDocuments.length }
                ].map(tab => (
                  <button
                    key={tab.value}
                    onClick={() => setFilterStatus(tab.value)}
                    className={`px-4 py-2 font-semibold transition-colors border-b-2 ${
                      filterStatus === tab.value
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>

              {/* Document Cards */}
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {filteredDocs.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={48} />
                    <p className="text-gray-500 dark:text-gray-400">No documents to review</p>
                  </div>
                ) : (
                  filteredDocs.map(doc => (
                    <div
                      key={doc.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                        selectedDoc?.id === doc.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                      onClick={() => setSelectedDoc(doc)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText size={20} className="text-gray-500" />
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {doc.typeName}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <User size={14} />
                            <span>{doc.userName}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Calendar size={14} />
                            <span>{new Date(doc.uploadedAt).toLocaleString()}</span>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(doc.status)}`}>
                          {doc.status.toUpperCase()}
                        </span>
                      </div>

                      {/* AI Analysis Preview */}
                      {doc.aiAnalysis && (
                        <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg text-sm mb-2">
                          <p className="text-gray-700 dark:text-gray-300">
                            <strong>AI Analysis:</strong> {doc.aiAnalysis.notes || 'Completed'}
                          </p>
                        </div>
                      )}

                      {/* Doctor Review Preview */}
                      {doc.doctorReview && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm">
                          <p className="text-blue-800 dark:text-blue-300">
                            <strong>Your Review:</strong> {doc.doctorReview.comment}
                          </p>
                        </div>
                      )}

                      <button className="mt-3 w-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center justify-center gap-2">
                        <Eye size={16} />
                        {selectedDoc?.id === doc.id ? 'Viewing Details' : 'View & Review'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Review Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 sticky top-4">
              {selectedDoc ? (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Shield size={24} />
                    Document Review
                  </h2>

                  {/* Document Info */}
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-2">
                    <p className="text-sm">
                      <strong className="text-gray-900 dark:text-white">Document:</strong>{' '}
                      <span className="text-gray-700 dark:text-gray-300">{selectedDoc.typeName}</span>
                    </p>
                    <p className="text-sm">
                      <strong className="text-gray-900 dark:text-white">User:</strong>{' '}
                      <span className="text-gray-700 dark:text-gray-300">{selectedDoc.userName}</span>
                    </p>
                    <p className="text-sm">
                      <strong className="text-gray-900 dark:text-white">Uploaded:</strong>{' '}
                      <span className="text-gray-700 dark:text-gray-300">
                        {new Date(selectedDoc.uploadedAt).toLocaleString()}
                      </span>
                    </p>
                    <p className="text-sm">
                      <strong className="text-gray-900 dark:text-white">Status:</strong>{' '}
                      <span className={`font-semibold ${
                        selectedDoc.status === 'approved' ? 'text-green-600' :
                        selectedDoc.status === 'rejected' ? 'text-red-600' :
                        'text-yellow-600'
                      }`}>
                        {selectedDoc.status.toUpperCase()}
                      </span>
                    </p>
                  </div>

                  {/* AI Analysis */}
                  {selectedDoc.aiAnalysis && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                        <AlertTriangle size={16} />
                        AI Pre-Analysis
                      </h3>
                      <div className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                        <p>• Readable: {selectedDoc.aiAnalysis.readable ? '✅ Yes' : '❌ No'}</p>
                        <p>• Appears Genuine: {selectedDoc.aiAnalysis.appears_genuine ? '✅ Yes' : '❌ No'}</p>
                        <p>• Complete: {selectedDoc.aiAnalysis.complete ? '✅ Yes' : '❌ No'}</p>
                        {selectedDoc.aiAnalysis.medical_info && (
                          <>
                            <p className="mt-2"><strong>Medical Info:</strong></p>
                            {selectedDoc.aiAnalysis.medical_info.blood_type && (
                              <p>• Blood Type: {selectedDoc.aiAnalysis.medical_info.blood_type}</p>
                            )}
                          </>
                        )}
                        <p className="mt-2 text-xs italic">{selectedDoc.aiAnalysis.notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Document Preview */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <img 
                      src={selectedDoc.preview} 
                      alt="Document preview" 
                      className="w-full h-64 object-contain bg-gray-100 dark:bg-gray-900"
                    />
                  </div>

                  {/* Review Form (only for pending) */}
                  {selectedDoc.status === 'pending' && (
                    <div className="space-y-3">
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Enter your review comments..."
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                        rows={4}
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => handleReview(selectedDoc.id, 'approved', reviewComment)}
                          className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-semibold"
                        >
                          <CheckCircle size={20} />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReview(selectedDoc.id, 'rejected', reviewComment)}
                          className="bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 font-semibold"
                        >
                          <XCircle size={20} />
                          Reject
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Existing Review */}
                  {selectedDoc.doctorReview && (
                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Previous Review</h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                        {selectedDoc.doctorReview.comment}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        by {selectedDoc.doctorReview.doctorName} on {new Date(selectedDoc.doctorReview.reviewedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Eye className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={48} />
                  <p className="text-gray-500 dark:text-gray-400">
                    Select a document to review
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorReviewDashboard;