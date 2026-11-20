// Company administration: the company's own sites (stores, warehouses, depots), not its customers' outlets.
import { useState } from "react";
import { translate } from "../i18n/translate.ts";
import { apiRequest } from "../shared/api.ts";
import { Badge } from "../shared/Badge.tsx";
import { DataTable } from "../shared/DataTable.tsx";
import { useFeedback } from "../shared/Feedback.tsx";
import { Field } from "../shared/Form.tsx";
import { useApi } from "../shared/hooks.ts";
import { Card, PageHeader } from "../shared/Layout.tsx";
import { QueryView } from "../shared/QueryView.tsx";

/** GET /api/admin/sites: one site of the company. */
interface Site {
  id: string;
  type: string;
  parent_site_id: string | null;
  code: string;
  name: string;
  address: string;
  timezone: string;
  status: string;
  created_at: string;
}

/** Body of POST /api/admin/sites and PATCH /api/admin/sites/:id. */
interface SiteDraft {
  type: string;
  code: string;
  name: string;
  address: string;
  timezone: string;
  parentSiteId: string | null;
  status: string;
}

const SITE_TYPES = ["store", "warehouse", "depot"] as const;
const SITE_TYPE: Record<string, string> = {
  store: translate("Magasin"),
  warehouse: translate("Entrepôt"),
  depot: translate("Dépôt"),
};
const DEFAULT_TIMEZONE = "Indian/Mauritius";
/** Suggestions of the time zone field; any IANA zone is accepted (the server checks it). */
const TIMEZONES = ["Indian/Mauritius", "Indian/Reunion", "Indian/Antananarivo", "Indian/Mahe", "Africa/Johannesburg", "Europe/Paris", "UTC"];

const EMPTY_DRAFT: SiteDraft = {
  type: "store",
  code: "",
  name: "",
  address: "",
  timezone: DEFAULT_TIMEZONE,
  parentSiteId: null,
  status: "active",
};

/** Same rule as the server: letters, digits and dashes, 20 characters at most (stored upper case). */
const CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]{0,19}$/;

const draftOf = (site: Site): SiteDraft => ({
  type: site.type,
  code: site.code,
  name: site.name,
  address: site.address,
  timezone: site.timezone,
  parentSiteId: site.parent_site_id,
  status: site.status,
});

/** A site's descendants (and itself): they cannot become its parent. */
function selfAndDescendants(sites: readonly Site[], siteId: string): Set<string> {
  const excluded = new Set([siteId]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const site of sites) {
      if (site.parent_site_id && excluded.has(site.parent_site_id) && !excluded.has(site.id)) {
        excluded.add(site.id);
        grew = true;
      }
    }
  }
  return excluded;
}

