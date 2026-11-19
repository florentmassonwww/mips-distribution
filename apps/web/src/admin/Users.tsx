// Company administration: users and their roles.
import { useState } from "react";
import { translate } from "../i18n/translate.ts";
import { apiRequest } from "../shared/api.ts";
import { Badge } from "../shared/Badge.tsx";
import { DataTable } from "../shared/DataTable.tsx";
import { useFeedback } from "../shared/Feedback.tsx";
import { Field } from "../shared/Form.tsx";
import { useApi } from "../shared/hooks.ts";
import { roleLabel } from "../shared/labels.ts";
import { Card, PageHeader } from "../shared/Layout.tsx";
import { QueryView } from "../shared/QueryView.tsx";
import { useSession } from "../shared/session.ts";
import { COMPANY_ROLES } from "./roles.ts";

interface CompanyUser {
  id: string;
  name: string;
  email: string;
  role: string;
  active: number | boolean;
  created_at: string;
}

interface NewUser {
  name: string;
  email: string;
  role: string;
}

type UserPatch = { role: string } | { active: boolean };

const EMPTY_USER: NewUser = { name: "", email: "", role: "agent" };

export function UsersPage() {
  const ui = useFeedback();
  const { session } = useSession();
  const vertical = session.user?.vertical;
  const roleLabels: Record<string, string> = Object.fromEntries(COMPANY_ROLES.map((role) => [role, roleLabel(role, vertical)]));
  const users = useApi<CompanyUser[]>("/api/admin/users");
  const [draft, setDraft] = useState<NewUser>(EMPTY_USER);

  const create = () =>
    ui.run(async () => {
      await apiRequest("POST", "/api/admin/users", draft);
      setDraft({ name: "", email: "", role: "agent" });
      await users.reload();
    }, translate("Utilisateur créé."));

  const update = (user: CompanyUser, patch: UserPatch, successMessage: string) =>
    ui.run(async () => {
      await apiRequest("PATCH", `/api/admin/users/${user.id}`, patch);
      await users.reload();
    }, successMessage);

  const roleOptions = COMPANY_ROLES.map((role) => (
    <option key={role} value={role}>
      {roleLabels[role]}
    </option>
  ));

  return (
    <>
      <PageHeader title={translate("Utilisateurs et rôles")} sub={translate("Les permissions sont appliquées par le serveur à chaque requête.")} />
      <div className="stack">
        <Card title={translate("Ajouter un utilisateur")}>
          <div className="grid g4">
            <Field label={translate("Nom")}>
              <input type="text" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            </Field>
            <Field label={translate("Adresse e-mail")}>
              <input type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
            </Field>
            <Field label={translate("Rôle")}>
              <select value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })}>
                {roleOptions}
              </select>
            </Field>
            <div className="row" style={{ alignItems: "flex-end" }}>
              <button disabled={draft.name.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(draft.email)} onClick={create}>
                {translate("Ajouter")}
              </button>
            </div>
          </div>
          <div className="small muted" style={{ marginTop: 10 }}>
            {translate(
              "En démonstration, la connexion se fait par choix du profil. En production : authentification de l'entreprise (SSO) ou mot de passe à usage unique.",
            )}
          </div>
        </Card>
        <Card title={translate("Utilisateurs")} flush>
          <QueryView q={users}>
            {(rows) => (
              <DataTable
                rows={rows}
                rowKey={(user) => user.id}
                empty={translate("Aucun utilisateur.")}
                cols={[
                  [translate("Nom"), (user) => <strong>{user.name}</strong>],
                  ["E-mail", (user) => user.email],
                  [
                    translate("Rôle"),
                    // An administrator cannot change their own role (the server refuses it too).
                    (user) =>
                      user.id === session.user?.id ? (
                        roleLabels[user.role]
                      ) : (
                        <select
                          value={user.role}
                          onChange={(event) => update(user, { role: event.target.value }, translate("Rôle modifié."))}
                          aria-label={translate("Rôle de {0}", user.name)}
                          style={{ width: "auto" }}
                        >
                          {roleOptions}
                        </select>
                      ),
                  ],
                  [
                    translate("Accès"),
                    (user) => <Badge kind={user.active ? "ok" : "err"}>{user.active ? translate("Actif") : translate("Désactivé")}</Badge>,
                  ],
                  [
                    "",
                    (user) =>
                      user.id === session.user?.id ? (
                        <span className="small muted">{translate("Vous")}</span>
                      ) : (
                        <button
                          className={`sm ${user.active ? "danger" : "secondary"}`}
                          onClick={() =>
                            update(user, { active: !user.active }, user.active ? translate("Accès désactivé.") : translate("Accès rétabli."))
                          }
                        >
                          {user.active ? translate("Désactiver") : translate("Réactiver")}
                        </button>
                      ),
                  ],
                ]}
              />
            )}
          </QueryView>
        </Card>
        {vertical === "club" ? <ClubRolesCard /> : <DistributionRolesCard />}
      </div>
    </>
  );
}

function ClubRolesCard() {
  return (
    <Card title={translate("Ce que chaque rôle peut faire")}>
      <dl className="kv">
        <dt>{translate("Accueil et barrière")}</dt>
        <dd>{translate("Contrôle des badges à l'entrée : décision, motif, code de paiement à présenter au membre. Aucun accès aux comptes.")}</dd>
        <dt>{translate("Secrétariat")}</dt>
        <dd>
          {translate("Membres, consommations imputées au compte, envoi des relevés, journal de la barrière. Pas d'encaissement ni de facturation.")}
        </dd>
        <dt>{translate("Comptabilité")}</dt>
        <dd>{translate("Cotisations, relances, encaissements, rapprochement des virements, exceptions, export comptable.")}</dd>
        <dt>{translate("Direction du club")}</dt>
        <dd>{translate("Tout ce qui précède, plus utilisateurs, paramètres et journal d'audit.")}</dd>
      </dl>
    </Card>
  );
}

function DistributionRolesCard() {
  return (
    <Card title={translate("Ce que chaque rôle peut faire")}>
      <dl className="kv">
        <dt>{translate("Agent terrain")}</dt>
        <dd>{translate("Ses tournées uniquement : livraisons, ventes sur place, encaissements, reçus, bilan.")}</dd>
        <dt>{translate("Centrale")}</dt>
        <dd>{translate("Commandes, tournées, stocks, incidents terrain. Pas d'accès à la finance.")}</dd>
        <dt>{translate("Finance")}</dt>
        <dd>{translate("Journal, factures, rapprochement, exceptions, clôture, ERP, remboursements. Lecture seule sur les opérations.")}</dd>
        <dt>{translate("Administrateur")}</dt>
        <dd>{translate("Tout ce qui précède, plus utilisateurs, paramètres et journal d'audit.")}</dd>
      </dl>
    </Card>
  );
}
