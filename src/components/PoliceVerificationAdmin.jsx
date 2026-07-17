// src/components/PoliceVerificationAdmin.jsx
import { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
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

// ─── Incident Type Label ──────────────────────────────────────────────────────
function IncidentLabel({ type }) {
  const labels = {
    road_accident:      { label: 'Road Accident',       color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    brain_death:        { label: 'Brain Death',          color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
    natural_death:      { label: 'Natural Death',        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    industrial_accident:{ label: 'Industrial Accident',  color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    other:              { label: 'Other',                color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  };
  const item = labels[type] || labels.other;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.color}`}>
      {item.label}
    </span>
  );
}

// ─── Review Modal ─────────────────────────────────────────────────────────────
function ReviewModal({ request, onClose, onSave }) {
  const [decision, setDecision] = useState(request.status === 'pending' ? '' : request.status);
  const [note, setNote]         = useState(request.adminNote || '');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const handleSave = async () => {
    if (!decision) { setError('Please select Approve or Reject.'); return; }
    setSaving(true);
    try {
      await onSave(request.id, decision, note);
      onClose();
    } catch (err) {
      setError('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fadeIn">

        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 rounded-t-3xl z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              🚔 Review Police Verification
            </h2>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">

          {/* Request Summary */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-700 dark:to-gray-700 rounded-2xl p-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Donor Name</p>
                <p className="font-bold text-lg">{request.donorName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">FIR / Case Number</p>
                <p className="font-bold text-lg font-mono">{request.caseNumber}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Police Station</p>
                <p className="font-semibold">{request.policeStation}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Incident Type</p>
                <div className="mt-1"><IncidentLabel type={request.incidentType} /></div>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Officer Name</p>
                <p className="font-semibold">{request.officerName || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Badge / ID</p>
                <p className="font-semibold font-mono">{request.officerBadge || '—'}</p>
              </div>
              {request.incidentDate && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Incident Date</p>
                  <p className="font-semibold">{new Date(request.incidentDate).toLocaleDateString('en-IN')}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Submitted By</p>
                <p className="font-semibold text-sm">{request.requestedByEmail || '—'}</p>
              </div>
            </div>

            {request.description && (
              <div className="mt-4 pt-4 border-t border-indigo-100 dark:border-gray-600">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Description</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{request.description}</p>
              </div>
            )}
          </div>

          {/* Current Status */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Current Status:</span>
            <StatusBadge status={request.status} />
          </div>

          {/* Decision */}
          <div>
            <label className="block text-sm font-semibold mb-3">Your Decision</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setDecision('approved')}
                className={`py-3 rounded-xl font-semibold border-2 transition-all flex items-center justify-center gap-2 ${
                  decision === 'approved'
                    ? 'bg-green-600 text-white border-green-600 shadow-lg shadow-green-500/30'
                    : 'border-green-300 text-green-700 dark:border-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                }`}
              >
                ✅ Approve
              </button>
              <button
                onClick={() => setDecision('rejected')}
                className={`py-3 rounded-xl font-semibold border-2 transition-all flex items-center justify-center gap-2 ${
                  decision === 'rejected'
                    ? 'bg-red-600 text-white border-red-600 shadow-lg shadow-red-500/30'
                    : 'border-red-300 text-red-700 dark:border-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                }`}
              >
                ❌ Reject
              </button>
            </div>
          </div>

          {/* Admin Note */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Admin Note <span className="text-gray-400 font-normal">(shown to donor)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={
                decision === 'rejected'
                  ? 'Explain reason for rejection...'
                  : 'Add any clearance notes or conditions...'
              }
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:border-indigo-500 outline-none transition-all resize-none"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">⚠️ {error}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-5 py-3 bg-gray-200 dark:bg-gray-700 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !decision}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? '⏳ Saving...' : '💾 Save Decision'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Admin Component ─────────────────────────────────────────────────────
export default function PoliceVerificationAdmin() {
  const [requests, setRequests]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selectedRequest, setSelected] = useState(null);
  const [filterStatus, setFilter]     = useState('all');
  const [searchQuery, setSearch]      = useState('');
  const [toast, setToast]             = useState('');

  // ── Real-time listener ────────────────────────────────────────────────────
  useEffect(() => {
    const q = query(
      collection(db, 'policeVerifications'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Save Decision ─────────────────────────────────────────────────────────
  const handleSaveDecision = async (requestId, decision, note) => {
    await updateDoc(doc(db, 'policeVerifications', requestId), {
      status:    decision,
      adminNote: note,
      updatedAt: serverTimestamp(),
    });
    setToast(`Request ${decision === 'approved' ? 'approved ✅' : 'rejected ❌'} successfully`);
    setTimeout(() => setToast(''), 3500);
  };

  // ── Filtered List ─────────────────────────────────────────────────────────
  const filtered = requests.filter((r) => {
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      r.donorName?.toLowerCase().includes(q) ||
      r.caseNumber?.toLowerCase().includes(q) ||
      r.policeStation?.toLowerCase().includes(q) ||
      r.requestedByEmail?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const pendingCount  = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length;

  return (
    <div className="space-y-6">

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium animate-fadeIn">
          {toast}
        </div>
      )}

      {/* ── Review Modal ── */}
      {selectedRequest && (
        <ReviewModal
          request={selectedRequest}
          onClose={() => setSelected(null)}
          onSave={handleSaveDecision}
        />
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            🚔 Police Verification Requests
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Review and approve donor police clearance submissions
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-xl text-sm font-semibold">
            ⏳ {pendingCount} Pending Review
          </span>
        )}
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending',  value: pendingCount,  color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800', icon: '⏳' },
          { label: 'Approved', value: approvedCount, color: 'text-green-600 dark:text-green-400',   bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',   icon: '✅' },
          { label: 'Rejected', value: rejectedCount, color: 'text-red-600 dark:text-red-400',       bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',           icon: '❌' },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl p-4 border text-center ${s.bg}`}>
            <p className="text-xl mb-1">{s.icon}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="🔍 Search by donor name, FIR, station..."
          value={searchQuery}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:border-indigo-500 outline-none transition-all"
        />
        <div className="flex gap-2">
          {['all', 'pending', 'approved', 'rejected'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${
                filterStatus === f
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ── Empty State ── */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-3">🚔</p>
          <p className="font-semibold text-lg">No requests found</p>
          <p className="text-sm mt-1">
            {filterStatus !== 'all'
              ? `No ${filterStatus} requests right now.`
              : 'No police verification requests have been submitted yet.'}
          </p>
        </div>
      )}

      {/* ── Requests Table (Desktop) ── */}
      {!loading && filtered.length > 0 && (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {['Donor Name', 'FIR Number', 'Police Station', 'Incident', 'Submitted On', 'Status', 'Actions'].map((col) => (
                    <th key={col} className="px-5 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                {filtered.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-5 py-4 font-semibold">{req.donorName}</td>
                    <td className="px-5 py-4 font-mono text-sm text-indigo-600 dark:text-indigo-400">{req.caseNumber}</td>
                    <td className="px-5 py-4 text-sm">{req.policeStation}</td>
                    <td className="px-5 py-4">
                      <IncidentLabel type={req.incidentType} />
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {req.createdAt?.toDate
                        ? req.createdAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => setSelected(req)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                          req.status === 'pending'
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {req.status === 'pending' ? '🔍 Review' : '👁 View'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {filtered.map((req) => (
              <div key={req.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="font-bold">{req.donorName}</p>
                    <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">{req.caseNumber}</p>
                  </div>
                  <StatusBadge status={req.status} />
                </div>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400 mb-3">
                  <p>🏛 {req.policeStation}</p>
                  <p>📅 {req.createdAt?.toDate ? req.createdAt.toDate().toLocaleDateString('en-IN') : '—'}</p>
                </div>
                <div className="flex items-center justify-between">
                  <IncidentLabel type={req.incidentType} />
                  <button
                    onClick={() => setSelected(req)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      req.status === 'pending'
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {req.status === 'pending' ? '🔍 Review' : '👁 View'}
                  </button>
                </div>
                {req.adminNote && (
                  <div className={`mt-3 p-2 rounded-lg text-xs ${
                    req.status === 'approved'
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                      : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                  }`}>
                    Note: {req.adminNote}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Footer Count ── */}
      {!loading && filtered.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          Showing {filtered.length} of {requests.length} total requests
        </p>
      )}
    </div>
  );
}