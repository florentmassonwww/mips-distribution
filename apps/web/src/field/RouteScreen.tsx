// The route open on the phone: sync bar, then the tabs (stops, catalogue, history, summary) or
// one of the sub-screens (stop, delivery, sale, payment, receipt).
import { useMemo, useState } from "react";
import { translate } from "../i18n/translate.ts";
import { localizeErrorMessage } from "../shared/errors.ts";
import { useFeedback } from "../shared/Feedback.tsx";
import { formatDate, formatDayLong, formatTime } from "../shared/format.ts";
import { LanguageToggle } from "../shared/LanguageToggle.tsx";
import { applyQueuedActions, readQueue, useNetwork } from "../shared/offline.ts";
import { useSession } from "../shared/session.ts";
import { queuedActions, rejectedActions } from "./offline-queue.ts";
import { useRouteSync } from "./useRouteSync.ts";
import { StopList } from "./StopList.tsx";
import { CatalogTab } from "./CatalogTab.tsx";
import { HistoryTab } from "./HistoryTab.tsx";
import { RouteSummary } from "./RouteSummary.tsx";
import { StopScreen } from "./StopScreen.tsx";
import { DeliveryForm } from "./DeliveryForm.tsx";
import { PaymentPanel } from "./PaymentPanel.tsx";
import { ReceiptScreen } from "./ReceiptScreen.tsx";
import type { SyncResult } from "./types.ts";

export type FieldView =
  | { name: "home" }
  | { name: "stop"; customerId: string }
  | { name: "deliver"; orderId: string }
  | { name: "sale"; customerId: string }
  | { name: "pay"; invoiceId: string }
  | { name: "receipt"; invoiceId: string };

type Tab = "route" | "catalog" | "history" | "summary";

interface RouteScreenProps {
  routeId: string;
  onLeave: () => void;
}

