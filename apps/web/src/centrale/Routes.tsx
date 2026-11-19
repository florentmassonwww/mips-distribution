import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { translate } from "../i18n/translate.ts";
import { apiRequest } from "../shared/api.ts";
import { Badge, StatusBadge } from "../shared/Badge.tsx";
import { DataTable } from "../shared/DataTable.tsx";
import { useFeedback } from "../shared/Feedback.tsx";
import { formatDayLong, formatMoney } from "../shared/format.ts";
import { useApi } from "../shared/hooks.ts";
import { ROUTE_STATUS } from "../shared/labels.ts";
import { Card, PageHeader } from "../shared/Layout.tsx";
import { QueryView } from "../shared/QueryView.tsx";
import { useSession } from "../shared/session.ts";
import { RouteForm, type RouteDraft } from "./RouteForm.tsx";
import type { ReferenceData, RouteSummary } from "./types.ts";

/** Delivery routes: list and creation. */
export function RouteList() {
  const feedback = useFeedback();
  const { session } = useSession();
  // Finance follows the routes but does not organise them.
  const canEdit = session.user!.role !== `finance`;
  const routes = useApi<RouteSummary[]>(`/api/centrale/routes`);
  const reference = useApi<ReferenceData>(`/api/centrale/reference`);
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<RouteDraft>({
    name: ``,
    day: session.today,
    agentId: ``,
    vehicle: ``,
    customerIds: [],
  });

  const createRoute = () =>
    feedback.run(async () => {
      const created = await apiRequest<{ id: string }>(`POST`, `/api/centrale/routes`, {
        ...draft,
        agentId: draft.agentId || null,
      });
      navigate(`/centrale/tournees/${created.id}`);
    }, translate(`Tournée créée.`));

  // Ticking appends the outlet (its rank is its visiting order); unticking removes it.
  const toggleCustomer = (customerId: string) =>
    setDraft((current) => ({
      ...current,
      customerIds: current.customerIds.includes(customerId)
        ? current.customerIds.filter((id) => id !== customerId)
        : [...current.customerIds, customerId],
    }));

  return (
    <>
      <PageHeader title={translate(`Tournées`)} sub={translate(`Organisation, affectation des agents et chargement des véhicules.`)}>
        {canEdit && <button onClick={() => setFormOpen(!formOpen)}>{translate(formOpen ? `Fermer` : `Nouvelle tournée`)}</button>}
      </PageHeader>
      <div className="stack">
        {formOpen && (
          <QueryView q={reference}>
            {(referenceData) => (
              <RouteForm
                reference={referenceData}
                draft={draft}
                onChange={setDraft}
                onToggleCustomer={toggleCustomer}
                onSubmit={createRoute}
              />
            )}
          </QueryView>
        )}
        <Card title={translate(`Tournées`)} flush>
          <QueryView q={routes}>
            {(rows) => (
              <DataTable
                rows={rows}
                rowKey={(route) => route.id}
                empty={translate(`Aucune tournée.`)}
                onRow={(route) => navigate(`/centrale/tournees/${route.id}`)}
                cols={[
                  [translate(`Jour`), (route) => formatDayLong(route.day)],
                  [translate(`Tournée`), (route) => <strong>{route.name}</strong>],
                  [translate(`Agent`), (route) => route.agent ?? <Badge kind="warn">{translate(`À affecter`)}</Badge>],
                  [translate(`Véhicule`), (route) => route.vehicle || `—`],
                  [translate(`État`), (route) => <StatusBadge map={ROUTE_STATUS} value={route.status} />],
                  [translate(`Arrêts`), (route) => route.stops, `right`],
                  [translate(`Commandes`), (route) => `${route.orders_done}/${route.orders_total}`, `right`],
                  [translate(`Facturé`), (route) => formatMoney(route.invoiced_minor), `right`],
                  [translate(`Encaissé confirmé`), (route) => formatMoney(route.paid_minor), `right`],
                ]}
              />
            )}
          </QueryView>
        </Card>
      </div>
    </>
  );
}
