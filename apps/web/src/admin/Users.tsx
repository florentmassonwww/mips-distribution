// Company administration: users and their roles.
import { useState } from "react";
import { K } from "../legacy/i18n.js";
import {
  $ as Field,
  J as api,
  Q as Card,
  Y as useQuery,
  _v as useUi,
  cv as Badge,
  fv as PageHead,
  mv as Table,
  pv as Loaded,
  tv as roleLabel,
  xv as useSession,
} from "../legacy/shared.js";
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
  const ui = useUi();
  const { session } = useSession();
  const vertical = session.user?.vertical;
  const roleLabels: Record<string, string> = Object.fromEntries(COMPANY_ROLES.map((role) => [role, roleLabel(role, vertical)]));
  const users = useQuery<CompanyUser[]>("/api/admin/users");
  const [draft, setDraft] = useState<NewUser>(EMPTY_USER);

  const create = () =>
    ui.run(async () => {
      await api("POST", "/api/admin/users", draft);
      setDraft({ name: "", email: "", role: "agent" });
      await users.reload();
    }, K("Utilisateur créé."));

  const update = (user: CompanyUser, patch: UserPatch, successMessage: string) =>
    ui.run(async () => {
      await api("PATCH", `/api/admin/users/${user.id}`, patch);
      await users.reload();
    }, successMessage);

  const roleOptions = COMPANY_ROLES.map((role) => (
    <option key={role} value={role}>
      {roleLabels[role]}
    </option>
  ));

  return (
    <>
      <PageHead title={K("Utilisateurs et rôles")} sub={K("Les permissions sont appliquées par le serveur à chaque requête.")} />
      <div className="stack">
        <Card title={K("Ajouter un utilisateur")}>
          <div className="grid g4">
            <Field label={K("Nom")}>
              <input type="text" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            </Field>
            <Field label={K("Adresse e-mail")}>
              <input type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
            </Field>
            <Field label={K("Rôle")}>
              <select value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })}>
                {roleOptions}
              </select>
            </Field>
            <div className="row" style={{ alignItems: "flex-end" }}>
              <button disabled={draft.name.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(draft.email)} onClick={create}>
                {K("Ajouter")}
              </button>
            </div>
          </div>
          <div className="small muted" style={{ marginTop: 10 }}>
            {K(
              "En démonstration, la connexion se fait par choix du profil. En production : authentification de l'entreprise (SSO) ou mot de passe à usage unique.",
            )}
          </div>
        </Card>
        <Card title={K("Utilisateurs")} flush>
          <Loaded q={users}>
            {(rows) => (
              <Table
                rows={rows}
                rowKey={(user) => user.id}
                empty={K("Aucun utilisateur.")}
                cols={[
                  [K("Nom"), (user) => <strong>{user.name}</strong>],
                  ["E-mail", (user) => user.email],
                  [
                    K("Rôle"),
                    // An administrator cannot change their own role (the server refuses it too).
                    (user) =>
                      user.id === session.user?.id ? (
                        roleLabels[user.role]
                      ) : (
                        <select
                          value={user.role}
                          onChange={(event) => update(user, { role: event.target.value }, K("Rôle modifié."))}
                          aria-label={K("Rôle de {0}", user.name)}
                          style={{ width: "auto" }}
                        >
                          {roleOptions}
                        </select>
                      ),
                  ],
                  [
                    K("Accès"),
                    (user) => <Badge kind={user.active ? "ok" : "err"}>{user.active ? K("Actif") : K("Désactivé")}</Badge>,
                  ],
                  [
                    "",
                    (user) =>
                      user.id === session.user?.id ? (
                        <span className="small muted">{K("Vous")}</span>
                      ) : (
                        <button
                          className={`sm ${user.active ? "danger" : "secondary"}`}
                          onClick={() =>
                            update(user, { active: !user.active }, user.active ? K("Accès désactivé.") : K("Accès rétabli."))
                          }
                        >
                          {user.active ? K("Désactiver") : K("Réactiver")}
                        </button>
                      ),
                  ],
                ]}
              />
            )}
          </Loaded>
        </Card>
        {vertical === "club" ? <ClubRolesCard /> : <DistributionRolesCard />}
      </div>
    </>
  );
}

function ClubRolesCard() {
  return (
    <Card title={K("Ce que chaque rôle peut faire")}>
      <dl className="kv">
        <dt>{K("Accueil et barrière")}</dt>
        <dd>{K("Contrôle des badges à l'entrée : décision, motif, code de paiement à présenter au membre. Aucun accès aux comptes.")}</dd>
        <dt>{K("Secrétariat")}</dt>
        <dd>
          {K("Membres, consommations imputées au compte, envoi des relevés, journal de la barrière. Pas d'encaissement ni de facturation.")}
        </dd>
        <dt>{K("Comptabilité")}</dt>
        <dd>{K("Cotisations, relances, encaissements, rapprochement des virements, exceptions, export comptable.")}</dd>
        <dt>{K("Direction du club")}</dt>
        <dd>{K("Tout ce qui précède, plus utilisateurs, paramètres et journal d'audit.")}</dd>
      </dl>
    </Card>
  );
}

function DistributionRolesCard() {
  return (
    <Card title={K("Ce que chaque rôle peut faire")}>
      <dl className="kv">
        <dt>{K("Agent terrain")}</dt>
        <dd>{K("Ses tournées uniquement : livraisons, ventes sur place, encaissements, reçus, bilan.")}</dd>
        <dt>{K("Centrale")}</dt>
        <dd>{K("Commandes, tournées, stocks, incidents terrain. Pas d'accès à la finance.")}</dd>
        <dt>{K("Finance")}</dt>
        <dd>{K("Journal, factures, rapprochement, exceptions, clôture, ERP, remboursements. Lecture seule sur les opérations.")}</dd>
        <dt>{K("Administrateur")}</dt>
        <dd>{K("Tout ce qui précède, plus utilisateurs, paramètres et journal d'audit.")}</dd>
      </dl>
    </Card>
  );
}