export function SitesPage() {
  const ui = useFeedback();
  const sites = useApi<Site[]>("/api/admin/sites");
  const [draft, setDraft] = useState<SiteDraft>(EMPTY_DRAFT);
  /** Site being edited; null while creating. */
  const [editing, setEditing] = useState<Site | null>(null);
  /** Last refusal of the server for the form, shown next to it. */
  const [formError, setFormError] = useState<string | null>(null);

  const startEdit = (site: Site) => {
    setEditing(site);
    setDraft(draftOf(site));
    setFormError(null);
    document.getElementById("site-form")?.scrollIntoView({ block: "start" });
    document.getElementById("site-code")?.focus();
  };
  const cancelEdit = () => {
    setEditing(null);
    setDraft(EMPTY_DRAFT);
    setFormError(null);
  };

  const save = async () => {
    setFormError(null);
    const body = { ...draft, code: draft.code.trim(), name: draft.name.trim(), address: draft.address.trim(), timezone: draft.timezone.trim() };
    const saved = await ui.run(
      async () => {
        try {
          if (editing) await apiRequest("PATCH", `/api/admin/sites/${editing.id}`, body);
          else await apiRequest("POST", "/api/admin/sites", body);
        } catch (error) {
          setFormError((error as Error).message);
          throw error;
        }
        await sites.reload();
      },
      editing ? translate("Établissement modifié.") : translate("Établissement créé."),
    );
    if (saved) cancelEdit();
  };

  const toggleStatus = (site: Site) =>
    ui.run(
      async () => {
        await apiRequest("PATCH", `/api/admin/sites/${site.id}`, { status: site.status === "active" ? "inactive" : "active" });
        await sites.reload();
      },
      site.status === "active" ? translate("Établissement désactivé.") : translate("Établissement réactivé."),
    );

  const codeValid = CODE_PATTERN.test(draft.code.trim());
  const nameValid = draft.name.trim().length >= 2 && draft.name.trim().length <= 80;
  const canSave = codeValid && nameValid && draft.timezone.trim().length > 0;
  const all = sites.data ?? [];
  const excluded = editing ? selfAndDescendants(all, editing.id) : new Set<string>();
  const nameOf = (siteId: string | null) => (siteId ? (all.find((site) => site.id === siteId)?.name ?? siteId) : "—");

  return (
    <>
      <PageHeader
        title={translate("Établissements")}
        sub={translate("Magasins, entrepôts et dépôts de l'entreprise elle-même (pas les points de vente de ses clients).")}
      />
      <div className="stack">
        <Card title={translate("Établissements de l'entreprise")} flush>
          <QueryView q={sites}>
            {(rows) => (
              <DataTable
                rows={rows}
                rowKey={(site) => site.id}
                empty={translate("Aucun établissement.")}
                cols={[
                  [translate("Code"), (site) => <span className="code nb">{site.code}</span>],
                  [
                    translate("Nom"),
                    (site) => (
                      <>
                        <strong>{site.name}</strong>
                        {site.address && <div className="small muted">{site.address}</div>}
                      </>
                    ),
                  ],
                  [translate("Type"), (site) => SITE_TYPE[site.type] ?? site.type],
                  [translate("Rattaché à"), (site) => nameOf(site.parent_site_id)],
                  [translate("Fuseau horaire"), (site) => site.timezone],
                  [
                    translate("État"),
                    (site) => <Badge kind={site.status === "active" ? "ok" : ""}>{site.status === "active" ? translate("Actif") : translate("Inactif")}</Badge>,
                  ],
                  [
                    "",
                    (site) => (
                      <span className="row nowrap" style={{ flexWrap: "nowrap" }}>
                        <button className="sm secondary" onClick={() => startEdit(site)} aria-label={translate("Modifier {0}", site.name)}>
                          {translate("Modifier")}
                        </button>
                        <button
                          className={`sm ${site.status === "active" ? "danger" : "secondary"}`}
                          onClick={() => toggleStatus(site)}
                          aria-label={site.status === "active" ? translate("Désactiver {0}", site.name) : translate("Réactiver {0}", site.name)}
                        >
                          {site.status === "active" ? translate("Désactiver") : translate("Réactiver")}
                        </button>
                      </span>
                    ),
                  ],
                ]}
              />
            )}
          </QueryView>
        </Card>
        <section id="site-form">
          <Card title={editing ? translate("Modifier l'établissement {0}", editing.code) : translate("Nouvel établissement")}>
            <form
              className="stack"
              onSubmit={(event) => {
                event.preventDefault();
                if (canSave) void save();
              }}
            >
              <div className="grid g4">
                <Field label={translate("Type")}>
                  <select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })}>
                    {SITE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {SITE_TYPE[type]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={translate("Code")} hint={translate("Lettres, chiffres et tirets, 20 caractères au plus ; unique dans l'entreprise.")}>
                  <input
                    id="site-code"
                    type="text"
                    value={draft.code}
                    maxLength={20}
                    aria-invalid={draft.code !== "" && !codeValid}
                    onChange={(event) => setDraft({ ...draft, code: event.target.value.toUpperCase() })}
                  />
                </Field>
                <Field label={translate("Nom")}>
                  <input type="text" value={draft.name} maxLength={80} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
                </Field>
                <Field label={translate("Rattaché à")}>
                  <select
                    value={draft.parentSiteId ?? ""}
                    onChange={(event) => setDraft({ ...draft, parentSiteId: event.target.value || null })}
                  >
                    <option value="">{translate("Aucun (établissement principal)")}</option>
                    {all
                      .filter((site) => !excluded.has(site.id))
                      .map((site) => (
                        <option key={site.id} value={site.id}>
                          {site.code} · {site.name}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label={translate("Adresse")}>
                  <input type="text" value={draft.address} maxLength={200} onChange={(event) => setDraft({ ...draft, address: event.target.value })} />
                </Field>
                <Field label={translate("Fuseau horaire")}>
                  <input
                    type="text"
                    list="site-timezones"
                    value={draft.timezone}
                    onChange={(event) => setDraft({ ...draft, timezone: event.target.value })}
                  />
                  <datalist id="site-timezones">
                    {TIMEZONES.map((zone) => (
                      <option key={zone} value={zone} />
                    ))}
                  </datalist>
                </Field>
                <Field label={translate("État")}>
                  <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>
                    <option value="active">{translate("Actif")}</option>
                    <option value="inactive">{translate("Inactif")}</option>
                  </select>
                </Field>
              </div>
              {formError && (
                <div className="notice err" role="alert">
                  {formError}
                </div>
              )}
              <div className="row">
                <button type="submit" disabled={!canSave}>
                  {editing ? translate("Enregistrer l'établissement") : translate("Créer l'établissement")}
                </button>
                {editing && (
                  <button type="button" className="secondary" onClick={cancelEdit}>
                    {translate("Annuler")}
                  </button>
                )}
              </div>
            </form>
          </Card>
        </section>
      </div>
    </>
  );
}
