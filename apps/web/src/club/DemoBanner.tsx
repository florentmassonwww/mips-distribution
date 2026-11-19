// Demo-mode banner shown above every screen, with the offline demo's reset button.
import { api, t, useSession, useUi } from "./legacy.ts";

export function DemoBanner() {
  const { session } = useSession();
  return session.demoMode ? (
    <div className="demo-banner noprint" role="note">
      <strong>{t("MODE DÉMONSTRATION")}</strong>{" "}
      {t("· données fictives, connecteurs simulés (PayStation, TPE, Juice, lien, banque, ERP, barrière). Aucun paiement réel.")}
      <OfflineReset />
    </div>
  ) : null;
}

/** Reloads the initial demo data: everything done in this browser is lost. */
export function OfflineReset() {
  const ui = useUi();
  const reset = async () => {
    const confirmed = await ui.ask({
      kind: "confirm",
      title: t("Réinitialiser la démonstration ?"),
      text: t("Les données fictives de départ sont rechargées. Tout ce qui a été fait dans ce navigateur est effacé."),
      confirm: t("Réinitialiser"),
      danger: true,
    });
    if (confirmed) {
      await ui.run(async () => {
        await api("POST", "/api/offline/reset");
        location.hash = "#/";
        location.reload();
      });
    }
  };
  return (
    <span className="offline-note">
      {" "}
      <strong>{t("Démo hors ligne · les données restent dans ce navigateur")}</strong>{" "}
      <button type="button" className="sm secondary" onClick={() => void reset()}>
        {t("Réinitialiser")}
      </button>
    </span>
  );
}
