// Demo-mode banner shown above every screen. The demo runs on a server shared by every visitor;
// only the platform administrator resets its data (Platform area).
import { translate } from "../i18n/translate.ts";
import { useSession } from "../shared/session.ts";

export function DemoBanner() {
  const { session } = useSession();
  return session.demoMode ? (
    <div className="demo-banner noprint" role="note">
      <strong>{translate("MODE DÉMONSTRATION")}</strong>{" "}
      {translate("· données fictives, connecteurs simulés (PayStation, TPE, Juice, lien, banque, ERP, barrière). Aucun paiement réel.")}
      <span className="offline-note">
        <strong>{translate("Serveur de démonstration partagé · les données sont communes à tous les visiteurs")}</strong>
      </span>
    </div>
  ) : null;
}
