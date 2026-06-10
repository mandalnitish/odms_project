import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

// Custom colored icons
const createIcon = (color) => L.divIcon({
  html: `<div style="background:${color};width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 6px rgba(0,0,0,0.4)"></div>`,
  className: '',
  iconAnchor: [8, 8],
});

const donorIcon = createIcon('#22c55e');      // green
const recipientIcon = createIcon('#ef4444');  // red
const vehicleIcon = createIcon('#f59e0b');    // amber

export default function OrganTrackingMap() {
  const [transfers, setTransfers] = useState([]);

  useEffect(() => {
    // Real-time listener on Firestore
    const unsub = onSnapshot(collection(db, 'organTransfers'), (snapshot) => {
      setTransfers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  return (
    <div className="rounded-xl overflow-hidden shadow-lg border border-white/20" style={{ height: '500px' }}>
      <MapContainer center={[22.3, 72.8]} zoom={7} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='© OpenStreetMap contributors'
        />
        {transfers.map(transfer => (
          <TransferOverlay key={transfer.id} transfer={transfer} />
        ))}
      </MapContainer>
    </div>
  );
}

function TransferOverlay({ transfer }) {
  const { donorLocation, recipientLocation, vehicleLocation, organType, status, donorName, recipientName, urgencyLevel } = transfer;

  const routeCoords = [
    [donorLocation.lat, donorLocation.lng],
    vehicleLocation ? [vehicleLocation.lat, vehicleLocation.lng] : null,
    [recipientLocation.lat, recipientLocation.lng],
  ].filter(Boolean);

  return (
    <>
      {/* Donor Marker */}
      <Marker position={[donorLocation.lat, donorLocation.lng]} icon={donorIcon}>
        <Popup><b>🟢 Donor:</b> {donorName}<br/>Organ: {organType}</Popup>
      </Marker>

      {/* Recipient Marker */}
      <Marker position={[recipientLocation.lat, recipientLocation.lng]} icon={recipientIcon}>
        <Popup><b>🔴 Recipient:</b> {recipientName}<br/>Urgency: {urgencyLevel}</Popup>
      </Marker>

      {/* Vehicle Marker (only when in transit) */}
      {vehicleLocation && status === 'in_transit' && (
        <Marker position={[vehicleLocation.lat, vehicleLocation.lng]} icon={vehicleIcon}>
          <Popup>🚑 Transport Vehicle<br/>Status: In Transit</Popup>
        </Marker>
      )}

      {/* Route Line */}
      <Polyline
        positions={routeCoords}
        pathOptions={{ color: urgencyLevel === 'critical' ? '#ef4444' : '#3b82f6', dashArray: '8,6', weight: 3 }}
      />
    </>
  );
}