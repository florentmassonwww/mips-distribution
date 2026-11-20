// Home page: in demo mode, sign-in by choosing a profile, and the guided demo walkthroughs.
import { Link, useNavigate } from "react-router-dom";
import { translate } from "../i18n/translate.ts";
import { apiRequest } from "../shared/api.ts";
import { useFeedback } from "../shared/Feedback.tsx";
import { useApi } from "../shared/hooks.ts";
import { roleLabel } from "../shared/labels.ts";
import { LanguageToggle } from "../shared/LanguageToggle.tsx";
import { inCatalogueOrder, MODULE_LABEL } from "../shared/modules.ts";
import { QueryView } from "../shared/QueryView.tsx";
import { useSession } from "../shared/session.ts";
import { homePathFor } from "./areas.ts";

/** GET /api/demo/users: active users, platform users without a company. */
interface DemoUser {
  id: string;
  name: string;
  role: string;
  company_id: string | null;
  company_name: string | null;
  company_status: string | null;
  /** Modules of the company, in catalogue order; empty for platform users. */
  company_modules: string[];
}

export function HomePage() {
  const { session, refresh } = useSession();
  const navigate = useNavigate();
  const ui = useFeedback();
  const demoUsers = useApi<DemoUser[]>(session.demoMode ? "/api/demo/users" : null);

  const signIn = (user: DemoUser) =>
    ui.run(async () => {
      await apiRequest("POST", "/api/demo/login", { userId: user.id });
      await refresh();
      navigate(homePathFor(user.role, user.company_modules));
    });

  // Outside demo mode, sign-in goes through the company's identity provider (not wired yet).
  if (!session.demoMode) {
    return (
      <div className="mobile stack">
        <h1>MIPS Distribution</h1>
        <div className="notice">{translate("La connexion passe par l'authentification de l'entreprise, à raccorder avant la mise en production.")}</div>
      </div>
    );
  }

  return (
    <div className="mobile stack" style={{ maxWidth: 820 }}>
      <div className="mobile-head">
        <div className="row spread">
          <h1>MIPS Distribution</h1>
          <LanguageToggle />
        </div>
        <div className="muted">
          {translate("Distribution B2B, vente sur la route et paiement à la livraison ; clubs de sport, comptes membres et recouvrement.")} · v
          {session.version}
        </div>
      </div>
      {session.user && (
        <div className="notice">
          {translate("Connecté :")} {session.user.name}.
          {/* No link when the profile has no area left (none of its company's modules serves the role). */}
          {homePathFor(session.user.role, session.user.modules) !== "/" && (
            <>
              {" "}
              <Link to={homePathFor(session.user.role, session.user.modules)}>{translate("Reprendre mon espace →")}</Link>
            </>
          )}
        </div>
      )}
      <h2>{translate("Connexion de démonstration : choisissez un profil")}</h2>
      <QueryView q={demoUsers}>{(users) => <DemoProfiles users={users} onSignIn={signIn} />}</QueryView>
      <DistributionWalkthrough />
      <ClubWalkthrough />
    </div>
  );
}

function DemoProfiles({ users, onSignIn }: { users: DemoUser[]; onSignIn: (user: DemoUser) => void }) {
  // One card per company, in the order of the list; any user of the company describes it.
  const companies = [...new Map(users.filter((user) => user.company_id).map((user) => [user.company_id, user])).values()];
  return (
    <>
      {companies.map((company) => (
        <section className="card" key={company.company_id}>
          <header>
            <h2>{company.company_name}</h2>
            <span className="row">
              {/* One badge per enabled module, in catalogue order. */}
              {inCatalogueOrder(company.company_modules).map((module) => (
                <span className="badge info" key={module}>
                  {MODULE_LABEL[module]}
                </span>
              ))}
              {company.company_modules.length === 0 && <span className="badge">{translate("Aucun module")}</span>}
              {company.company_status !== "active" && <span className="badge err">{translate("Accès suspendu")}</span>}
            </span>
          </header>
          <div className="body row">
            {users
              .filter((user) => user.company_id === company.company_id)
              .map((user) => (
                // Field agents (mobile screen) stand out from the back-office profiles.
                <button key={user.id} className={user.role === "agent" ? "" : "secondary"} onClick={() => onSignIn(user)}>
                  {user.name.split(" (")[0]} · {roleLabel(user.role, user.company_modules)}
                </button>
              ))}
          </div>
        </section>
      ))}
      <section className="card">
        <header>
          <h2>{translate("Plateforme SaaS")}</h2>
        </header>
        <div className="body row">
          {users
            .filter((user) => !user.company_id)
            .map((user) => (
              <button key={user.id} className="secondary" onClick={() => onSignIn(user)}>
                {roleLabel(user.role)}
              </button>
            ))}
        </div>
      </section>
    </>
  );
}

