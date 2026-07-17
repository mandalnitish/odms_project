// src/pages/TrackingPage.jsx

import React, {
  useEffect,
  useState,
} from "react";

import { db } from "../firebase";

import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";

import {
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle,
  Truck,
  Activity,
} from "lucide-react";

// ======================================================
// IMPORT GOOGLE MAP COMPONENT
// ======================================================

import OrganTrackingMap from "../components/OrganTrackingMap";

// ======================================================
// LOCATION HELPER
// Supports Firestore GeoPoint and { lat, lng }
// ======================================================

const getCoords = (location) => {
  if (!location) {
    return null;
  }

  const lat =
    location.latitude ??
    location.lat;

  const lng =
    location.longitude ??
    location.lng;

  if (
    lat == null ||
    lng == null
  ) {
    return null;
  }

  const latitude =
    Number(lat);

  const longitude =
    Number(lng);

  if (
    Number.isNaN(latitude) ||
    Number.isNaN(longitude)
  ) {
    return null;
  }

  return {
    lat: latitude,
    lng: longitude,
  };
};

// ======================================================
// TIMELINE
// ======================================================

const STEPS = [
  "harvested",
  "in_transit",
  "arrived",
  "delivered",
];

const stepLabels = {
  harvested:
    "🫀 Organ Harvested",

  in_transit:
    "🚑 In Transit",

  arrived:
    "🏥 Arrived at Hospital",

  delivered:
    "✅ Successfully Delivered",
};

function TransferTimeline({
  status,
}) {
  const currentIndex =
    STEPS.indexOf(status);

  return (
    <div className="flex items-center gap-2 my-4 overflow-x-auto pb-2">

      {STEPS.map(
        (
          step,
          index
        ) => (
          <div
            key={step}
            className="flex items-center gap-2"
          >

            <div className="flex flex-col items-center">

              <div
                className={`
                  w-8
                  h-8
                  rounded-full
                  flex
                  items-center
                  justify-center
                  text-sm
                  font-bold
                  ${
                    index <= currentIndex
                      ? "bg-green-500 text-white"
                      : "bg-gray-700 text-gray-400"
                  }
                `}
              >
                {index + 1}
              </div>

              <span className="text-xs mt-1 text-center w-24">
                {stepLabels[step]}
              </span>

            </div>

            {index <
              STEPS.length - 1 && (
              <div
                className={`
                  h-1
                  w-12
                  rounded
                  ${
                    index < currentIndex
                      ? "bg-green-500"
                      : "bg-gray-700"
                  }
                `}
              />
            )}

          </div>
        )
      )}

    </div>
  );
}

// ======================================================
// MAIN TRACKING PAGE
// ======================================================

