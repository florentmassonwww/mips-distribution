import { translate } from "../i18n/translate.ts";
import { Field } from "../shared/Form.tsx";
import { Card } from "../shared/Layout.tsx";
import type { ReferenceData } from "./types.ts";

export interface RouteDraft {
  name: string;
  day: string;
  /** Empty: no agent assigned yet. */
  agentId: string;
  vehicle: string;
  /** Outlets to visit, in visiting order (the order in which they were ticked). */
  customerOutletIds: string[];
}

interface RouteFormProps {
  reference: ReferenceData;
  draft: RouteDraft;
  onChange: (draft: RouteDraft) => void;
  onToggleCustomerOutlet: (customerOutletId: string) => void;
  onSubmit: () => void;
}

/** New route card. The draft is owned by the page, so it survives closing and reopening the form. */
export function RouteForm({ reference, draft, onChange, onToggleCustomerOutlet, onSubmit }: RouteFormProps) {
  return (
    <Card title={translate(`Nouvelle tournée`)}>
      <div className="stack">
        <div className="grid g4">
          <Field label={translate(`Nom`)}>
            <input
              type="text"
              value={draft.name}
              onChange={(event) => onChange({ ...draft, name: event.target.value })}
              placeholder={translate(`Ex. Est - Flacq`)}
            />
          </Field>
          <Field label={translate(`Jour`)}>
            <input type="date" value={draft.day} onChange={(event) => onChange({ ...draft, day: event.target.value })} />
          </Field>
          <Field label={translate(`Agent`)}>
            <select value={draft.agentId} onChange={(event) => onChange({ ...draft, agentId: event.target.value })}>
              <option value="">{translate(`À affecter`)}</option>
              {reference.agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={translate(`Véhicule`)}>
            <input type="text" value={draft.vehicle} onChange={(event) => onChange({ ...draft, vehicle: event.target.value })} />
          </Field>
        </div>
        <div>
          <div className="small muted" style={{ marginBottom: 6 }}>
            {translate(`Commerces à visiter, dans l'ordre de sélection`)}
          </div>
          <div className="chips">
            {reference.customer_outlets.map((outlet) => {
              const position = draft.customerOutletIds.indexOf(outlet.id);
              const selected = draft.customerOutletIds.includes(outlet.id);
              return (
                <label key={outlet.id} className={`chip ${selected ? `on` : ``}`}>
                  <input type="checkbox" checked={selected} onChange={() => onToggleCustomerOutlet(outlet.id)} />
                  {selected ? `${position + 1}. ` : ``}
                  {outlet.name} · {outlet.zone}
                </label>
              );
            })}
          </div>
        </div>
        <div>
          <button disabled={draft.name.trim().length < 2 || !draft.day} onClick={onSubmit}>
            {translate(`Créer la tournée`)}
          </button>
        </div>
      </div>
    </Card>
  );
}
