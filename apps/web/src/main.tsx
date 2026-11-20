// Entry point of the interface. Talks to apps/api on the same origin (/api/*).
import "./style.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { translate } from "./i18n/translate.ts";
import { FeedbackProvider } from "./shared/Feedback.tsx";
import { AppRoutes } from "./shell/AppRoutes.tsx";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("#root is missing from index.html");

// index.html carries the French title; the tab shows it in the interface language.
document.title = translate("MIPS Distribution · démo");

createRoot(rootElement).render(
  <StrictMode>
    <HashRouter>
      <FeedbackProvider>
        <AppRoutes />
      </FeedbackProvider>
    </HashRouter>
  </StrictMode>,
);
