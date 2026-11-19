import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  apiRequest,
  Badge,
  Card,
  formatDay,
  formatMoney,
  PageHead,
  QueryView,
  ROUTE_STATUS,
  StatusBadge,
  Table,
  t,
  useApi,
  useFeedback,
  useSession,
} from "./legacy.ts";
import { RouteForm, type RouteDraft } from "./RouteForm.tsx";
import type { ReferenceData, RouteSummary } from "./types.ts";

/** Delivery routes: list and creation. */
export function RouteList() {
  const feedback = useFeedback();
  const { session } = useSession();
  // Finance follows the routes but does not organise them.
  const canEdit = session.user.role !== `finance`;
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
    }, t(`Tournée créée.`));

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
      <PageHead title={t(`Tournées`)} sub={t(`Organisation, affectation des agents et chargement des véhicules.`)}>
        {canEdit && <button onClick={() => setFormOpen(!formOpen)}>{t(formOpen ? `Fermer` : `Nouvelle tournée`)}</button>}
      </PageHead>
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
        <Card title={t(`Tournées`)} flush>
          <QueryView q={routes}>
            {(rows) => (
              <Table
                rows={rows}
                rowKey={(route) => route.id}
                empty={t(`Aucune tournée.`)}
                onRow={(route) => navigate(`/centrale/tournees/${route.id}`)}
                cols={[
                  [t(`Jour`), (route) => formatDay(route.day)],
                  [t(`Tournée`), (route) => <strong>{route.name}</strong>],
                  [t(`Agent`), (route) => route.agent ?? <Badge kind="warn">{t(`À affecter`)}</Badge>],
                  [t(`Véhicule`), (route) => route.vehicle || `—`],
                  [t(`État`), (route) => <StatusBadge map={ROUTE_STATUS} value={route.status} />],
                  [t(`Arrêts`), (route) => route.stops, `right`],
                  [t(`Commandes`), (route) => `${route.orders_done}/${route.orders_total}`, `right`],
                  [t(`Facturé`), (route) => formatMoney(route.invoiced_minor), `right`],
                  [t(`Encaissé confirmé`), (route) => formatMoney(route.paid_minor), `right`],
                ]}
              />
            )}
          </QueryView>
        </Card>
      </div>
    </>
  );
}
