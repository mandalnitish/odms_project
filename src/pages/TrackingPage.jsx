import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { db } from '../firebase';
import { collection, onSnapshot, getDocs, updateDoc, doc } from 'firebase/firestore';
import 'leaflet/dist/leaflet.css';

// ─── Fix Leaflet default icon bug with Vite ───────────────────────────────────
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// ─── Helper: handles Firestore GeoPoint (.latitude/.longitude),
//             plain map ({lat, lng}), and internal GeoPoint (._lat/._long) ─────
const getLat = (loc) => {
  if (!loc) return null;
  // Firestore GeoPoint (most common): { latitude, longitude }
  if (typeof loc.latitude === 'number') return loc.latitude;
  // Plain map written by simulation: { lat, lng }
  if (typeof loc.lat === 'number') return loc.lat;
  // Internal GeoPoint fallback
  if (typeof loc._lat === 'number') return loc._lat;
  return null;
};

const getLng = (loc) => {
  if (!loc) return null;
  // Firestore GeoPoint: { latitude, longitude }
  if (typeof loc.longitude === 'number') return loc.longitude;
  // Plain map: { lat, lng }
  if (typeof loc.lng === 'number') return loc.lng;
  // Internal GeoPoint fallback
  if (typeof loc._long === 'number') return loc._long;
  return null;
};

// ─── Custom colored dot icons ─────────────────────────────────────────────────
const createIcon = (color, emoji) =>
  L.divIcon({
    html: `<div style="
      background:${color};
      width:20px;height:20px;
      border-radius:50%;
      border:3px solid white;
      box-shadow:0 0 8px rgba(0,0,0,0.5);
      display:flex;align-items:center;justify-content:center;
      font-size:10px;
    ">${emoji}</div>`,
    className: '',
    iconAnchor: [10, 10],
  });

const donorIcon     = createIcon('#22c55e', '');
const recipientIcon = createIcon('#ef4444', '');
const vehicleIcon   = createIcon('#f59e0b', '🚑');

// ─── Status steps ─────────────────────────────────────────────────────────────
const STEPS = ['harvested', 'in_transit', 'arrived', 'delivered'];
const STEP_LABELS = {
  harvested:  '🫀 Harvested',
  in_transit: '🚑 In Transit',
  arrived:    '🏥 Arrived',
  delivered:  '✅ Delivered',
};

// ─── Simulate vehicle movement ────────────────────────────────────────────────
async function tickVehicleMovement(db) {
  const snapshot = await getDocs(collection(db, 'organTransfers'));
  snapshot.forEach(async (docSnap) => {
    const data = docSnap.data();
    if (data.status !== 'in_transit' || !data.vehicleLocation) return;

    const { vehicleLocation, recipientLocation } = data;

    const vLat = getLat(vehicleLocation);
    const vLng = getLng(vehicleLocation);
    const rLat = getLat(recipientLocation);
    const rLng = getLng(recipientLocation);

    if (vLat === null || vLng === null || rLat === null || rLng === null) return;

    const newLat = vLat + (rLat - vLat) * 0.1;
    const newLng = vLng + (rLng - vLng) * 0.1;
    const dist = Math.abs(newLat - rLat) + Math.abs(newLng - rLng);
    const newStatus = dist < 0.01 ? 'arrived' : 'in_transit';

    // Write back as plain map {lat, lng} — avoids GeoPoint constructor dependency
    await updateDoc(doc(db, 'organTransfers', docSnap.id), {
      vehicleLocation: { lat: newLat, lng: newLng },
      status: newStatus,
    });
  });
}

