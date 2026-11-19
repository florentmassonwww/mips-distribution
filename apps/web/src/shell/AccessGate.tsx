// Access code asked before anything else when the server is started with ACCESS_CODE.
import { useState } from "react";
import { K } from "../legacy/i18n.js";
import { $ as Field, J as api, _v as useUi, yv as LanguageToggle } from "../legacy/shared.js";

export function AccessGate({ onOk }: { onOk: () => void }) {
  const ui = useUi();
  const [code, setCode] = useState("");
  return (
    <div className="mobile stack">
      <div className="mobile-head">
        <div className="row spread">
          <h1>MIPS Distribution</h1>
          <LanguageToggle />
        </div>
        <div className="muted">{K("Démonstration à accès réservé")}</div>
      </div>
      <form
        className="card"
        onSubmit={(event) => {
          event.preventDefault();
          void ui.run(async () => {
            await api("POST", "/api/gate", { code });
            onOk();
          });
        }}
      >
        <div className="body stack">
          <Field label={K("Code d'accès")}>
            <input type="password" value={code} onChange={(event) => setCode(event.target.value)} autoFocus autoComplete="off" />
          </Field>
          <button className="big" disabled={!code}>
            {K("Entrer")}
          </button>
        </div>
      </form>
    </div>
  );
}
