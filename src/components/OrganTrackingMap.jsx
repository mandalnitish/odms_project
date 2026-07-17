// src/components/OrganTrackingMap.jsx

import React, {
  useEffect,
  useRef,
  useState,
} from "react";

// ======================================================
// GOOGLE MAPS API KEY
// ======================================================

const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Prevent Google Maps from loading multiple times
let googleMapsPromise = null;

// ======================================================
// GOOGLE MAPS LOADER
// ======================================================

function loadGoogleMaps() {
  // Already loaded
  if (window.google?.maps?.importLibrary) {
    return Promise.resolve(window.google);
  }

  // Already loading
  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise(
    (resolve, reject) => {
      if (!GOOGLE_MAPS_API_KEY) {
        reject(
          new Error(
            "Google Maps API key is missing. Add VITE_GOOGLE_MAPS_API_KEY to your .env file."
          )
        );

        return;
      }

      // ==================================================
      // GOOGLE OFFICIAL-STYLE BOOTSTRAP LOADER
      // ==================================================

      ((g) => {
        let h;
        let a;
        let k;

        const p =
          "The Google Maps JavaScript API";

        const c =
          "google";

        const l =
          "importLibrary";

        const q =
          "__ib__";

        const m =
          document;

        let b =
          window;

        b =
          b[c] ||
          (b[c] = {});

        const d =
          b.maps ||
          (b.maps = {});

        const r =
          new Set();

        const e =
          new URLSearchParams();

        const u = () =>
          h ||
          (h =
            new Promise(
              async (
                resolveScript,
                rejectScript
              ) => {
                a =
                  m.createElement(
                    "script"
                  );

                e.set(
                  "libraries",
                  [...r] + ""
                );

                for (k in g) {
                  e.set(
                    k.replace(
                      /[A-Z]/g,
                      (t) =>
                        "_" +
                        t[0].toLowerCase()
                    ),
                    g[k]
                  );
                }

                e.set(
                  "callback",
                  c +
                    ".maps." +
                    q
                );

                a.src =
                  `https://maps.${c}apis.com/maps/api/js?` +
                  e.toString();

                d[q] =
                  resolveScript;

                a.onerror =
                  () => {
                    h =
                      null;

                    rejectScript(
                      new Error(
                        p +
                          " could not load."
                      )
                    );
                  };

                a.nonce =
                  m.querySelector(
                    "script[nonce]"
                  )?.nonce ||
                  "";

                m.head.append(
                  a
                );
              }
            ));

        if (d[l]) {
          console.warn(
            p +
              " is already loaded. Using the existing loader."
          );
        } else {
          d[l] = (
            library,
            ...args
          ) => {
            r.add(
              library
            );

            return u().then(
              () =>
                d[l](
                  library,
                  ...args
                )
            );
          };
        }
      })({
        key:
          GOOGLE_MAPS_API_KEY,

        v:
          "weekly",
      });

      // ==================================================
      // LOAD MAPS LIBRARY
      // ==================================================

      window.google.maps
        .importLibrary(
          "maps"
        )
        .then(() => {
          resolve(
            window.google
          );
        })
        .catch(
          (error) => {
            console.error(
              "Google Maps loading error:",
              error
            );

            reject(
              error
            );
          }
        );
    }
  );

  return googleMapsPromise;
}

// ======================================================
// LOCATION HELPER
//
// Supports Firestore GeoPoint:
// {
//   latitude: 21.52,
//   longitude: 72.99
// }
//
// Supports normal object:
// {
//   lat: 21.52,
//   lng: 72.99
// }
// ======================================================

function getCoords(
  location
) {
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
    lat === undefined ||
    lng === undefined ||
    lat === null ||
    lng === null
  ) {
    return null;
  }

  const latitude =
    Number(lat);

  const longitude =
    Number(lng);

  if (
    Number.isNaN(
      latitude
    ) ||
    Number.isNaN(
      longitude
    )
  ) {
    return null;
  }

  return {
    lat:
      latitude,

    lng:
      longitude,
  };
}

