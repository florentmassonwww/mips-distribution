// Entry point of the interface. Talks to apps/api on the same origin (/api/*).
// Import order matters: styles, then the demo reset shim (wraps fetch before any request), then the app.
import "./style.css";
import "./demo-reset.js";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { vv as UiProvider } from "./legacy/shared.js";
import { AppRoutes } from "./shell/AppRoutes.tsx";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("#root is missing from index.html");

createRoot(rootElement).render(
  <StrictMode>
    <HashRouter>
      <UiProvider>
        <AppRoutes />
      </UiProvider>
    </HashRouter>
  </StrictMode>,
);
