import { db } from '../../firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

export async function tickVehicleMovement() {
  const snapshot = await getDocs(collection(db, 'organTransfers'));

  snapshot.forEach(async (docSnap) => {
    const data = docSnap.data();
    if (data.status !== 'in_transit' || !data.vehicleLocation) return;

    const { vehicleLocation, recipientLocation } = data;

    // Move 10% closer to destination each tick
    const newLat = vehicleLocation.lat + (recipientLocation.lat - vehicleLocation.lat) * 0.1;
    const newLng = vehicleLocation.lng + (recipientLocation.lng - vehicleLocation.lng) * 0.1;

    // If very close to destination, mark as arrived
    const dist = Math.abs(newLat - recipientLocation.lat) + Math.abs(newLng - recipientLocation.lng);
    const newStatus = dist < 0.01 ? 'arrived' : 'in_transit';

    await updateDoc(doc(db, 'organTransfers', docSnap.id), {
      vehicleLocation: { lat: newLat, lng: newLng },
      status: newStatus,
    });
  });
}