export default function TrackingPage() {
  const [
    transfers,
    setTransfers,
  ] = useState([]);

  const [
    lastUpdate,
    setLastUpdate,
  ] = useState(
    new Date()
  );

  const [
    simulationEnabled,
    setSimulationEnabled,
  ] = useState(true);

  // ====================================================
  // FIRESTORE REAL-TIME LISTENER
  // ====================================================

  useEffect(() => {
    const unsubscribe =
      onSnapshot(
        collection(
          db,
          "organTransfers"
        ),

        (snapshot) => {
          const data =
            snapshot.docs.map(
              (document) => ({
                id:
                  document.id,

                ...document.data(),
              })
            );

          setTransfers(data);

          setLastUpdate(
            new Date()
          );
        },

        (error) => {
          console.error(
            "Failed to load organ transfers:",
            error
          );
        }
      );

    return () =>
      unsubscribe();
  }, []);

  // ====================================================
  // SIMULATED VEHICLE MOVEMENT
  // ====================================================

  useEffect(() => {
    if (
      !simulationEnabled
    ) {
      return;
    }

    const interval =
      setInterval(
        async () => {
          const activeTransfers =
            transfers.filter(
              (transfer) =>
                transfer.status ===
                "in_transit"
            );

          for (
            const transfer
            of activeTransfers
          ) {
            const vehicle =
              getCoords(
                transfer.vehicleLocation
              );

            const recipient =
              getCoords(
                transfer.recipientLocation
              );

            if (
              !vehicle ||
              !recipient
            ) {
              continue;
            }

            const distance =
              Math.sqrt(
                Math.pow(
                  recipient.lat -
                    vehicle.lat,
                  2
                ) +
                  Math.pow(
                    recipient.lng -
                      vehicle.lng,
                    2
                  )
              );

            // ========================================
            // ARRIVED
            // ========================================

            if (
              distance < 0.005
            ) {
              try {
                await updateDoc(
                  doc(
                    db,
                    "organTransfers",
                    transfer.id
                  ),
                  {
                    status:
                      "arrived",

                    vehicleLocation:
                      recipient,

                    arrivedAt:
                      new Date(),
                  }
                );
              } catch (error) {
                console.error(
                  "Failed to mark transfer as arrived:",
                  error
                );
              }

              continue;
            }

            // ========================================
            // MOVE VEHICLE 10% TOWARD RECIPIENT
            // ========================================

            const newLat =
              vehicle.lat +
              (
                recipient.lat -
                vehicle.lat
              ) *
                0.1;

            const newLng =
              vehicle.lng +
              (
                recipient.lng -
                vehicle.lng
              ) *
                0.1;

            try {
              await updateDoc(
                doc(
                  db,
                  "organTransfers",
                  transfer.id
                ),
                {
                  vehicleLocation: {
                    lat:
                      newLat,

                    lng:
                      newLng,
                  },

                  lastLocationUpdate:
                    new Date(),
                }
              );
            } catch (error) {
              console.error(
                "Simulation update failed:",
                error
              );
            }
          }
        },

        5000
      );

    return () =>
      clearInterval(
        interval
      );
  }, [
    transfers,
    simulationEnabled,
  ]);

  // ====================================================
  // STATISTICS
  // ====================================================

  const inTransit =
    transfers.filter(
      (transfer) =>
        transfer.status ===
        "in_transit"
    ).length;

  const critical =
    transfers.filter(
      (transfer) =>
        transfer.urgencyLevel ===
          "critical" &&
        transfer.status !==
          "delivered"
    ).length;

  const delivered =
    transfers.filter(
      (transfer) =>
        transfer.status ===
        "delivered"
    ).length;

  // ====================================================
  // PAGE UI
  // ====================================================

  return (
    <div
      className="
        min-h-screen
        bg-gradient-to-br
        from-gray-900
        via-blue-950
        to-gray-900
        text-white
        p-6
      "
    >

      {/* HEADER */}

      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">

        <div>

          <h1 className="text-3xl font-bold flex items-center gap-3">

            🗺️ Live Organ Tracking

          </h1>

          <p className="text-gray-400 mt-1">

            Real-time organ transport monitoring

          </p>

        </div>

        <div className="flex items-center gap-4">

          <span className="text-sm text-gray-400">

            Last update:{" "}

            {
              lastUpdate.toLocaleTimeString()
            }

          </span>

          <button
            onClick={() =>
              setSimulationEnabled(
                (previous) =>
                  !previous
              )
            }
            className={`
              px-4
              py-2
              rounded-lg
              font-semibold
              text-sm

              ${
                simulationEnabled
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-gray-700 text-gray-400"
              }
            `}
          >

            {simulationEnabled
              ? "🟢 Simulation ON"
              : "⚪ Simulation OFF"}

          </button>

        </div>

      </div>

      {/* STATISTICS */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-5 text-center">

          <Truck
            className="mx-auto mb-2 text-yellow-400"
            size={26}
          />

          <div className="text-3xl font-bold text-yellow-400">

            {inTransit}

          </div>

          <div className="text-gray-400 text-sm">

            In Transit

          </div>

        </div>

        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 text-center">

          <AlertTriangle
            className="mx-auto mb-2 text-red-400"
            size={26}
          />

          <div className="text-3xl font-bold text-red-400">

            {critical}

          </div>

          <div className="text-gray-400 text-sm">

            Critical

          </div>

        </div>

        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5 text-center">

          <CheckCircle
            className="mx-auto mb-2 text-green-400"
            size={26}
          />

          <div className="text-3xl font-bold text-green-400">

            {delivered}

          </div>

          <div className="text-gray-400 text-sm">

            Delivered

          </div>

        </div>

      </div>

      {/* ============================================ */}
      {/* GOOGLE MAP */}
      {/* ============================================ */}

      <OrganTrackingMap
        transfers={transfers}
      />

      {/* MAP LEGEND */}

      <div className="flex flex-wrap gap-6 mt-4 text-sm text-gray-400">

        <div className="flex items-center gap-2">

          <span className="w-3 h-3 rounded-full bg-green-500" />

          Donor Location

        </div>

        <div className="flex items-center gap-2">

          <span className="w-3 h-3 rounded-full bg-red-500" />

          Recipient Location

        </div>

        <div className="flex items-center gap-2">

          <span className="w-3 h-3 rounded-full bg-yellow-500" />

          Transport Vehicle

        </div>

        <div className="flex items-center gap-2">

          <span className="w-5 h-1 bg-red-500" />

          Critical Route

        </div>

        <div className="flex items-center gap-2">

          <span className="w-5 h-1 bg-blue-500" />

          Normal Route

        </div>

      </div>

      {/* ACTIVE TRANSFERS */}

      <div className="mt-8">

        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">

          <Activity />

          Active Transfers

        </h2>

        {transfers.length ===
          0 && (

          <div className="bg-gray-800/60 rounded-xl p-8 text-center text-gray-400">

            No active organ transfers found.

          </div>

        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

          {transfers.map(
            (transfer) => (

              <div
                key={
                  transfer.id
                }
                className="
                  bg-gray-800/80
                  border
                  border-gray-700
                  rounded-xl
                  p-5
                "
              >

                {/* CARD HEADER */}

                <div className="flex justify-between items-start gap-4">

                  <div>

                    <h3 className="text-xl font-bold">

                      🫀{" "}

                      {
                        transfer.organType ||
                        "Organ Transfer"
                      }

                    </h3>

                    <p className="text-sm text-gray-400 mt-1">

                      Transfer ID:{" "}

                      {
                        transfer.id
                      }

                    </p>

                  </div>

                  <span
                    className={`
                      px-3
                      py-1
                      rounded-full
                      text-xs
                      font-bold

                      ${
                        transfer.urgencyLevel ===
                        "critical"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-blue-500/20 text-blue-400"
                      }
                    `}
                  >

                    {
                      transfer.urgencyLevel ||
                      "normal"
                    }

                  </span>

                </div>

                {/* DONOR / RECIPIENT */}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">

                  <div className="bg-gray-900/50 rounded-lg p-3">

                    <div className="flex items-center gap-2 text-green-400 font-semibold">

                      <MapPin
                        size={17}
                      />

                      Donor

                    </div>

                    <p className="mt-1">

                      {
                        transfer.donorName ||
                        "Unknown"
                      }

                    </p>

                  </div>

                  <div className="bg-gray-900/50 rounded-lg p-3">

                    <div className="flex items-center gap-2 text-red-400 font-semibold">

                      <MapPin
                        size={17}
                      />

                      Recipient

                    </div>

                    <p className="mt-1">

                      {
                        transfer.recipientName ||
                        "Unknown"
                      }

                    </p>

                  </div>

                </div>

                {/* TIMELINE */}

                <TransferTimeline
                  status={
                    transfer.status
                  }
                />

                {/* STATUS */}

                <div className="flex items-center gap-2 text-sm text-gray-400 mt-3">

                  <Clock
                    size={16}
                  />

                  Current Status:

                  <span className="text-white font-semibold">

                    {
                      stepLabels[
                        transfer.status
                      ] ||
                      transfer.status ||
                      "Unknown"
                    }

                  </span>

                </div>

              </div>

            )
          )}

        </div>

      </div>

    </div>
  );
}