// src/components/OrganTrackingMap.jsx

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../firebase";

// ======================================================
// GOOGLE MAPS API KEY
// ======================================================

const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// ======================================================
// GOOGLE MAPS LOADER
// ======================================================

let googleMapsPromise = null;

function loadGoogleMaps() {
  // Google Maps is already loaded
  if (window.google?.maps?.importLibrary) {
    return Promise.resolve(window.google);
  }

  // Existing loader promise
  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    if (!GOOGLE_MAPS_API_KEY) {
      reject(
        new Error(
          "VITE_GOOGLE_MAPS_API_KEY is missing."
        )
      );

      return;
    }

    // Check whether another component already added
    // the Google Maps JavaScript API script.
    const existingScript =
      document.querySelector(
        'script[src*="maps.googleapis.com/maps/api/js"]'
      );

    if (existingScript) {
      let attempts = 0;

      const waitForGoogle =
        setInterval(() => {
          attempts += 1;

          if (window.google?.maps?.importLibrary) {
            clearInterval(waitForGoogle);
            resolve(window.google);
            return;
          }

          if (attempts > 100) {
            clearInterval(waitForGoogle);

            googleMapsPromise = null;

            reject(
              new Error(
                "Google Maps script exists but did not initialize."
              )
            );
          }
        }, 100);

      return;
    }

    const callback =
      "__organTrackingGoogleMapsReady";

    window[callback] = () => {
      delete window[callback];

      if (window.google?.maps) {
        resolve(window.google);
      } else {
        googleMapsPromise = null;

        reject(
          new Error(
            "Google Maps loaded but API is unavailable."
          )
        );
      }
    };

    const script =
      document.createElement("script");

    script.id =
      "organ-tracking-google-maps";

    script.async = true;
    script.defer = true;

    script.src =
      `https://maps.googleapis.com/maps/api/js` +
      `?key=${encodeURIComponent(
        GOOGLE_MAPS_API_KEY
      )}` +
      `&loading=async` +
      `&libraries=routes` +
      `&callback=${callback}`;

    script.onerror = () => {
      googleMapsPromise = null;

      reject(
        new Error(
          "Google Maps failed to load."
        )
      );
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

// ======================================================
// LOCATION HELPER
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
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  return {
    lat: latitude,
    lng: longitude,
  };
}

// ======================================================
// NORMALIZE ROAD PATH
// ======================================================

function normalizeRoadPath(path) {
  if (!Array.isArray(path)) {
    return null;
  }

  const normalized =
    path
      .map((point) => {
        if (!point) {
          return null;
        }

        const lat =
          typeof point.lat === "function"
            ? point.lat()
            : Number(
                point.lat ??
                point.latitude
              );

        const lng =
          typeof point.lng === "function"
            ? point.lng()
            : Number(
                point.lng ??
                point.longitude
              );

        if (
          !Number.isFinite(lat) ||
          !Number.isFinite(lng)
        ) {
          return null;
        }

        return {
          lat,
          lng,
        };
      })
      .filter(Boolean);

  if (normalized.length < 2) {
    return null;
  }

  return normalized;
}

// ======================================================
// STATUS HELPER
// ======================================================

function normalizeStatus(status) {
  return String(status || "")
    .trim()
    .toLowerCase();
}

// ======================================================
// ETA FORMAT
// ======================================================

function formatDuration(minutes) {
  if (minutes == null) {
    return "N/A";
  }

  const safeMinutes =
    Math.max(
      0,
      Math.round(
        Number(minutes)
      )
    );

  if (safeMinutes < 60) {
    return `${safeMinutes} min`;
  }

  const hours =
    Math.floor(
      safeMinutes / 60
    );

  const remainingMinutes =
    safeMinutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainingMinutes} min`;
}

// ======================================================
// MARKER ICON
// ======================================================

function createMarkerIcon(
  color,
  emoji = ""
) {
  const svg = `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="50"
      height="50"
      viewBox="0 0 50 50"
    >
      <circle
        cx="25"
        cy="25"
        r="20"
        fill="${color}"
        stroke="white"
        stroke-width="4"
      />

      ${
        emoji
          ? `
            <text
              x="25"
              y="32"
              text-anchor="middle"
              font-size="20"
            >
              ${emoji}
            </text>
          `
          : ""
      }
    </svg>
  `;

  return (
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(svg)
  );
}

// ======================================================
// LOCALSTORAGE ROUTE HELPERS
// ======================================================

function getSavedRoute(transferId) {
  try {
    const saved =
      window.localStorage.getItem(
        `organRoute_${transferId}`
      );

    if (!saved) {
      return null;
    }

    const parsed =
      JSON.parse(saved);

    return normalizeRoadPath(parsed);
  } catch (error) {
    console.error(
      "Failed to restore saved route:",
      error
    );

    return null;
  }
}

function saveRoute(
  transferId,
  roadPath
) {
  try {
    const normalized =
      normalizeRoadPath(roadPath);

    if (!normalized) {
      return;
    }

    window.localStorage.setItem(
      `organRoute_${transferId}`,
      JSON.stringify(normalized)
    );
  } catch (error) {
    console.error(
      "Failed to save route:",
      error
    );
  }
}

// ======================================================
// MAIN COMPONENT
// ======================================================

export default function OrganTrackingMap({
  transfers = [],
  onRoutesReady,
}) {
  const mapContainerRef =
    useRef(null);

  const mapRef =
    useRef(null);

  // ====================================================
  // LATEST TRANSFERS REF
  //
  // IMPORTANT:
  // Route rebuilding must NOT directly depend on the
  // transfers array.
  //
  // Firestore frequently changes:
  // - vehicleLocation
  // - routeProgress
  // - status
  // - timestamps
  //
  // Those changes should update the vehicle marker,
  // NOT rebuild the complete Google route.
  // ====================================================

  const transfersRef =
    useRef(transfers);

  // Donor and recipient markers
  const staticMarkersRef =
    useRef([]);

  // Road route polylines
  const routePolylinesRef =
    useRef([]);

  // Ambulance markers
  const vehicleMarkersRef =
    useRef({});

  // In-memory road route cache
  const routeCacheRef =
    useRef({});

  // Prevent repeated Firestore migration attempts
  const firestoreMigrationRef =
    useRef(new Set());

  // Prevent stale asynchronous route requests
  const routeGenerationRef =
    useRef(0);

  // Stable callback reference
  const onRoutesReadyRef =
    useRef(onRoutesReady);

  // Prevent duplicate onRoutesReady callback
  const lastRoutesReadyKeyRef =
    useRef("");

  const [
    mapReady,
    setMapReady,
  ] = useState(false);

  const [
    mapError,
    setMapError,
  ] = useState("");

  const [
    routeInfo,
    setRouteInfo,
  ] = useState([]);

  // ====================================================
  // KEEP LATEST TRANSFERS
  // ====================================================

  useEffect(() => {
    transfersRef.current =
      transfers;
  }, [transfers]);

  // ====================================================
  // KEEP CALLBACK CURRENT
  // ====================================================

  useEffect(() => {
    onRoutesReadyRef.current =
      onRoutesReady;
  }, [onRoutesReady]);

  // ====================================================
  // ROUTE ENDPOINT KEY
  //
  // Only route-relevant information is included.
  //
  // Vehicle movement does NOT change this key.
  // routeProgress does NOT change this key.
  // timestamps do NOT change this key.
  //
  // Therefore those Firestore updates do not cause
  // the complete road route to rebuild.
  // ====================================================

  const routeEndpointsKey =
    useMemo(() => {
      return transfers
        .map((transfer) => {
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
            return `${transfer.id}:invalid`;
          }

          const firestorePath =
            normalizeRoadPath(
              transfer.roadPath
            );

          return [
            transfer.id,

            donor.lat,
            donor.lng,

            recipient.lat,
            recipient.lng,

            transfer.urgencyLevel ||
              "normal",

            firestorePath
              ? firestorePath.length
              : 0,
          ].join(":");
        })
        .sort()
        .join("|");
    }, [transfers]);

  // ====================================================
  // VEHICLE LOCATION KEY
  //
  // Only used for moving ambulance markers.
  // Does NOT rebuild road routes.
  // ====================================================

  const vehicleLocationsKey =
    useMemo(() => {
      return transfers
        .map((transfer) => {
          const vehicle =
            getCoords(
              transfer.vehicleLocation
            );

          return [
            transfer.id,

            normalizeStatus(
              transfer.status
            ),

            vehicle?.lat ??
              "",

            vehicle?.lng ??
              "",
          ].join(":");
        })
        .sort()
        .join("|");
    }, [transfers]);

  // ====================================================
  // CLEAN STATIC MAP OBJECTS
  // ====================================================

  const clearStaticMapObjects =
    useCallback(() => {
      staticMarkersRef.current.forEach(
        (marker) => {
          marker?.setMap?.(
            null
          );
        }
      );

      staticMarkersRef.current =
        [];

      routePolylinesRef.current.forEach(
        (polyline) => {
          polyline?.setMap?.(
            null
          );
        }
      );

      routePolylinesRef.current =
        [];
    }, []);

  // ====================================================
  // INITIALIZE GOOGLE MAP
  // ====================================================

  useEffect(() => {
    let mounted = true;

    async function initializeMap() {
      try {
        setMapError("");

        const google =
          await loadGoogleMaps();

        if (
          !mounted ||
          !mapContainerRef.current
        ) {
          return;
        }

        await google.maps.importLibrary(
          "maps"
        );

        if (!mounted) {
          return;
        }

        // Do not initialize map twice
        if (mapRef.current) {
          setMapReady(
            true
          );

          return;
        }

        mapRef.current =
          new google.maps.Map(
            mapContainerRef.current,
            {
              center: {
                lat:
                  22.3,

                lng:
                  72.8,
              },

              zoom:
                7,

              mapTypeControl:
                false,

              streetViewControl:
                false,

              fullscreenControl:
                true,

              zoomControl:
                true,
            }
          );

        setMapReady(
          true
        );

        console.log(
          "✅ Organ tracking Google Map ready"
        );
      } catch (error) {
        console.error(
          "Google Maps initialization failed:",
          error
        );

        if (mounted) {
          setMapError(
            error?.message ||
              "Google Maps could not be loaded."
          );
        }
      }
    }

    initializeMap();

    return () => {
      mounted =
        false;
    };
  }, []);

  // ====================================================
  // BUILD / REBUILD GOOGLE ROAD ROUTES
  //
  // ROUTE PRIORITY:
  //
  // 1. Firestore roadPath
  // 2. Memory cache
  // 3. localStorage
  // 4. Google Routes API
  //
  // IMPORTANT FIX:
  //
  // This effect does NOT depend directly on `transfers`.
  //
  // It only depends on `routeEndpointsKey`.
  //
  // Therefore vehicle movement will NOT continuously
  // rebuild the complete road route.
  // ====================================================

  useEffect(() => {
    if (
      !mapReady ||
      !mapRef.current
    ) {
      return;
    }

    const generation =
      ++routeGenerationRef.current;

    let cancelled =
      false;

    async function calculateRoutes() {
      try {
        const google =
          await loadGoogleMaps();

        if (
          cancelled ||
          generation !==
            routeGenerationRef.current
        ) {
          return;
        }

        // =============================================
        // USE LATEST TRANSFERS
        // =============================================

        const currentTransfers =
          transfersRef.current;

        // =============================================
        // CLEAR OLD DONOR / RECIPIENT / ROUTES
        // =============================================

        clearStaticMapObjects();

        setRouteInfo([]);

        const routesForSimulation =
          {};

        const newRouteInfo =
          [];

        const bounds =
          new google.maps.LatLngBounds();

        let hasLocations =
          false;

        // =============================================
        // LOAD ROUTES LIBRARY
        // =============================================

        const routesLibrary =
          await google.maps.importLibrary(
            "routes"
          );

        if (
          cancelled ||
          generation !==
            routeGenerationRef.current
        ) {
          return;
        }

        const Route =
          routesLibrary.Route;

        if (!Route) {
          throw new Error(
            "Google Route API is unavailable."
          );
        }

        // =============================================
        // PROCESS EVERY TRANSFER CURRENTLY ON MAP
        // =============================================

        for (
          const transfer
          of currentTransfers
        ) {
          if (
            cancelled ||
            generation !==
              routeGenerationRef.current
          ) {
            return;
          }

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
            console.warn(
              "Skipping transfer with invalid locations:",
              transfer.id
            );

            continue;
          }

          hasLocations =
            true;

          bounds.extend(
            donor
          );

          bounds.extend(
            recipient
          );

          // ===========================================
          // DONOR MARKER
          // ===========================================

          const donorMarker =
            new google.maps.Marker({
              position:
                donor,

              map:
                mapRef.current,

              title:
                `Donor: ${
                  transfer.donorName ||
                  "Unknown"
                }`,

              icon: {
                url:
                  createMarkerIcon(
                    "#22c55e",
                    "🫀"
                  ),

                scaledSize:
                  new google.maps.Size(
                    44,
                    44
                  ),

                anchor:
                  new google.maps.Point(
                    22,
                    22
                  ),
              },
            });

          staticMarkersRef.current.push(
            donorMarker
          );

          // ===========================================
          // RECIPIENT MARKER
          // ===========================================

          const recipientMarker =
            new google.maps.Marker({
              position:
                recipient,

              map:
                mapRef.current,

              title:
                `Recipient: ${
                  transfer.recipientName ||
                  "Unknown"
                }`,

              icon: {
                url:
                  createMarkerIcon(
                    "#ef4444",
                    "🏥"
                  ),

                scaledSize:
                  new google.maps.Size(
                    44,
                    44
                  ),

                anchor:
                  new google.maps.Point(
                    22,
                    22
                  ),
              },
            });

          staticMarkersRef.current.push(
            recipientMarker
          );

          const isCritical =
            String(
              transfer.urgencyLevel ||
                ""
            ).toLowerCase() ===
            "critical";

          // ===========================================
          // ROUTE INFORMATION DEFAULTS
          // ===========================================

          let distanceKm =
            transfer.routeDistanceKm !=
            null
              ? Number(
                  transfer.routeDistanceKm
                )
              : null;

          let durationMinutes =
            transfer.routeDurationMinutes !=
            null
              ? Number(
                  transfer.routeDurationMinutes
                )
              : null;

          // ===========================================
          // 1. FIRESTORE PERMANENT ROAD PATH
          // ===========================================

          let roadPath =
            normalizeRoadPath(
              transfer.roadPath
            );

          if (roadPath) {
            routeCacheRef.current[
              transfer.id
            ] =
              roadPath;

            // Browser fallback
            saveRoute(
              transfer.id,
              roadPath
            );

            console.log(
              "🔥 Using Firestore saved road route:",
              transfer.id
            );
          }

          // ===========================================
          // 2. MEMORY CACHE
          // ===========================================

          if (!roadPath) {
            roadPath =
              normalizeRoadPath(
                routeCacheRef.current[
                  transfer.id
                ]
              );

            if (roadPath) {
              console.log(
                "⚡ Using memory cached road route:",
                transfer.id
              );
            }
          }

          // ===========================================
          // 3. LOCALSTORAGE FALLBACK
          // ===========================================

          if (!roadPath) {
            const localRoute =
              getSavedRoute(
                transfer.id
              );

            if (localRoute) {
              roadPath =
                localRoute;

              routeCacheRef.current[
                transfer.id
              ] =
                localRoute;

              console.log(
                "💾 Using localStorage road route:",
                transfer.id
              );

              // =======================================
              // MIGRATE LOCAL ROUTE TO FIRESTORE
              // =======================================

              if (
                !firestoreMigrationRef.current.has(
                  transfer.id
                )
              ) {
                firestoreMigrationRef.current.add(
                  transfer.id
                );

                try {
                  await updateDoc(
                    doc(
                      db,
                      "organTransfers",
                      transfer.id
                    ),
                    {
                      roadPath:
                        localRoute,

                      routeCalculatedAt:
                        serverTimestamp(),
                    }
                  );

                  console.log(
                    "🔥 localStorage route migrated to Firestore:",
                    transfer.id
                  );
                } catch (
                  migrationError
                ) {
                  console.warn(
                    "Could not migrate localStorage route to Firestore:",
                    migrationError
                  );
                }
              }
            }
          }

          // ===========================================
          // 4. GOOGLE ROUTES API
          //
          // Google is called ONLY when no saved route
          // exists in:
          //
          // - Firestore
          // - memory
          // - localStorage
          // ===========================================

          if (!roadPath) {
            try {
              console.log(
                "🌐 No saved route. Calling Google Routes API:",
                transfer.id
              );

              const result =
                await Route.computeRoutes({
                  origin:
                    donor,

                  destination:
                    recipient,

                  travelMode:
                    "DRIVING",

                  fields: [
                    "path",
                    "distanceMeters",
                    "durationMillis",
                  ],
                });

              if (
                cancelled ||
                generation !==
                  routeGenerationRef.current
              ) {
                return;
              }

              const route =
                result?.routes?.[
                  0
                ];

              if (route) {
                const computedPath =
                  normalizeRoadPath(
                    route.path
                  );

                if (
                  computedPath
                ) {
                  roadPath =
                    computedPath;

                  // ===================================
                  // SAVE TO MEMORY
                  // ===================================

                  routeCacheRef.current[
                    transfer.id
                  ] =
                    computedPath;

                  // ===================================
                  // SAVE TO LOCALSTORAGE
                  // ===================================

                  saveRoute(
                    transfer.id,
                    computedPath
                  );

                  // ===================================
                  // DISTANCE
                  // ===================================

                  if (
                    route.distanceMeters !=
                    null
                  ) {
                    distanceKm =
                      Number(
                        (
                          route.distanceMeters /
                          1000
                        ).toFixed(
                          1
                        )
                      );
                  }

                  // ===================================
                  // ETA
                  // ===================================

                  if (
                    route.durationMillis !=
                    null
                  ) {
                    durationMinutes =
                      Math.round(
                        route.durationMillis /
                          60000
                      );
                  }

                  // ===================================
                  // SAVE PERMANENTLY TO FIRESTORE
                  // ===================================

                  try {
                    await updateDoc(
                      doc(
                        db,
                        "organTransfers",
                        transfer.id
                      ),
                      {
                        roadPath:
                          computedPath,

                        routeDistanceKm:
                          distanceKm,

                        routeDurationMinutes:
                          durationMinutes,

                        routeCalculatedAt:
                          serverTimestamp(),
                      }
                    );

                    console.log(
                      "🔥 Google road route permanently saved to Firestore:",
                      transfer.id
                    );
                  } catch (
                    firestoreError
                  ) {
                    console.error(
                      "Failed to save Google road route to Firestore:",
                      firestoreError
                    );
                  }
                }
              }
            } catch (error) {
              console.error(
                `Google route failed for ${transfer.id}:`,
                error
              );
            }
          }

          if (
            cancelled ||
            generation !==
              routeGenerationRef.current
          ) {
            return;
          }

          // ===========================================
          // DRAW ROAD PATH
          // ===========================================

          if (roadPath) {
            routesForSimulation[
              transfer.id
            ] =
              roadPath;

            const routePolyline =
              new google.maps.Polyline({
                path:
                  roadPath,

                geodesic:
                  false,

                strokeColor:
                  isCritical
                    ? "#ef4444"
                    : "#3b82f6",

                strokeOpacity:
                  0.95,

                strokeWeight:
                  5,

                zIndex:
                  10,

                map:
                  mapRef.current,
              });

            routePolylinesRef.current.push(
              routePolyline
            );

            roadPath.forEach(
              (
                point
              ) => {
                bounds.extend(
                  point
                );
              }
            );
          } else {
            console.warn(
              "⚠️ No road path available for transfer:",
              transfer.id
            );
          }

          // ===========================================
          // ROUTE INFORMATION
          // ===========================================

          newRouteInfo.push({
            id:
              transfer.id,

            organType:
              transfer.organType ||
              "Organ",

            urgencyLevel:
              transfer.urgencyLevel ||
              "normal",

            distanceKm,

            durationMinutes,
          });
        }

        if (
          cancelled ||
          generation !==
            routeGenerationRef.current
        ) {
          return;
        }

        // =============================================
        // UPDATE ROUTE INFORMATION UI
        // =============================================

        setRouteInfo(
          newRouteInfo
        );

        // =============================================
        // DEDUPLICATE ROUTES READY CALLBACK
        //
        // This prevents TrackingPage from receiving
        // identical route data repeatedly.
        // =============================================

        const routesReadyKey =
          Object.entries(
            routesForSimulation
          )
            .map(
              ([
                transferId,
                path,
              ]) => {
                const first =
                  path?.[
                    0
                  ];

                const last =
                  path?.[
                    path.length -
                      1
                  ];

                return [
                  transferId,

                  path?.length ||
                    0,

                  first?.lat ??
                    "",

                  first?.lng ??
                    "",

                  last?.lat ??
                    "",

                  last?.lng ??
                    "",
                ].join(":");
              }
            )
            .sort()
            .join("|");

        // =============================================
        // ONLY NOTIFY WHEN ROUTES ACTUALLY CHANGED
        // =============================================

        if (
          routesReadyKey !==
          lastRoutesReadyKeyRef.current
        ) {
          lastRoutesReadyKeyRef.current =
            routesReadyKey;

          if (
            typeof
              onRoutesReadyRef.current ===
            "function"
          ) {
            onRoutesReadyRef.current(
              routesForSimulation
            );
          }

          console.log(
            "✅ Road routes ready:",
            Object.keys(
              routesForSimulation
            )
          );
        }

        // =============================================
        // FIT MAP TO VISIBLE TRANSFERS
        // =============================================

        if (
          hasLocations &&
          !bounds.isEmpty()
        ) {
          mapRef.current.fitBounds(
            bounds,
            60
          );
        }
      } catch (error) {
        console.error(
          "Failed to rebuild road routes:",
          error
        );

        if (!cancelled) {
          setMapError(
            error?.message ||
              "Google Routes API could not be loaded."
          );
        }
      }
    }

    calculateRoutes();

    return () => {
      cancelled =
        true;
    };
  }, [
    mapReady,
    routeEndpointsKey,
    clearStaticMapObjects,
  ]);

  // ====================================================
  // VEHICLE MARKER EFFECT
  //
  // This runs when vehicle location/status changes.
  // It moves the ambulance marker WITHOUT rebuilding
  // the Google road route.
  // ====================================================

  useEffect(() => {
    if (
      !mapReady ||
      !mapRef.current ||
      !window.google?.maps
    ) {
      return;
    }

    const google =
      window.google;

    const activeVehicleIds =
      new Set();

    transfers.forEach(
      (
        transfer
      ) => {
        const status =
          normalizeStatus(
            transfer.status
          );

        const vehicle =
          getCoords(
            transfer.vehicleLocation
          );

        if (
          !vehicle ||
          status !==
            "in_transit"
        ) {
          return;
        }

        activeVehicleIds.add(
          transfer.id
        );

        const existingMarker =
          vehicleMarkersRef.current[
            transfer.id
          ];

        // =============================================
        // UPDATE EXISTING AMBULANCE MARKER
        // =============================================

        if (
          existingMarker
        ) {
          existingMarker.setPosition(
            vehicle
          );

          existingMarker.setMap(
            mapRef.current
          );

          return;
        }

        // =============================================
        // CREATE AMBULANCE MARKER
        // =============================================

        const marker =
          new google.maps.Marker({
            position:
              vehicle,

            map:
              mapRef.current,

            title:
              "Organ Transport Vehicle",

            zIndex:
              999,

            icon: {
              url:
                createMarkerIcon(
                  "#f59e0b",
                  "🚑"
                ),

              scaledSize:
                new google.maps.Size(
                  50,
                  50
                ),

              anchor:
                new google.maps.Point(
                  25,
                  25
                ),
            },
          });

        const infoWindow =
          new google.maps.InfoWindow({
            content: `
              <div
                style="
                  color:#111;
                  padding:6px;
                  min-width:160px;
                "
              >
                <strong>
                  🚑 Transport Vehicle
                </strong>

                <br/>

                Organ:
                ${
                  transfer.organType ||
                  "N/A"
                }

                <br/>

                Status:
                In Transit
              </div>
            `,
          });

        marker.addListener(
          "click",
          () => {
            infoWindow.open({
              map:
                mapRef.current,

              anchor:
                marker,
            });
          }
        );

        vehicleMarkersRef.current[
          transfer.id
        ] =
          marker;
      }
    );

    // ==================================================
    // REMOVE OLD VEHICLE MARKERS
    // ==================================================

    Object.keys(
      vehicleMarkersRef.current
    ).forEach(
      (
        transferId
      ) => {
        if (
          !activeVehicleIds.has(
            transferId
          )
        ) {
          vehicleMarkersRef.current[
            transferId
          ]?.setMap?.(
            null
          );

          delete vehicleMarkersRef.current[
            transferId
          ];
        }
      }
    );
  }, [
    mapReady,
    vehicleLocationsKey,
    transfers,
  ]);

  // ====================================================
  // COMPONENT CLEANUP
  // ====================================================

  useEffect(() => {
    return () => {
      // Cancel any pending route calculation
      routeGenerationRef.current +=
        1;

      // Clear static markers
      staticMarkersRef.current.forEach(
        (
          marker
        ) => {
          marker?.setMap?.(
            null
          );
        }
      );

      // Clear route polylines
      routePolylinesRef.current.forEach(
        (
          polyline
        ) => {
          polyline?.setMap?.(
            null
          );
        }
      );

      // Clear vehicle markers
      Object.values(
        vehicleMarkersRef.current
      ).forEach(
        (
          marker
        ) => {
          marker?.setMap?.(
            null
          );
        }
      );

      staticMarkersRef.current =
        [];

      routePolylinesRef.current =
        [];

      vehicleMarkersRef.current =
        {};

      routeCacheRef.current =
        {};

      lastRoutesReadyKeyRef.current =
        "";
    };
  }, []);

  // ====================================================
  // ERROR UI
  // ====================================================

  if (mapError) {
    return (
      <div
        className="
          h-[500px]
          rounded-xl
          bg-red-500/10
          border
          border-red-500/30
          flex
          flex-col
          gap-2
          items-center
          justify-center
          p-6
          text-red-400
          text-center
        "
      >
        <strong>
          Google Maps Error
        </strong>

        <span>
          {mapError}
        </span>
      </div>
    );
  }

  // ====================================================
  // MAP UI
  // ====================================================

  return (
    <div>
      <div
        className="
          rounded-xl
          overflow-hidden
          shadow-lg
          border
          border-white/20
          relative
        "
        style={{
          height:
            "500px",
        }}
      >
        {!mapReady && (
          <div
            className="
              absolute
              inset-0
              bg-gray-900
              z-10
              flex
              items-center
              justify-center
              text-gray-400
            "
          >
            Loading Google Maps...
          </div>
        )}

        <div
          ref={
            mapContainerRef
          }
          style={{
            width:
              "100%",

            height:
              "100%",
          }}
        />
      </div>

      {/* ================================================= */}
      {/* ROUTE INFORMATION */}
      {/* ================================================= */}

      {routeInfo.length >
        0 && (
        <div className="flex flex-wrap gap-3 mt-3">
          {routeInfo.map(
            (
              info
            ) => (
              <div
                key={
                  info.id
                }
                className="
  bg-white
  dark:bg-slate-800
  text-slate-700
  dark:text-slate-200
  border
  border-slate-200
  dark:border-slate-700
  rounded-lg
  px-4
  py-2
  text-sm
  shadow-sm
  transition-colors
  duration-300
"
              >
                🚑{" "}

                <strong>
                  {
                    info.organType
                  }
                </strong>

                {info.distanceKm !=
                  null && (
                  <>
                    {" "}
                    •{" "}
                    {
                      info.distanceKm
                    }{" "}
                    km
                  </>
                )}

                {info.durationMinutes !=
                  null && (
                  <>
                    {" "}
                    • ETA{" "}
                    {
                      formatDuration(
                        info.durationMinutes
                      )
                    }
                  </>
                )}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}