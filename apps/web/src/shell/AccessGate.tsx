// Access code asked before anything else when the server is started with ACCESS_CODE.
import { useState } from "react";
import { translate } from "../i18n/translate.ts";
import { apiRequest } from "../shared/api.ts";
import { useFeedback } from "../shared/Feedback.tsx";
import { Field } from "../shared/Form.tsx";
import { LanguageToggle } from "../shared/LanguageToggle.tsx";

export function AccessGate({ onOk }: { onOk: () => void }) {
  const ui = useFeedback();
  const [code, setCode] = useState("");
  return (
    <div className="mobile stack">
      <div className="mobile-head">
        <div className="row spread">
          <h1>MIPS Distribution</h1>
          <LanguageToggle />
        </div>
        <div className="muted">{translate("Démonstration à accès réservé")}</div>
      </div>
      <form
        className="card"
        onSubmit={(event) => {
          event.preventDefault();
          void ui.run(async () => {
            await apiRequest("POST", "/api/gate", { code });
            onOk();
          });
        }}
      >
        <div className="body stack">
          <Field label={translate("Code d'accès")}>
            <input type="password" value={code} onChange={(event) => setCode(event.target.value)} autoFocus autoComplete="off" />
          </Field>
          <button className="big" disabled={!code}>
            {translate("Entrer")}
          </button>
        </div>
      </form>
    </div>
  );
}
