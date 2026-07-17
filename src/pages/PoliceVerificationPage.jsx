// src/pages/PoliceVerificationPage.jsx
import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const styles = {
    pending:  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };
  const icons = { pending: '⏳', approved: '✅', rejected: '❌' };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${styles[status] || styles.pending}`}>
      {icons[status]} {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
  );
}

// ─── Timeline Steps ───────────────────────────────────────────────────────────
function VerificationTimeline({ status }) {
  const steps = [
    { key: 'submitted', label: 'Request Submitted', icon: '📋' },
    { key: 'pending',   label: 'Under Review',      icon: '🔍' },
    { key: 'approved',  label: 'Police Cleared',    icon: '✅' },
  ];

  const currentIndex =
    status === 'approved' ? 2 :
    status === 'pending'  ? 1 : 0;

  return (
    <div className="flex items-center gap-2 mt-4 flex-wrap">
      {steps.map((step, i) => (
        <div key={step.key} className="flex items-center gap-2">
          <div className="flex flex-col items-center">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm transition-all
              ${i <= currentIndex
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
              {step.icon}
            </div>
            <span className={`text-xs mt-1 text-center w-20 leading-tight
              ${i <= currentIndex ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-gray-400'}`}>
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-0.5 w-10 mb-5 rounded transition-all
              ${i < currentIndex ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PoliceVerificationPage() {
  const [requests, setRequests]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [success, setSuccess]       = useState(false);
  const [error, setError]           = useState('');

  const [form, setForm] = useState({
    donorName:    '',
    caseNumber:   '',
    policeStation:'',
    officerName:  '',
    officerBadge: '',
    incidentType: '',
    incidentDate: '',
    description:  '',
  });

  // ── Fetch this donor's own requests ──────────────────────────────────────
  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'policeVerifications'),
      where('requestedBy', '==', auth.currentUser.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Basic validation
    if (!form.donorName || !form.caseNumber || !form.policeStation || !form.incidentType) {
      setError('Please fill all required fields marked with *');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'policeVerifications'), {
        ...form,
        requestedBy: auth.currentUser.uid,
        requestedByEmail: auth.currentUser.email,
        status: 'pending',
        adminNote: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSuccess(true);
      setShowForm(false);
      setForm({
        donorName: '', caseNumber: '', policeStation: '',
        officerName: '', officerBadge: '', incidentType: '',
        incidentDate: '', description: '',
      });
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      setError('Failed to submit: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount  = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                🚔 Police Verification
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                Submit and track your police clearance request for organ donation
              </p>
            </div>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all"
            >
              {showForm ? '✕ Cancel' : '+ New Request'}
            </button>
          </div>
        </div>

        {/* ── Success Alert ── */}
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4 flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-semibold text-green-800 dark:text-green-400">Request Submitted!</p>
              <p className="text-sm text-green-600 dark:text-green-500">Admin will review your police verification request shortly.</p>
            </div>
          </div>
        )}

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Pending',  value: pendingCount,  color: 'from-yellow-500 to-yellow-600', bg: 'from-yellow-500/10 to-yellow-600/5', icon: '⏳' },
            { label: 'Approved', value: approvedCount, color: 'from-green-500 to-emerald-600', bg: 'from-green-500/10 to-emerald-600/5', icon: '✅' },
            { label: 'Rejected', value: rejectedCount, color: 'from-red-500 to-red-600',       bg: 'from-red-500/10 to-red-600/5',       icon: '❌' },
          ].map((s) => (
            <div key={s.label} className={`bg-gradient-to-br ${s.bg} rounded-2xl p-4 border border-white/20 shadow text-center`}>
              <p className="text-2xl mb-1">{s.icon}</p>
              <p className={`text-2xl font-bold bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>{s.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Submission Form ── */}
        {showForm && (
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span>📋</span> New Police Verification Request
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Donor Name */}
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Donor Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="donorName"
                    value={form.donorName}
                    onChange={handleChange}
                    placeholder="Enter donor's full name"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                {/* Incident Type */}
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Incident Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="incidentType"
                    value={form.incidentType}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:border-indigo-500 outline-none transition-all"
                  >
                    <option value="">Select incident type</option>
                    <option value="road_accident">Road Accident</option>
                    <option value="brain_death">Brain Death (Medical)</option>
                    <option value="natural_death">Natural Death</option>
                    <option value="industrial_accident">Industrial Accident</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* FIR / Case Number */}
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    FIR / Case Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="caseNumber"
                    value={form.caseNumber}
                    onChange={handleChange}
                    placeholder="e.g. FIR/2026/001234"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                {/* Police Station */}
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Police Station <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="policeStation"
                    value={form.policeStation}
                    onChange={handleChange}
                    placeholder="e.g. Bharuch City Police Station"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                {/* Officer Name */}
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Investigating Officer Name
                  </label>
                  <input
                    name="officerName"
                    value={form.officerName}
                    onChange={handleChange}
                    placeholder="Officer full name"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                {/* Officer Badge */}
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Officer Badge / ID Number
                  </label>
                  <input
                    name="officerBadge"
                    value={form.officerBadge}
                    onChange={handleChange}
                    placeholder="e.g. GUJ-2341"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                {/* Incident Date */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-1">
                    Date of Incident
                  </label>
                  <input
                    type="date"
                    name="incidentDate"
                    value={form.incidentDate}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-1">
                    Additional Description
                  </label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Provide any additional details about the case..."
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:border-indigo-500 outline-none transition-all resize-none"
                  />
                </div>
              </div>

              {/* Info Note */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-700 dark:text-blue-400">
                ℹ️ Physical documents (FIR copy, Death Certificate) should be submitted directly to the hospital admin. This form creates a digital record for tracking purposes.
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-3 bg-gray-200 dark:bg-gray-700 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? '⏳ Submitting...' : '🚔 Submit Request'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── My Requests List ── */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20">
          <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
            <span>📁</span> My Verification Requests
          </h2>

          {loading && (
            <div className="flex justify-center py-8">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && requests.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-5xl mb-3">🚔</p>
              <p className="font-medium">No requests submitted yet.</p>
              <p className="text-sm mt-1">Click "+ New Request" to submit a police verification.</p>
            </div>
          )}

          <div className="space-y-4">
            {requests
              .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
              .map((req) => (
                <div
                  key={req.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-2xl p-5 hover:shadow-md transition-all"
                >
                  {/* Top Row */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-lg">{req.donorName}</h3>
                        <StatusBadge status={req.status} />
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        FIR: <span className="font-mono font-semibold">{req.caseNumber}</span>
                        {' · '}
                        {req.incidentType?.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 whitespace-nowrap">
                      {req.createdAt?.toDate
                        ? req.createdAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : 'Just now'}
                    </p>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Police Station</p>
                      <p className="font-semibold text-sm mt-0.5">{req.policeStation || '—'}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Officer</p>
                      <p className="font-semibold text-sm mt-0.5">{req.officerName || '—'}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Badge / ID</p>
                      <p className="font-semibold text-sm mt-0.5 font-mono">{req.officerBadge || '—'}</p>
                    </div>
                  </div>

                  {/* Admin Note */}
                  {req.adminNote && (
                    <div className={`mt-4 p-3 rounded-xl text-sm border ${
                      req.status === 'approved'
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                    }`}>
                      <span className="font-semibold">Admin Note: </span>{req.adminNote}
                    </div>
                  )}

                  {/* Timeline */}
                  <VerificationTimeline status={req.status} />
                </div>
              ))}
          </div>
        </div>

      </div>
    </div>
  );
}