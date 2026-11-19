// Demo-mode banner shown above every screen, with the offline demo's reset button.
import { translate } from "../i18n/translate.ts";
import { apiRequest } from "../shared/api.ts";
import { useFeedback } from "../shared/Feedback.tsx";
import { useSession } from "../shared/session.ts";

export function DemoBanner() {
  const { session } = useSession();
  return session.demoMode ? (
    <div className="demo-banner noprint" role="note">
      <strong>{translate("MODE DÉMONSTRATION")}</strong>{" "}
      {translate("· données fictives, connecteurs simulés (PayStation, TPE, Juice, lien, banque, ERP, barrière). Aucun paiement réel.")}
      <OfflineReset />
    </div>
  ) : null;
}

/** Reloads the initial demo data: everything done in this browser is lost. */
export function OfflineReset() {
  const ui = useFeedback();
  const reset = async () => {
    const confirmed = await ui.ask({
      kind: "confirm",
      title: translate("Réinitialiser la démonstration ?"),
      text: translate("Les données fictives de départ sont rechargées. Tout ce qui a été fait dans ce navigateur est effacé."),
      confirm: translate("Réinitialiser"),
      danger: true,
    });
    if (confirmed) {
      await ui.run(async () => {
        await apiRequest("POST", "/api/offline/reset");
        location.hash = "#/";
        location.reload();
      });
    }
  };
  return (
    <span className="offline-note">
      {" "}
      <strong>{translate("Démo hors ligne · les données restent dans ce navigateur")}</strong>{" "}
      <button type="button" className="sm secondary" onClick={() => void reset()}>
        {translate("Réinitialiser")}
      </button>
    </span>
  );
}
