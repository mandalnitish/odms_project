// src/pages/TrackingPage.jsx

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  EyeOff,
  History,
  MapPin,
  Truck,
} from "lucide-react";

import { db } from "../firebase";
import OrganTrackingMap from "../components/OrganTrackingMap";

// ======================================================
// SIMULATION SETTINGS
// ======================================================

const SIMULATION_INTERVAL = 5000;
const ROUTE_POINTS_PER_TICK = 3;
const DELIVERY_DELAY = 15000;

// ======================================================
// HELPERS
// ======================================================

function getCoords(location) {
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
}

function normalizeStatus(status) {
  return String(status || "")
    .trim()
    .toLowerCase();
}

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

// ======================================================
// TRANSFER TIMELINE
// ======================================================

function TransferTimeline({
  status,
}) {
  const normalizedStatus =
    normalizeStatus(status);

  const currentIndex =
    STEPS.indexOf(
      normalizedStatus
    );

  return (
    <div className="flex items-center gap-2 my-4 overflow-x-auto pb-2">

      {STEPS.map(
        (step, index) => (
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
                  transition-all
                  duration-300
                  ${
                    index <=
                    currentIndex
                      ? "bg-green-500 text-white"
                      : "bg-gray-700 text-gray-400"
                  }
                `}
              >
                {index + 1}
              </div>

              <span className="text-xs mt-1 text-center w-24">
                {
                  stepLabels[
                    step
                  ]
                }
              </span>

            </div>

            {index <
              STEPS.length -
                1 && (
              <div
                className={`
                  h-1
                  w-12
                  rounded
                  transition-all
                  duration-300
                  ${
                    index <
                    currentIndex
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
// MAIN PAGE
// ======================================================

export default function TrackingPage({
  userRole,
  recipientId,
  approvedMatch,
  approvedMatches = [],
  allowedTransfers = [],
}) {
  // ====================================================
  // STATE
  // ====================================================

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

  const [
    selectedHistoryTransferId,
    setSelectedHistoryTransferId,
  ] = useState(null);

  // ====================================================
  // REFS
  // ====================================================

  const simulationRunningRef =
    useRef(false);

  const transfersRef =
    useRef([]);

  const roadRoutesRef =
    useRef({});

  const routeProgressRef =
    useRef({});

  const mapSectionRef =
    useRef(null);

  // ====================================================
  // ROLE
  // ====================================================

  const normalizedRole =
    String(
      userRole || ""
    )
      .trim()
      .toLowerCase();

  const isRecipient =
    normalizedRole ===
    "recipient";

  const canViewAll =
    normalizedRole ===
      "admin" ||
    normalizedRole ===
      "doctor";

  // ====================================================
  // HISTORY STORAGE KEY
  //
  // Each role/user gets separate localStorage.
  // Prevents old recipient history selection leaking
  // into another user's session.
  // ====================================================

  const historyStorageKey =
    isRecipient &&
    recipientId
      ? `selectedHistoryTransferId:${recipientId}`
      : canViewAll
      ? `selectedHistoryTransferId:${normalizedRole}`
      : null;

  // ====================================================
  // RESTORE HISTORY SELECTION
  // ====================================================

  useEffect(() => {
    if (
      !historyStorageKey
    ) {
      setSelectedHistoryTransferId(
        null
      );

      return;
    }

    try {
      const storedId =
        window.localStorage.getItem(
          historyStorageKey
        );

      setSelectedHistoryTransferId(
        storedId
      );
    } catch (error) {
      console.error(
        "Failed to restore selected history transfer:",
        error
      );

      setSelectedHistoryTransferId(
        null
      );
    }
  }, [
    historyStorageKey,
  ]);

  // ====================================================
  // SAVE HISTORY SELECTION
  // ====================================================

  useEffect(() => {
    if (
      !historyStorageKey
    ) {
      return;
    }

    try {
      if (
        selectedHistoryTransferId
      ) {
        window.localStorage.setItem(
          historyStorageKey,
          selectedHistoryTransferId
        );
      } else {
        window.localStorage.removeItem(
          historyStorageKey
        );
      }
    } catch (error) {
      console.error(
        "Failed to save selected history transfer:",
        error
      );
    }
  }, [
    historyStorageKey,
    selectedHistoryTransferId,
  ]);

  // ====================================================
  // RECEIVE GOOGLE ROAD PATHS
  // ====================================================

  const handleRoutesReady =
    useCallback(
      (routes) => {
        if (!routes) {
          return;
        }

        roadRoutesRef.current =
          {
            ...roadRoutesRef.current,
            ...routes,
          };

        console.log(
          "✅ Google road routes ready:",
          Object.keys(
            routes
          )
        );
      },
      []
    );

  // ====================================================
  // ROLE-BASED TRANSFER LOADING
  //
  // RECIPIENT:
  // Only allowedTransfers from RecipientDashboard.
  //
  // DOCTOR / ADMIN:
  // All organTransfers from Firestore.
  //
  // UNKNOWN ROLE:
  // No data.
  // ====================================================

  useEffect(() => {
    // ================================================
    // RECIPIENT
    // ================================================

    if (
      isRecipient
    ) {
      const safeTransfers =
        Array.isArray(
          allowedTransfers
        )
          ? allowedTransfers
          : [];

      transfersRef.current =
        safeTransfers;

      setTransfers(
        safeTransfers
      );

      setLastUpdate(
        new Date()
      );

      // Clear selected history
      // if it does not belong
      // to this recipient.

      setSelectedHistoryTransferId(
        (
          currentId
        ) => {
          if (
            !currentId
          ) {
            return null;
          }

          const exists =
            safeTransfers.some(
              (
                transfer
              ) =>
                transfer.id ===
                currentId
            );

          return exists
            ? currentId
            : null;
        }
      );

      return;
    }

    // ================================================
    // DOCTOR / ADMIN
    // ================================================

    if (
      canViewAll
    ) {
      const unsubscribe =
        onSnapshot(
          collection(
            db,
            "organTransfers"
          ),

          (
            snapshot
          ) => {
            const data =
              snapshot.docs.map(
                (
                  document
                ) => ({
                  id:
                    document.id,

                  ...document.data(),
                })
              );

            transfersRef.current =
              data;

            setTransfers(
              data
            );

            setLastUpdate(
              new Date()
            );
          },

          (
            error
          ) => {
            console.error(
              "Failed to load all organ transfers:",
              error
            );

            transfersRef.current =
              [];

            setTransfers(
              []
            );
          }
        );

      return () => {
        unsubscribe();
      };
    }

    // ================================================
    // UNKNOWN ROLE
    // ================================================

    transfersRef.current =
      [];

    setTransfers(
      []
    );

    setSelectedHistoryTransferId(
      null
    );
  }, [
    isRecipient,
    canViewAll,
    allowedTransfers,
  ]);

  // ====================================================
  // AUTOMATIC ROAD SIMULATION
  // ====================================================

  useEffect(() => {
    if (
      !simulationEnabled
    ) {
      return;
    }

    async function runSimulation() {
      if (
        simulationRunningRef.current
      ) {
        return;
      }

      simulationRunningRef.current =
        true;

      try {
        const currentTransfers =
          transfersRef.current;

        for (
          const transfer
          of currentTransfers
        ) {
          const status =
            normalizeStatus(
              transfer.status
            );

          const donor =
            getCoords(
              transfer.donorLocation
            );

          const recipient =
            getCoords(
              transfer.recipientLocation
            );

          if (
            !donor ||
            !recipient
          ) {
            continue;
          }

          const transferRef =
            doc(
              db,
              "organTransfers",
              transfer.id
            );

          // ========================================
          // HARVESTED -> IN TRANSIT
          // ========================================

          if (
            status ===
            "harvested"
          ) {
            const roadPath =
              roadRoutesRef.current[
                transfer.id
              ];

            if (
              !roadPath ||
              roadPath.length <
                2
            ) {
              console.log(
                "⏳ Waiting for Google road route:",
                transfer.id
              );

              continue;
            }

            routeProgressRef.current[
              transfer.id
            ] = 0;

            await updateDoc(
              transferRef,
              {
                status:
                  "in_transit",

                vehicleLocation:
                  roadPath[
                    0
                  ],

                routeProgress:
                  0,

                transportStartedAt:
                  serverTimestamp(),

                lastLocationUpdate:
                  serverTimestamp(),
              }
            );

            console.log(
              "🚑 Transport started:",
              transfer.id
            );

            continue;
          }

          // ========================================
          // IN TRANSIT
          // ========================================

          if (
            status ===
            "in_transit"
          ) {
            const roadPath =
              roadRoutesRef.current[
                transfer.id
              ];

            if (
              !roadPath ||
              roadPath.length <
                2
            ) {
              continue;
            }

            const vehicle =
              getCoords(
                transfer.vehicleLocation
              ) ||
              donor;

            let currentIndex =
              routeProgressRef.current[
                transfer.id
              ];

            // ======================================
            // RESTORE ROUTE PROGRESS
            // ======================================

            if (
              currentIndex ==
              null
            ) {
              if (
                Number.isInteger(
                  transfer.routeProgress
                )
              ) {
                currentIndex =
                  Math.min(
                    Math.max(
                      transfer.routeProgress,
                      0
                    ),

                    roadPath.length -
                      1
                  );
              } else {
                let closestIndex =
                  0;

                let closestDistance =
                  Infinity;

                roadPath.forEach(
                  (
                    point,
                    index
                  ) => {
                    const latDiff =
                      point.lat -
                      vehicle.lat;

                    const lngDiff =
                      point.lng -
                      vehicle.lng;

                    const distance =
                      latDiff *
                        latDiff +
                      lngDiff *
                        lngDiff;

                    if (
                      distance <
                      closestDistance
                    ) {
                      closestDistance =
                        distance;

                      closestIndex =
                        index;
                    }
                  }
                );

                currentIndex =
                  closestIndex;
              }

              routeProgressRef.current[
                transfer.id
              ] =
                currentIndex;
            }

            // ======================================
            // NEXT ROAD POINT
            // ======================================

            const nextIndex =
              Math.min(
                currentIndex +
                  ROUTE_POINTS_PER_TICK,

                roadPath.length -
                  1
              );

            const nextPoint =
              roadPath[
                nextIndex
              ];

            // ======================================
            // ARRIVED
            // ======================================

            if (
              nextIndex >=
              roadPath.length -
                1
            ) {
              await updateDoc(
                transferRef,
                {
                  status:
                    "arrived",

                  vehicleLocation:
                    recipient,

                  routeProgress:
                    roadPath.length -
                    1,

                  arrivedAt:
                    serverTimestamp(),

                  lastLocationUpdate:
                    serverTimestamp(),
                }
              );

              delete routeProgressRef
                .current[
                transfer.id
              ];

              console.log(
                "🏥 Arrived:",
                transfer.id
              );

              continue;
            }

            // ======================================
            // MOVE VEHICLE
            // ======================================

            routeProgressRef.current[
              transfer.id
            ] =
              nextIndex;

            await updateDoc(
              transferRef,
              {
                vehicleLocation:
                  {
                    lat:
                      nextPoint.lat,

                    lng:
                      nextPoint.lng,
                  },

                routeProgress:
                  nextIndex,

                lastLocationUpdate:
                  serverTimestamp(),
              }
            );

            continue;
          }

          // ========================================
          // ARRIVED -> DELIVERED
          // ========================================

          if (
            status ===
            "arrived"
          ) {
            let arrivedTime =
              null;

            if (
              transfer.arrivedAt
                ?.toMillis
            ) {
              arrivedTime =
                transfer.arrivedAt.toMillis();
            } else if (
              transfer.arrivedAt
                ?.seconds
            ) {
              arrivedTime =
                transfer.arrivedAt
                  .seconds *
                1000;
            }

            if (
              !arrivedTime
            ) {
              await updateDoc(
                transferRef,
                {
                  arrivedAt:
                    serverTimestamp(),
                }
              );

              continue;
            }

            const elapsed =
              Date.now() -
              arrivedTime;

            if (
              elapsed >=
              DELIVERY_DELAY
            ) {
              await updateDoc(
                transferRef,
                {
                  status:
                    "delivered",

                  vehicleLocation:
                    recipient,

                  deliveredAt:
                    serverTimestamp(),

                  lastLocationUpdate:
                    serverTimestamp(),
                }
              );

              delete routeProgressRef
                .current[
                transfer.id
              ];

              console.log(
                "✅ Delivered:",
                transfer.id
              );
            }
          }
        }
      } catch (
        error
      ) {
        console.error(
          "Simulation error:",
          error
        );
      } finally {
        simulationRunningRef.current =
          false;
      }
    }

    runSimulation();

    const interval =
      setInterval(
        runSimulation,
        SIMULATION_INTERVAL
      );

    return () => {
      clearInterval(
        interval
      );
    };
  }, [
    simulationEnabled,
  ]);

  // ====================================================
  // ACTIVE TRANSFERS
  // ====================================================

  const activeTransfers =
    transfers.filter(
      (
        transfer
      ) => {
        const status =
          normalizeStatus(
            transfer.status
          );

        return (
          status ===
            "harvested" ||
          status ===
            "in_transit" ||
          status ===
            "arrived"
        );
      }
    );

  // ====================================================
  // COMPLETED TRANSFERS
  // ====================================================

  const completedTransfers =
    transfers.filter(
      (
        transfer
      ) =>
        normalizeStatus(
          transfer.status
        ) ===
        "delivered"
    );

  // ====================================================
  // SELECTED HISTORY
  // ====================================================

  const selectedHistoryTransfer =
    completedTransfers.find(
      (
        transfer
      ) =>
        transfer.id ===
        selectedHistoryTransferId
    );

  // ====================================================
  // MAP TRANSFERS
  // ====================================================

  const mapTransfers =
    selectedHistoryTransfer
      ? [
          ...activeTransfers,
          selectedHistoryTransfer,
        ]
      : activeTransfers;

  // ====================================================
  // STATISTICS
  // ====================================================

  const inTransit =
    transfers.filter(
      (
        transfer
      ) =>
        normalizeStatus(
          transfer.status
        ) ===
        "in_transit"
    ).length;

  const critical =
    transfers.filter(
      (
        transfer
      ) =>
        normalizeStatus(
          transfer.urgencyLevel
        ) ===
          "critical" &&
        normalizeStatus(
          transfer.status
        ) !==
          "delivered"
    ).length;

  const delivered =
    completedTransfers.length;

  // ====================================================
  // HISTORY MAP TOGGLE
  // ====================================================

  function handleHistoryMapToggle(
    transferId
  ) {
    if (
      selectedHistoryTransferId ===
      transferId
    ) {
      setSelectedHistoryTransferId(
        null
      );

      return;
    }

    setSelectedHistoryTransferId(
      transferId
    );

    setTimeout(
      () => {
        mapSectionRef.current
          ?.scrollIntoView(
            {
              behavior:
                "smooth",

              block:
                "center",
            }
          );
      },
      100
    );
  }

  // ====================================================
  // UI
  // ====================================================

  return (
    <div
      className="
        min-h-screen
        bg-slate-50
        dark:bg-slate-950
        text-slate-900
        dark:text-slate-100
        p-4
        sm:p-6
      "
    >

      <div className="max-w-[1600px] mx-auto">

        {/* =========================================== */}
        {/* HEADER */}
        {/* =========================================== */}

        <div
          className="
            flex
            flex-col
            md:flex-row
            justify-between
            md:items-center
            gap-3
            mb-4
            bg-white
            dark:bg-slate-900
            rounded-2xl
            px-5
            py-4
            border
            border-slate-200
            dark:border-slate-800
            shadow-sm
          "
        >

          <div>

            <h1 className="text-xl font-bold flex items-center gap-2">
              🗺️ Live Organ Tracking
            </h1>

            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">

              {isRecipient
                ? "Track your approved organ transfer"
                : canViewAll
                ? "Real-time monitoring of all organ transfers"
                : "Organ transfer tracking"}

            </p>

          </div>

          <div className="flex items-center gap-3">

            <span className="text-xs text-slate-500 dark:text-slate-400">

              Last update:{" "}

              {lastUpdate.toLocaleTimeString()}

            </span>

            <button
              type="button"
              onClick={() =>
                setSimulationEnabled(
                  (
                    previous
                  ) =>
                    !previous
                )
              }
              className={`
                px-3
                py-1.5
                rounded-lg
                font-semibold
                text-xs
                transition-all
                ${
                  simulationEnabled
                    ? "bg-transparent text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/10"
                    : "bg-transparent text-slate-500 dark:text-slate-400 border border-slate-400/40 hover:bg-slate-500/10"
                }
              `}
            >

              {simulationEnabled
                ? "🟢 Simulation ON"
                : "⚪ Simulation OFF"}

            </button>

          </div>

        </div>

        {/* =========================================== */}
        {/* STATISTICS */}
        {/* =========================================== */}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">

          <div
            className="
              bg-white
              dark:bg-slate-900
              border
              border-slate-200
              dark:border-slate-800
              rounded-xl
              px-4
              py-3
              shadow-sm
              flex
              items-center
              gap-3
            "
          >

            <Truck
              className="text-yellow-500"
              size={20}
            />

            <div className="text-2xl font-bold text-yellow-400">
              {inTransit}
            </div>

            <div className="text-slate-500 dark:text-slate-400 text-xs">
              In Transit
            </div>

          </div>

          <div
            className="
              bg-white
              dark:bg-slate-900
              border
              border-slate-200
              dark:border-slate-800
              rounded-xl
              px-4
              py-3
              shadow-sm
              flex
              items-center
              gap-3
            "
          >

            <AlertTriangle
              className="text-red-500"
              size={20}
            />

            <div className="text-2xl font-bold text-red-400">
              {critical}
            </div>

            <div className="text-slate-500 dark:text-slate-400 text-xs">
              Critical
            </div>

          </div>

          <div
            className="
              bg-white
              dark:bg-slate-900
              border
              border-slate-200
              dark:border-slate-800
              rounded-xl
              px-4
              py-3
              shadow-sm
              flex
              items-center
              gap-3
            "
          >

            <CheckCircle
              className="text-emerald-500"
              size={20}
            />

            <div className="text-2xl font-bold text-green-400">
              {delivered}
            </div>

            <div className="text-slate-500 dark:text-slate-400 text-xs">
              Delivered
            </div>

          </div>

        </div>

        {/* =========================================== */}
        {/* MAP */}
        {/* =========================================== */}

        <div
          ref={
            mapSectionRef
          }
        >

          {selectedHistoryTransfer && (
            <div
              className="
                mb-3
                flex
                flex-col
                sm:flex-row
                sm:items-center
                justify-between
                gap-3
                bg-emerald-50
                dark:bg-emerald-950/20
                border
                border-emerald-200
                dark:border-emerald-800
                rounded-xl
                px-4
                py-3
              "
            >

              <div className="flex items-center gap-3">

                <History
                  size={20}
                  className="text-emerald-500"
                />

                <div>

                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    Viewing Historical Transfer
                  </p>

                  <p className="text-xs text-slate-500 dark:text-slate-400">

                    {selectedHistoryTransfer.donorName ||
                      "Unknown Donor"}

                    {" → "}

                    {selectedHistoryTransfer.recipientName ||
                      "Unknown Recipient"}

                    {" • "}

                    {selectedHistoryTransfer.organType ||
                      "Organ"}

                  </p>

                </div>

              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedHistoryTransferId(
                    null
                  )
                }
                className="
                  flex
                  items-center
                  justify-center
                  gap-2
                  px-3
                  py-2
                  rounded-lg
                  bg-red-500/10
                  border
                  border-red-500/30
                  text-red-400
                  hover:bg-red-500/20
                  transition
                  text-xs
                  font-semibold
                "
              >

                <EyeOff
                  size={15}
                />

                Hide Historical Route

              </button>

            </div>
          )}

          <OrganTrackingMap
            transfers={
              mapTransfers
            }
            onRoutesReady={
              handleRoutesReady
            }
          />

        </div>

        {/* =========================================== */}
        {/* LEGEND */}
        {/* =========================================== */}

        <div className="flex flex-wrap gap-6 mt-4 text-sm text-slate-500 dark:text-slate-400">

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

        {/* =========================================== */}
        {/* ACTIVE TRANSFERS */}
        {/* =========================================== */}

        <div className="mt-8">

          <div className="flex items-center justify-between gap-4 mb-4">

            <h2 className="text-xl font-bold flex items-center gap-2">

              <Activity />

              Active Transfers

            </h2>

            <span
              className="
                px-3
                py-1
                rounded-full
                bg-emerald-50
                dark:bg-emerald-950/20
                border
                border-emerald-200
                dark:border-emerald-800
                text-emerald-600
                dark:text-emerald-400
                text-xs
                font-semibold
              "
            >
              {activeTransfers.length} Active
            </span>

          </div>

          {activeTransfers.length ===
            0 && (
            <div
              className="
                bg-white
                dark:bg-slate-900
                border
                border-slate-200
                dark:border-slate-800
                rounded-xl
                p-8
                text-center
                text-slate-500
                dark:text-slate-400
              "
            >

              <CheckCircle
                size={32}
                className="mx-auto mb-3 text-green-400"
              />

              No active organ transfers found.

            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

            {activeTransfers.map(
              (
                transfer
              ) => {
                const status =
                  normalizeStatus(
                    transfer.status
                  );

                return (
                  <div
                    key={
                      transfer.id
                    }
                    className="
                      bg-white
                      dark:bg-slate-900
                      border
                      border-slate-200
                      dark:border-slate-800
                      shadow-sm
                      rounded-xl
                      p-5
                    "
                  >

                    <div className="flex justify-between items-start gap-4">

                      <div>

                        <h3 className="text-xl font-bold capitalize">

                          🫀{" "}

                          {transfer.organType ||
                            "Organ Transfer"}

                        </h3>

                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">

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
                            normalizeStatus(
                              transfer.urgencyLevel
                            ) ===
                            "critical"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-blue-500/20 text-blue-400"
                          }
                        `}
                      >

                        {transfer.urgencyLevel ||
                          "normal"}

                      </span>

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">

                      <div className="bg-slate-50 dark:bg-slate-950/60 rounded-lg p-3 border border-slate-100 dark:border-slate-800">

                        <div className="flex items-center gap-2 text-green-400 font-semibold">

                          <MapPin
                            size={17}
                          />

                          Donor

                        </div>

                        <p className="mt-1">

                          {transfer.donorName ||
                            "Unknown"}

                        </p>

                      </div>

                      <div className="bg-slate-50 dark:bg-slate-950/60 rounded-lg p-3 border border-slate-100 dark:border-slate-800">

                        <div className="flex items-center gap-2 text-red-400 font-semibold">

                          <MapPin
                            size={17}
                          />

                          Recipient

                        </div>

                        <p className="mt-1">

                          {transfer.recipientName ||
                            "Unknown"}

                        </p>

                      </div>

                    </div>

                    <TransferTimeline
                      status={
                        status
                      }
                    />

                    <div
                      className="
                        flex
                        items-center
                        gap-2
                        text-sm
                        text-gray-400
                        mt-3
                        pt-3
                        border-t
                        border-slate-200
                        dark:border-slate-800
                      "
                    >

                      <Clock
                        size={16}
                      />

                      Current Status:

                      <span className="text-slate-900 dark:text-white font-semibold">

                        {stepLabels[
                          status
                        ] ||
                          transfer.status ||
                          "Unknown"}

                      </span>

                    </div>

                  </div>
                );
              }
            )}

          </div>

        </div>

        {/* =========================================== */}
        {/* ACTIVITY HISTORY */}
        {/* =========================================== */}

        <div className="mt-10">

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">

            <h2 className="text-xl font-bold flex items-center gap-2">

              <History />

              Activity History

            </h2>

            <span
              className="
                px-3
                py-1
                rounded-full
                bg-green-500/10
                border
                border-green-500/20
                text-green-400
                text-xs
                font-semibold
              "
            >

              {completedTransfers.length} Completed

            </span>

          </div>

          {completedTransfers.length ===
          0 ? (
            <div
              className="
                bg-white
                dark:bg-slate-900
                border
                border-slate-200
                dark:border-slate-800
                rounded-xl
                p-8
                text-center
                text-slate-500
                dark:text-slate-400
              "
            >

              <History
                size={32}
                className="mx-auto mb-3"
              />

              No completed transfer history yet.

            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

              {completedTransfers.map(
                (
                  transfer
                ) => {
                  const isSelected =
                    selectedHistoryTransferId ===
                    transfer.id;

                  return (
                    <div
                      key={
                        transfer.id
                      }
                      className={`
                        bg-white
                        dark:bg-slate-900
                        border
                        shadow-sm
                        rounded-xl
                        p-5
                        transition-all
                        duration-200
                        ${
                          isSelected
                            ? "border-emerald-500 ring-1 ring-emerald-500/30 shadow-md shadow-emerald-500/10"
                            : "border-slate-200 dark:border-slate-800 hover:border-gray-600"
                        }
                      `}
                    >

                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">

                        <div>

                          <div className="flex flex-wrap items-center gap-2">

                            <h3 className="text-xl font-bold capitalize">

                              🫀{" "}

                              {transfer.organType ||
                                "Organ Transfer"}

                            </h3>

                            <span
                              className="
                                px-2.5
                                py-1
                                rounded-full
                                text-xs
                                font-semibold
                                bg-green-500/20
                                text-green-400
                              "
                            >

                              ✓ Delivered

                            </span>

                          </div>

                          <p className="text-xs text-gray-500 mt-2">

                            Transfer ID:{" "}

                            {
                              transfer.id
                            }

                          </p>

                        </div>

                        {isSelected && (
                          <span
                            className="
                              px-2
                              py-1
                              rounded
                              bg-emerald-500/10
                              text-emerald-600
                              dark:text-emerald-400
                              text-xs
                              font-semibold
                            "
                          >

                            📍 On Map

                          </span>
                        )}

                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">

                        <div className="bg-slate-50 dark:bg-slate-950/60 rounded-lg p-3 border border-slate-100 dark:border-slate-800">

                          <div className="flex items-center gap-2 text-green-400 text-sm font-semibold">

                            <MapPin
                              size={16}
                            />

                            Donor

                          </div>

                          <p className="mt-1 text-sm">

                            {transfer.donorName ||
                              "Unknown"}

                          </p>

                        </div>

                        <div className="bg-slate-50 dark:bg-slate-950/60 rounded-lg p-3 border border-slate-100 dark:border-slate-800">

                          <div className="flex items-center gap-2 text-red-400 text-sm font-semibold">

                            <MapPin
                              size={16}
                            />

                            Recipient

                          </div>

                          <p className="mt-1 text-sm">

                            {transfer.recipientName ||
                              "Unknown"}

                          </p>

                        </div>

                      </div>

                      <div
                        className="
                          flex
                          flex-col
                          sm:flex-row
                          sm:items-center
                          sm:justify-between
                          gap-3
                          mt-4
                          pt-4
                          border-t
                          border-slate-200
                          dark:border-slate-800
                        "
                      >

                        <div className="flex items-center gap-2 text-sm text-green-400">

                          <CheckCircle
                            size={16}
                          />

                          Successfully Delivered

                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleHistoryMapToggle(
                              transfer.id
                            )
                          }
                          className={`
                            inline-flex
                            items-center
                            justify-center
                            gap-2
                            px-4
                            py-2
                            rounded-lg
                            text-sm
                            font-semibold
                            border
                            transition-all
                            duration-200
                            ${
                              isSelected
                                ? "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20"
                                : "bg-transparent text-emerald-600 dark:text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10"
                            }
                          `}
                        >

                          {isSelected ? (
                            <>

                              <EyeOff
                                size={16}
                              />

                              Hide from Map

                            </>
                          ) : (
                            <>

                              <Eye
                                size={16}
                              />

                              View on Map

                            </>
                          )}

                        </button>

                      </div>

                      {isSelected && (
                        <div
                          className="
                            mt-3
                            px-3
                            py-2
                            rounded-lg
                            bg-emerald-50
                            dark:bg-emerald-950/20
                            border
                            border-emerald-200
                            dark:border-emerald-800
                            text-emerald-600
                            dark:text-emerald-400
                            text-xs
                          "
                        >

                          📍 This completed transfer route is currently displayed on the map.

                        </div>
                      )}

                    </div>
                  );
                }
              )}

            </div>
          )}

        </div>

      </div>

    </div>
  );
}