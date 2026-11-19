import { Card, Field, t } from "./legacy.ts";
import type { ReferenceData } from "./types.ts";

export interface RouteDraft {
  name: string;
  day: string;
  /** Empty: no agent assigned yet. */
  agentId: string;
  vehicle: string;
  /** Outlets to visit, in visiting order (the order in which they were ticked). */
  customerIds: string[];
}

interface RouteFormProps {
  reference: ReferenceData;
  draft: RouteDraft;
  onChange: (draft: RouteDraft) => void;
  onToggleCustomer: (customerId: string) => void;
  onSubmit: () => void;
}

/** New route card. The draft is owned by the page, so it survives closing and reopening the form. */
export function RouteForm({ reference, draft, onChange, onToggleCustomer, onSubmit }: RouteFormProps) {
  return (
    <Card title={t(`Nouvelle tournée`)}>
      <div className="stack">
        <div className="grid g4">
          <Field label={t(`Nom`)}>
            <input
              type="text"
              value={draft.name}
              onChange={(event) => onChange({ ...draft, name: event.target.value })}
              placeholder={t(`Ex. Est - Flacq`)}
            />
          </Field>
          <Field label={t(`Jour`)}>
            <input type="date" value={draft.day} onChange={(event) => onChange({ ...draft, day: event.target.value })} />
          </Field>
          <Field label={t(`Agent`)}>
            <select value={draft.agentId} onChange={(event) => onChange({ ...draft, agentId: event.target.value })}>
              <option value="">{t(`À affecter`)}</option>
              {reference.agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t(`Véhicule`)}>
            <input type="text" value={draft.vehicle} onChange={(event) => onChange({ ...draft, vehicle: event.target.value })} />
          </Field>
        </div>
        <div>
          <div className="small muted" style={{ marginBottom: 6 }}>
            {t(`Commerces à visiter, dans l'ordre de sélection`)}
          </div>
          <div className="chips">
            {reference.customers.map((customer) => {
              const position = draft.customerIds.indexOf(customer.id);
              const selected = draft.customerIds.includes(customer.id);
              return (
                <label key={customer.id} className={`chip ${selected ? `on` : ``}`}>
                  <input type="checkbox" checked={selected} onChange={() => onToggleCustomer(customer.id)} />
                  {selected ? `${position + 1}. ` : ``}
                  {customer.name} · {customer.zone}
                </label>
              );
            })}
          </div>
        </div>
        <div>
          <button disabled={draft.name.trim().length < 2 || !draft.day} onClick={onSubmit}>
            {t(`Créer la tournée`)}
          </button>
        </div>
      </div>
    </Card>
  );
}