export function RouteScreen({ routeId, onLeave }: RouteScreenProps) {
  const { session } = useSession();
  const userId = session.user!.id;
  const ui = useFeedback();
  const network = useNetwork();
  const { bundle, queue, setQueue, syncing, lastSyncAt, sync, submit } = useRouteSync(routeId, userId, network, onLeave);
  const [view, setView] = useState<FieldView>({ name: "home" });
  const [tab, setTab] = useState<Tab>("route");
  const work = useMemo(() => (bundle ? applyQueuedActions(bundle, queue) : null), [bundle, queue]);

  if (!bundle || !work) {
    return (
      <div className="stack">
        <div className="notice warn">{translate("Tournée non disponible hors ligne : connectez-vous au réseau une première fois.")}</div>
        <button className="secondary" onClick={onLeave}>
          {translate("Retour")}
        </button>
      </div>
    );
  }

  const pendingCount = queuedActions(queue).length;
  const rejected = rejectedActions(queue);
  const closed = bundle.route.status === "closed";
  const deliveredOrder = view.name === "deliver" ? work.orders.find((order) => order.id === view.orderId) : undefined;

  const go = (next: FieldView) => {
    setView(next);
    window.scrollTo(0, 0);
  };
  const backTo = (customerId?: string) => go(customerId ? { name: "stop", customerId } : { name: "home" });

  // After a delivery or a sale: an invoice to collect opens the payment screen; otherwise (queued
  // offline, or refused by the server) back to the stop.
  const afterSubmit = (result: SyncResult | null, customerId: string) => {
    if (result?.status === "rejected") {
      ui.toast(result.message ? localizeErrorMessage(result.code ?? "", result.message) : translate("Action refusée par le serveur."), "err");
      go({ name: "stop", customerId });
    } else if (result?.result?.invoiceId) {
      ui.toast(translate("{0} enregistrée.", result.result.orderNumber));
      go({ name: "pay", invoiceId: result.result.invoiceId });
    } else go({ name: "stop", customerId });
  };

  const tabs: [Tab, string][] = [
    ["route", translate("Tournée")],
    ["catalog", translate("Catalogue")],
    ["history", translate("Historique")],
    ["summary", translate("Bilan")],
  ];

  return (
    <div className="stack">
      <div className="mobile-head">
        <div className="row spread">
          <h1>{bundle.route.name}</h1>
          <span className="row">
            <LanguageToggle />
            <button className="sm ghost" onClick={onLeave}>
              {translate("Tournées")}
            </button>
          </span>
        </div>
        <div className="muted">
          {formatDayLong(bundle.route.day)} · {bundle.route.vehicle}
        </div>
      </div>
      <div className={`syncbar ${network.online ? (pendingCount ? "warn" : "ok") : "off"}`} role="status">
        <div>
          <strong>{network.online ? translate("En ligne") : translate("Hors ligne")}</strong>
          {" · "}
          {pendingCount ? translate("{0} action(s) à synchroniser", pendingCount) : translate("tout est synchronisé")}
          <div className="small">
            {syncing
              ? translate("Synchronisation…")
              : lastSyncAt
                ? translate("Dernière synchro {0}", formatTime(lastSyncAt))
                : translate("Données du {0}", formatDate(bundle.generatedAt, true))}
          </div>
        </div>
        <div className="row">
          {network.online && (
            <button className="sm secondary" disabled={syncing} onClick={() => ui.run(sync)}>
              {translate("Synchroniser")}
            </button>
          )}
          {session.demoMode && (
            <button className="sm secondary" onClick={() => network.setForced(!network.forced)}>
              {network.forced ? translate("Rétablir le réseau") : translate("Simuler hors ligne")}
            </button>
          )}
        </div>
      </div>
      {rejected.length > 0 && (
        <div className="notice err" role="alert">
          {rejected.length} {translate("action(s) refusée(s) par le serveur : voir l'onglet Historique.")}
        </div>
      )}
      {view.name === "home" && (
        <>
          <div className="tabs" role="tablist">
            {tabs.map(([key, label]) => (
              <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}>
                {label}
              </button>
            ))}
          </div>
          {tab === "route" && <StopList work={work} onOpen={(customerId) => go({ name: "stop", customerId })} closed={closed} />}
          {tab === "catalog" && <CatalogTab work={work} />}
          {tab === "history" && (
            <HistoryTab
              work={work}
              queue={queue}
              onDrop={(actionId) => setQueue(readQueue(userId).filter((action) => action.id !== actionId))}
              onInvoice={(invoiceId) => go({ name: "receipt", invoiceId })}
            />
          )}
          {tab === "summary" && (
            <RouteSummary routeId={routeId} online={network.online} pending={pendingCount} closed={closed} onClosed={() => void sync().catch(() => null)} />
          )}
        </>
      )}
      {view.name === "stop" && <StopScreen work={work} customerId={view.customerId} online={network.online} closed={closed} go={go} />}
      {view.name === "deliver" && (
        <DeliveryForm
          work={work}
          order={deliveredOrder}
          // The order comes from the stop screen, so it is in the bundle.
          customerId={deliveredOrder!.customer_id}
          onCancel={(customerId) => go({ name: "stop", customerId })}
          onSubmit={async (action) => afterSubmit(await submit(action), action.customerId)}
        />
      )}
      {view.name === "sale" && (
        <DeliveryForm
          work={work}
          customerId={view.customerId}
          onCancel={(customerId) => go({ name: "stop", customerId })}
          onSubmit={async (action) => afterSubmit(await submit(action), action.customerId)}
        />
      )}
      {view.name === "pay" && (
        <PaymentPanel
          invoiceId={view.invoiceId}
          methods={bundle.methods}
          online={network.online}
          onBack={(customerId) => {
            // Leaving the payment screen refreshes the bundle so the stop shows the new status.
            sync().catch(() => null);
            backTo(customerId);
          }}
          onReceipt={() => go({ name: "receipt", invoiceId: view.invoiceId })}
        />
      )}
      {view.name === "receipt" && (
        <ReceiptScreen
          invoiceId={view.invoiceId}
          online={network.online}
          onBack={backTo}
          onPay={() => go({ name: "pay", invoiceId: view.invoiceId })}
        />
      )}
    </div>
  );
}
