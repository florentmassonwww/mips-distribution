// Home page: in demo mode, sign-in by choosing a profile, and the guided demo walkthroughs.
import { Link, useNavigate } from "react-router-dom";
import { K } from "../legacy/i18n.js";
import {
  J as api,
  Y as useQuery,
  _v as useUi,
  pv as Loaded,
  tv as roleLabel,
  xv as useSession,
  yv as LanguageToggle,
} from "../legacy/shared.js";
import { homePathFor } from "./areas.ts";

/** GET /api/demo/users: active users, platform users without a company. */
interface DemoUser {
  id: string;
  name: string;
  role: string;
  company_id: string | null;
  company_name: string | null;
  company_status: string | null;
  company_vertical: string | null;
}

export function HomePage() {
  const { session, refresh } = useSession();
  const navigate = useNavigate();
  const ui = useUi();
  const demoUsers = useQuery<DemoUser[]>(session.demoMode ? "/api/demo/users" : null);

  const signIn = (user: DemoUser) =>
    ui.run(async () => {
      await api("POST", "/api/demo/login", { userId: user.id });
      await refresh();
      navigate(homePathFor(user.role, user.company_vertical));
    });

  // Outside demo mode, sign-in goes through the company's identity provider (not wired yet).
  if (!session.demoMode) {
    return (
      <div className="mobile stack">
        <h1>MIPS Distribution</h1>
        <div className="notice">{K("La connexion passe par l'authentification de l'entreprise, à raccorder avant la mise en production.")}</div>
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
          {K("Distribution B2B, vente sur la route et paiement à la livraison ; clubs de sport, comptes membres et recouvrement.")} · v
          {session.version}
        </div>
      </div>
      {session.user && (
        <div className="notice">
          {K("Connecté :")} {session.user.name}.{" "}
          <Link to={homePathFor(session.user.role, session.user.vertical)}>{K("Reprendre mon espace →")}</Link>
        </div>
      )}
      <h2>{K("Connexion de démonstration : choisissez un profil")}</h2>
      <Loaded q={demoUsers}>{(users) => <DemoProfiles users={users} onSignIn={signIn} />}</Loaded>
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
              <span className="badge info">{company.company_vertical === "club" ? K("Club de sport") : K("Distribution")}</span>
              {company.company_status !== "active" && <span className="badge err">{K("Accès suspendu")}</span>}
            </span>
          </header>
          <div className="body row">
            {users
              .filter((user) => user.company_id === company.company_id)
              .map((user) => (
                // Field agents (mobile screen) stand out from the back-office profiles.
                <button key={user.id} className={user.role === "agent" ? "" : "secondary"} onClick={() => onSignIn(user)}>
                  {user.name.split(" (")[0]} · {roleLabel(user.role, user.company_vertical)}
                </button>
              ))}
          </div>
        </section>
      ))}
      <section className="card">
        <header>
          <h2>{K("Plateforme SaaS")}</h2>
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
        <h2>{K("Parcours de démonstration (10 minutes)")}</h2>
      </header>
      <div className="body">
        <ol style={{ margin: 0, paddingLeft: 20 }} className="stack">
          <li>
            <strong>{K("Agent · Ravi")}</strong>{" "}
            {K(": démarrer « Nord - Grand-Baie », livrer la première commande, encaisser avec PayStation et jouer « Paiement réussi » dans le simulateur.")}
          </li>
          <li>
            {K("Livrer partiellement la deuxième commande (motif obligatoire), encaisser par carte et jouer « Paiement refusé », puis réessayer avec Juice.")}
          </li>
          <li>
            {K("Activer « Simuler hors ligne », faire une vente sur place, puis rétablir le réseau : l'action est synchronisée une seule fois.")}
          </li>
          <li>
            <strong>{K("Centrale · Kevin")}</strong>{" "}
            {K(": le tableau de bord s'actualise seul ; valider l'incident de livraison partielle ; préparer et charger « Centre - Curepipe ».")}
          </li>
          <li>
            <strong>{K("Finance · Sophie")}</strong>{" "}
            {K(": Rapprochement › générer un relevé avec anomalies et l'importer ; traiter les exceptions ; clôturer la journée ; voir les écritures ERP.")}
          </li>
          <li>
            <strong>{K("Administrateur · Anjali")}</strong>{" "}
            {K(": Paramètres › simuler une panne ERP, refaire une vente, puis reprendre les écritures en erreur depuis Finance › ERP.")}
          </li>
          <li>{K("Se connecter sur « Grossiste Démo Océan » : aucune donnée de la première entreprise n'y apparaît.")}</li>
        </ol>
      </div>
    </section>
  );
}

function ClubWalkthrough() {
  return (
    <section className="card">
      <header>
        <h2>{K("Parcours club de sport (8 minutes)")}</h2>
      </header>
      <div className="body">
        <ol style={{ margin: 0, paddingLeft: 20 }} className="stack">
          <li>
            <strong>{K("Comptabilité · Mélanie")}</strong>{" "}
            {K(": Recouvrement › qui doit quoi et depuis quand ; ouvrir Yannick Ramsamy, voir son relevé et ses relances.")}
          </li>
          <li>
            {K("« Envoyer le relevé et le lien de paiement », puis « Ouvrir la page du membre » : payer en ligne et jouer « Paiement réussi ». Le solde tombe à zéro.")}
          </li>
          <li>
            {K("Rapprochement › générer le relevé de démonstration et l'importer : les virements bien référencés sont affectés seuls ; affecter à la main le virement sans référence.")}
          </li>
          <li>
            {K("Relances › lancer les relances : un second lancement n'envoie rien de plus. Export comptable : écritures équilibrées, prêtes pour la comptabilité.")}
          </li>
          <li>
            <strong>{K("Accueil · Jean-Luc")}</strong>{" "}
            {K(": contrôler les badges B00001 (à jour), B00008 (en retard : entrée signalée, code de paiement), B00014 (suspendu).")}
          </li>
          <li>
            <strong>{K("Direction · Véronique")}</strong>{" "}
            {K(": Paramètres › refuser l'entrée au-delà de 90 jours de retard, puis recontrôler B00008.")}
          </li>
        </ol>
      </div>
    </section>
  );
}