function DistributionWalkthrough() {
  return (
    <section className="card">
      <header>
        <h2>{translate("Parcours de démonstration (10 minutes)")}</h2>
      </header>
      <div className="body">
        <ol style={{ margin: 0, paddingLeft: 20 }} className="stack">
          <li>
            <strong>{translate("Agent · Ravi")}</strong>{" "}
            {translate(": démarrer « Nord - Grand-Baie », livrer la première commande, encaisser avec PayStation et jouer « Paiement réussi » dans le simulateur.")}
          </li>
          <li>
            {translate("Livrer partiellement la deuxième commande (motif obligatoire), encaisser par carte et jouer « Paiement refusé », puis réessayer avec Juice.")}
          </li>
          <li>
            {translate("Activer « Simuler hors ligne », faire une vente sur place, puis rétablir le réseau : l'action est synchronisée une seule fois.")}
          </li>
          <li>
            <strong>{translate("Centrale · Kevin")}</strong>{" "}
            {translate(": le tableau de bord s'actualise seul ; valider l'incident de livraison partielle ; préparer et charger « Centre - Curepipe ».")}
          </li>
          <li>
            <strong>{translate("Finance · Sophie")}</strong>{" "}
            {translate(": Rapprochement › générer un relevé avec anomalies et l'importer ; traiter les exceptions ; clôturer la journée ; voir les écritures ERP.")}
          </li>
          <li>
            <strong>{translate("Administrateur · Anjali")}</strong>{" "}
            {translate(": Paramètres › simuler une panne ERP, refaire une vente, puis reprendre les écritures en erreur depuis Finance › ERP.")}
          </li>
          <li>{translate("Se connecter sur « Grossiste Démo Océan » : aucune donnée de la première entreprise n'y apparaît.")}</li>
        </ol>
      </div>
    </section>
  );
}

function ClubWalkthrough() {
  return (
    <section className="card">
      <header>
        <h2>{translate("Parcours club de sport (8 minutes)")}</h2>
      </header>
      <div className="body">
        <ol style={{ margin: 0, paddingLeft: 20 }} className="stack">
          <li>
            <strong>{translate("Comptabilité · Mélanie")}</strong>{" "}
            {translate(": Recouvrement › qui doit quoi et depuis quand ; ouvrir Yannick Ramsamy, voir son relevé et ses relances.")}
          </li>
          <li>
            {translate("« Envoyer le relevé et le lien de paiement », puis « Ouvrir la page du membre » : payer en ligne et jouer « Paiement réussi ». Le solde tombe à zéro.")}
          </li>
          <li>
            {translate("Rapprochement › générer le relevé de démonstration et l'importer : les virements bien référencés sont affectés seuls ; affecter à la main le virement sans référence.")}
          </li>
          <li>
            {translate("Relances › lancer les relances : un second lancement n'envoie rien de plus. Export comptable : écritures équilibrées, prêtes pour la comptabilité.")}
          </li>
          <li>
            <strong>{translate("Accueil · Jean-Luc")}</strong>{" "}
            {translate(": contrôler les badges B00001 (à jour), B00008 (en retard : entrée signalée, code de paiement), B00014 (suspendu).")}
          </li>
          <li>
            <strong>{translate("Direction · Véronique")}</strong>{" "}
            {translate(": Paramètres › refuser l'entrée au-delà de 90 jours de retard, puis recontrôler B00008.")}
          </li>
        </ol>
      </div>
    </section>
  );
}
