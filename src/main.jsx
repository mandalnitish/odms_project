import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { DarkModeProvider } from "./context/DarkModeContext";
import "./index.css";
import 'leaflet/dist/leaflet.css';
import './utils/fixLeafletIcons';

ReactDOM.createRoot(document.getElementById("root")).render(
  <DarkModeProvider>
    <App />
  </DarkModeProvider>
);