// ======================================================
// CREATE SVG MARKER ICON
// ======================================================

function createMarkerIcon(
  color,
  emoji = ""
) {
  const svg = `
    <svg
      width="50"
      height="50"
      viewBox="0 0 50 50"
      xmlns="http://www.w3.org/2000/svg"
    >

      <circle
        cx="25"
        cy="25"
        r="17"
        fill="${color}"
        stroke="white"
        stroke-width="4"
      />

      ${
        emoji
          ? `
            <text
              x="25"
              y="31"
              text-anchor="middle"
              font-size="19"
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
    encodeURIComponent(
      svg
    )
  );
}

// ======================================================
// DURATION FORMATTER
//
// Example:
// 213 minutes -> 3 hr 33 min
// 120 minutes -> 2 hr
// 45 minutes  -> 45 min
// ======================================================

function formatDuration(
  minutes
) {
  const hours =
    Math.floor(
      minutes / 60
    );

  const mins =
    minutes % 60;

  if (
    hours === 0
  ) {
    return `${mins} min`;
  }

  if (
    mins === 0
  ) {
    return `${hours} hr`;
  }

  return `${hours} hr ${mins} min`;
}

// ======================================================
// MAIN COMPONENT
// ======================================================

export default function OrganTrackingMap({
  transfers = [],
}) {
  const mapContainerRef =
    useRef(null);

  const mapRef =
    useRef(null);

  // Markers + polylines
  const overlaysRef =
    useRef([]);

  const [
    mapReady,
    setMapReady,
  ] = useState(
    false
  );

  const [
    mapError,
    setMapError,
  ] = useState(
    ""
  );

  const [
    routeInfo,
    setRouteInfo,
  ] = useState(
    []
  );

  // ====================================================
  // INITIALIZE GOOGLE MAP
  // ====================================================

  useEffect(() => {
    let active =
      true;

    async function initializeMap() {
      try {
        setMapError(
          ""
        );

        const google =
          await loadGoogleMaps();

        if (
          !active ||
          !mapContainerRef.current
        ) {
          return;
        }

        const {
          Map,
        } =
          await google.maps.importLibrary(
            "maps"
          );

        if (!active) {
          return;
        }

        mapRef.current =
          new Map(
            mapContainerRef.current,
            {
              // Default Gujarat location
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
      } catch (
        error
      ) {
        console.error(
          "Google Maps initialization failed:",
          error
        );

        if (active) {
          setMapError(
            error?.message ||
              "Google Maps could not be loaded."
          );
        }
      }
    }

    initializeMap();

    return () => {
      active =
        false;
    };
  }, []);

  // ====================================================
  // DRAW TRANSFERS + ROUTES
  // ====================================================

  useEffect(() => {
    if (
      !mapReady ||
      !mapRef.current ||
      !window.google
        ?.maps
        ?.importLibrary
    ) {
      return;
    }

    let cancelled =
      false;

    async function drawTransfers() {
      const google =
        window.google;

      // ================================================
      // REMOVE OLD MARKERS AND ROUTES
      // ================================================

      overlaysRef.current.forEach(
        (overlay) => {
          if (
            overlay &&
            typeof overlay.setMap ===
              "function"
          ) {
            overlay.setMap(
              null
            );
          }
        }
      );

      overlaysRef.current =
        [];

      setRouteInfo(
        []
      );

      // ================================================
      // LOAD NEW ROUTES LIBRARY
      // ================================================

      let Route;

      try {
        const routesLibrary =
          await google.maps.importLibrary(
            "routes"
          );

        Route =
          routesLibrary.Route;

        console.log(
          "Google Routes library loaded."
        );
      } catch (
        error
      ) {
        console.error(
          "Could not load Google Routes library:",
          error
        );

        Route =
          null;
      }

      if (cancelled) {
        return;
      }

      // ================================================
      // CREATE MAP BOUNDS
      // ================================================

      const bounds =
        new google.maps.LatLngBounds();

      let hasValidLocation =
        false;

      const newRouteInfo =
        [];

      // ================================================
      // PROCESS EACH TRANSFER
      // ================================================

      for (
        const transfer
        of transfers
      ) {
        if (cancelled) {
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

        const vehicle =
          getCoords(
            transfer.vehicleLocation
          );

        // Donor + recipient required
        if (
          !donor ||
          !recipient
        ) {
          console.warn(
            "Skipping transfer because donor or recipient coordinates are missing:",
            transfer.id
          );

          continue;
        }

        hasValidLocation =
          true;

        bounds.extend(
          donor
        );

        bounds.extend(
          recipient
        );

        if (vehicle) {
          bounds.extend(
            vehicle
          );
        }

        // ==============================================
        // DONOR MARKER
        // ==============================================

        const donorMarker =
          new google.maps.Marker(
            {
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
            }
          );

        const donorInfo =
          new google.maps.InfoWindow(
            {
              content: `
                <div
                  style="
                    color:#111;
                    padding:6px;
                    min-width:150px;
                  "
                >

                  <strong>
                    🟢 Donor
                  </strong>

                  <br/>

                  ${
                    transfer.donorName ||
                    "Unknown"
                  }

                  <br/>

                  Organ:
                  ${
                    transfer.organType ||
                    "N/A"
                  }

                </div>
              `,
            }
          );

        donorMarker.addListener(
          "click",
          () => {
            donorInfo.open(
              mapRef.current,
              donorMarker
            );
          }
        );

        overlaysRef.current.push(
          donorMarker
        );

        // ==============================================
        // RECIPIENT MARKER
        // ==============================================

        const recipientMarker =
          new google.maps.Marker(
            {
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
            }
          );

        const recipientInfo =
          new google.maps.InfoWindow(
            {
              content: `
                <div
                  style="
                    color:#111;
                    padding:6px;
                    min-width:150px;
                  "
                >

                  <strong>
                    🔴 Recipient
                  </strong>

                  <br/>

                  ${
                    transfer.recipientName ||
                    "Unknown"
                  }

                  <br/>

                  Urgency:
                  ${
                    transfer.urgencyLevel ||
                    "Normal"
                  }

                </div>
              `,
            }
          );

        recipientMarker.addListener(
          "click",
          () => {
            recipientInfo.open(
              mapRef.current,
              recipientMarker
            );
          }
        );

        overlaysRef.current.push(
          recipientMarker
        );

        // ==============================================
        // VEHICLE MARKER
        // Visible until delivery
        // ==============================================

        if (
          vehicle &&
          transfer.status !==
            "delivered"
        ) {
          const vehicleMarker =
            new google.maps.Marker(
              {
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
              }
            );

          const vehicleInfo =
            new google.maps.InfoWindow(
              {
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
                    ${
                      transfer.status ||
                      "Unknown"
                    }

                  </div>
                `,
              }
            );

          vehicleMarker.addListener(
            "click",
            () => {
              vehicleInfo.open(
                mapRef.current,
                vehicleMarker
              );
            }
          );

          overlaysRef.current.push(
            vehicleMarker
          );
        }

        // ==============================================
        // ACTUAL GOOGLE ROAD ROUTE
        // NEW ROUTES API
        // ==============================================

        const isCritical =
          transfer.urgencyLevel ===
          "critical";

        let routeCreated =
          false;

        if (Route) {
          try {
            const {
              routes,
            } =
              await Route.computeRoutes(
                {
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
                }
              );

            if (
              cancelled
            ) {
              return;
            }

            if (
              routes &&
              routes.length >
                0
            ) {
              const route =
                routes[0];

              // ========================================
              // CREATE GOOGLE ROUTE POLYLINES
              // ========================================

              const polylines =
                route.createPolylines();

              polylines.forEach(
                (
                  polyline
                ) => {
                  polyline.setOptions(
                    {
                      strokeColor:
                        isCritical
                          ? "#ef4444"
                          : "#3b82f6",

                      strokeOpacity:
                        0.9,

                      strokeWeight:
                        5,
                    }
                  );

                  polyline.setMap(
                    mapRef.current
                  );

                  overlaysRef.current.push(
                    polyline
                  );
                }
              );

              routeCreated =
                true;

              // ========================================
              // DISTANCE
              // ========================================

              const distanceKm =
                route.distanceMeters
                  ? (
                      route.distanceMeters /
                      1000
                    ).toFixed(
                      1
                    )
                  : null;

              // ========================================
              // DURATION
              // ========================================

              const durationMinutes =
                route.durationMillis
                  ? Math.round(
                      route.durationMillis /
                        60000
                    )
                  : null;

              console.log(
                "🚑 Route Distance:",
                distanceKm
                  ? `${distanceKm} km`
                  : "N/A"
              );

              console.log(
                "⏱️ Estimated Time:",
                durationMinutes
                  ? formatDuration(
                      durationMinutes
                    )
                  : "N/A"
              );

              newRouteInfo.push(
                {
                  id:
                    transfer.id,

                  organType:
                    transfer.organType ||
                    "Organ",

                  distance:
                    distanceKm,

                  duration:
                    durationMinutes,
                }
              );
            }
          } catch (
            error
          ) {
            console.error(
              `Routes API failed for transfer ${transfer.id}:`,
              error
            );
          }
        }

        // ==============================================
        // FALLBACK
        // If Routes API fails, show straight line
        // ==============================================

        if (
          !routeCreated
        ) {
          const fallbackPath =
            [
              donor,

              vehicle,

              recipient,
            ].filter(
              Boolean
            );

          const fallbackLine =
            new google.maps.Polyline(
              {
                path:
                  fallbackPath,

                geodesic:
                  true,

                strokeColor:
                  isCritical
                    ? "#ef4444"
                    : "#3b82f6",

                strokeOpacity:
                  0.8,

                strokeWeight:
                  4,

                map:
                  mapRef.current,
              }
            );

          overlaysRef.current.push(
            fallbackLine
          );

          console.warn(
            `Using fallback straight route for transfer ${transfer.id}.`
          );
        }
      }

      // ================================================
      // UPDATE ROUTE INFORMATION
      // ================================================

      if (
        !cancelled
      ) {
        setRouteInfo(
          newRouteInfo
        );
      }

      // ================================================
      // FIT MAP TO ALL LOCATIONS
      // ================================================

      if (
        hasValidLocation &&
        !cancelled
      ) {
        mapRef.current.fitBounds(
          bounds
        );

        google.maps.event.addListenerOnce(
          mapRef.current,
          "idle",
          () => {
            if (
              mapRef.current &&
              mapRef.current.getZoom() >
                13
            ) {
              mapRef.current.setZoom(
                13
              );
            }
          }
        );
      }
    }

    drawTransfers();

    return () => {
      cancelled =
        true;
    };
  }, [
    transfers,
    mapReady,
  ]);

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
          items-center
          justify-center
          p-6
          text-red-400
        "
      >
        Google Maps Error:
        {" "}
        {
          mapError
        }
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

        {/* LOADING */}

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

        {/* GOOGLE MAP */}

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

      {/* ============================================ */}
      {/* ROUTE INFORMATION */}
      {/* ============================================ */}

      {routeInfo.length >
        0 && (

        <div className="mt-3 flex flex-wrap gap-3">

          {routeInfo.map(
            (
              route
            ) => (

              <div
                key={
                  route.id
                }
                className="
                  bg-gray-800
                  border
                  border-gray-700
                  rounded-lg
                  px-4
                  py-2
                  text-sm
                  text-gray-300
                "
              >

                🚑
                {" "}

                <strong>
                  {
                    route.organType
                  }
                </strong>

                {route.distance && (

                  <span>
                    {" "}
                    •
                    {" "}
                    {
                      route.distance
                    }
                    {" "}
                    km
                  </span>

                )}

                {route.duration && (

                  <span>
                    {" "}
                    •
                    {" "}
                    ETA
                    {" "}
                    {
                      formatDuration(
                        route.duration
                      )
                    }
                  </span>

                )}

              </div>

            )
          )}

        </div>

      )}

    </div>
  );
}