// ─── Timeline Component ───────────────────────────────────────────────────────
function TransferTimeline({ status }) {
  const currentIndex = STEPS.indexOf(status);
  return (
    <div className="flex items-center flex-wrap gap-1 mt-3">
      {STEPS.map((step, i) => (
        <div key={step} className="flex items-center gap-1">
          <div className="flex flex-col items-center">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500
                ${i <= currentIndex ? 'bg-green-500 text-white shadow-lg shadow-green-500/40' : 'bg-white/10 text-white/30'}`}
            >
              {i + 1}
            </div>
            <span className={`text-xs mt-1 text-center w-16 leading-tight
              ${i <= currentIndex ? 'text-green-400' : 'text-white/30'}`}>
              {STEP_LABELS[step]}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-0.5 w-8 mb-4 rounded transition-all duration-500
              ${i < currentIndex ? 'bg-green-500' : 'bg-white/10'}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Map Overlays for each transfer ──────────────────────────────────────────
function TransferOverlay({ transfer }) {
  const {
    donorLocation, recipientLocation, vehicleLocation,
    organType, status, donorName, recipientName, urgencyLevel,
  } = transfer;

  if (!donorLocation || !recipientLocation) return null;

  const dLat = getLat(donorLocation);
  const dLng = getLng(donorLocation);
  const rLat = getLat(recipientLocation);
  const rLng = getLng(recipientLocation);

  // Skip rendering if coordinates couldn't be extracted
  if (dLat === null || dLng === null || rLat === null || rLng === null) return null;

  const vLat = getLat(vehicleLocation);
  const vLng = getLng(vehicleLocation);
  const hasVehicle = vehicleLocation && vLat !== null && vLng !== null;

  const routeCoords = [
    [dLat, dLng],
    hasVehicle ? [vLat, vLng] : null,
    [rLat, rLng],
  ].filter(Boolean);

  const lineColor = urgencyLevel === 'critical' ? '#ef4444' : '#3b82f6';

  return (
    <>
      <Marker position={[dLat, dLng]} icon={donorIcon}>
        <Popup>
          <div className="text-sm">
            <p className="font-bold text-green-600">🟢 Donor</p>
            <p>{donorName}</p>
            <p className="text-gray-500">Organ: {organType}</p>
          </div>
        </Popup>
      </Marker>

      <Marker position={[rLat, rLng]} icon={recipientIcon}>
        <Popup>
          <div className="text-sm">
            <p className="font-bold text-red-600">🔴 Recipient</p>
            <p>{recipientName}</p>
            <p className="text-gray-500">Urgency: <span className="font-semibold">{urgencyLevel}</span></p>
          </div>
        </Popup>
      </Marker>

      {hasVehicle && status === 'in_transit' && (
        <Marker position={[vLat, vLng]} icon={vehicleIcon}>
          <Popup>
            <div className="text-sm">
              <p className="font-bold text-amber-600">🚑 Transport Vehicle</p>
              <p>Carrying: {organType}</p>
              <p className="text-gray-500">Status: In Transit</p>
            </div>
          </Popup>
        </Marker>
      )}

      <Polyline
        positions={routeCoords}
        pathOptions={{ color: lineColor, dashArray: '8,6', weight: 3, opacity: 0.8 }}
      />
    </>
  );
}

// ─── Urgency Badge ────────────────────────────────────────────────────────────
function UrgencyBadge({ level }) {
  const styles = {
    critical: 'bg-red-500/20 text-red-400 border border-red-500/30',
    high:     'bg-orange-500/20 text-orange-400 border border-orange-500/30',
    medium:   'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    low:      'bg-green-500/20 text-green-400 border border-green-500/30',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold uppercase ${styles[level] || styles.low}`}>
      {level}
    </span>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const styles = {
    harvested:  'bg-blue-500/20 text-blue-400',
    in_transit: 'bg-amber-500/20 text-amber-400',
    arrived:    'bg-purple-500/20 text-purple-400',
    delivered:  'bg-green-500/20 text-green-400',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${styles[status] || ''}`}>
      {STEP_LABELS[status] || status}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TrackingPage() {
  const [transfers, setTransfers]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [lastTick, setLastTick]       = useState(null);
  const [simulationOn, setSimulation] = useState(true);

  // Real-time Firestore listener — always clears loading, even on error
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'organTransfers'),
      (snap) => {
        setTransfers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Firestore error:', err);
        setError(err.message);
        setLoading(false); // ← always unblock the map
      }
    );
    return () => unsub();
  }, []);

  // Vehicle simulation loop
  useEffect(() => {
    if (!simulationOn) return;
    const interval = setInterval(async () => {
      await tickVehicleMovement(db);
      setLastTick(new Date().toLocaleTimeString());
    }, 5000);
    return () => clearInterval(interval);
  }, [simulationOn]);

  const inTransitCount = transfers.filter((t) => t.status === 'in_transit').length;
  const criticalCount  = transfers.filter((t) => t.urgencyLevel === 'critical').length;
  const deliveredCount = transfers.filter((t) => t.status === 'delivered').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4 md:p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
            🗺️ Live Organ Tracking
          </h1>
          <p className="text-white/50 text-sm mt-1">Real-time organ transport monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          {lastTick && (
            <span className="text-white/40 text-xs">Last update: {lastTick}</span>
          )}
          <button
            onClick={() => setSimulation((s) => !s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
              ${simulationOn
                ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                : 'bg-white/10 text-white/50 border border-white/10 hover:bg-white/20'}`}
          >
            {simulationOn ? '🟢 Simulation ON' : '⚪ Simulation OFF'}
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'In Transit', value: inTransitCount, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Critical',   value: criticalCount,  color: 'text-red-400',   bg: 'bg-red-500/10 border-red-500/20' },
          { label: 'Delivered',  value: deliveredCount, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-xl p-3 border text-center ${stat.bg}`}>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-white/50 text-xs mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
          ⚠️ Firestore error: {error}
        </div>
      )}

      {/* Map — always rendered once loading is false */}
      <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl" style={{ height: '420px' }}>
        {loading ? (
          <div className="h-full flex items-center justify-center bg-slate-800">
            <p className="text-white/50 animate-pulse">Loading map...</p>
          </div>
        ) : (
          <MapContainer
            center={[22.3, 72.8]}
            zoom={7}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            {transfers.map((t) => (
              <TransferOverlay key={t.id} transfer={t} />
            ))}
          </MapContainer>
        )}
      </div>

      {/* Map Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-white/60">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block"/> Donor Location</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"/> Recipient Location</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block"/> Transport Vehicle</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-red-500 inline-block"/> Critical Route</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-blue-500 inline-block"/> Normal Route</span>
      </div>

      {/* Transfer Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Active Transfers</h2>

        {loading && (
          <div className="text-white/40 text-sm animate-pulse">Fetching transfers...</div>
        )}

        {!loading && transfers.length === 0 && !error && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-white/40">
            <p className="text-4xl mb-2">📭</p>
            <p>No active transfers found.</p>
            <p className="text-xs mt-1">Add documents to the <code>organTransfers</code> Firestore collection to see them here.</p>
          </div>
        )}

        {transfers.map((t) => (
          <div
            key={t.id}
            className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/8 transition-all"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white font-semibold">{t.organType || 'Unknown Organ'}</span>
                <span className="text-white/40 text-sm">·</span>
                <span className="text-white/70 text-sm">{t.donorName} → {t.recipientName}</span>
              </div>
              <div className="flex items-center gap-2">
                <UrgencyBadge level={t.urgencyLevel} />
                <StatusBadge status={t.status} />
              </div>
            </div>

            {t.estimatedArrival && (
              <p className="text-white/40 text-xs mb-1">
                ETA: {
                  t.estimatedArrival?.toDate
                    ? t.estimatedArrival.toDate().toLocaleString()
                    : new Date(t.estimatedArrival).toLocaleString()
                }
              </p>
            )}

            <TransferTimeline status={t.status} />
          </div>
        ))}
      </div>
    </div>
  );
}