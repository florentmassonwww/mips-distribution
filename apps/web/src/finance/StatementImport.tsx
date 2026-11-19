import { translate } from "../i18n/translate.ts";
import { Field } from "../shared/Form.tsx";
import { Card } from "../shared/Layout.tsx";

interface StatementImportProps {
  filename: string;
  content: string;
  onContentChange: (content: string) => void;
  onFile: (file: File | undefined) => void;
  /** Present in demo mode only: generates a statement for the unsettled payments. */
  onDemo?: (withAnomalies: boolean) => void;
  onImport: () => void;
}

/** Bank statement import: from a CSV file, a generated demo statement, or pasted text. */
export function StatementImport({ filename, content, onContentChange, onFile, onDemo, onImport }: StatementImportProps) {
  return (
    <Card title={translate(`Importer un relevé`)}>
      <div className="stack">
        <div className="row">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => void onFile(event.target.files?.[0])}
            aria-label={translate(`Fichier de relevé`)}
            style={{ width: `auto` }}
          />
          {onDemo && (
            <>
              <button className="secondary" onClick={() => onDemo(false)}>
                {translate(`Générer un relevé de démonstration`)}
              </button>
              <button className="secondary" onClick={() => onDemo(true)}>
                {translate(`… avec anomalies (frais, montant, crédit inconnu)`)}
              </button>
            </>
          )}
        </div>
        <Field
          label={translate(`Contenu {0}`, filename ? `· ${filename}` : ``)}
          hint={translate(
            `Format de démonstration : date;reference;libelle;montant_brut;frais;montant_net. Le format réel dépend de la banque (à vérifier).`,
          )}
        >
          <textarea
            className="mono"
            value={content}
            onChange={(event) => onContentChange(event.target.value)}
            rows={6}
            placeholder="date;reference;libelle;montant_brut;frais;montant_net"
          />
        </Field>
        <div>
          <button disabled={content.trim().length < 10} onClick={onImport}>
            {translate(`Importer et rapprocher`)}
          </button>
        </div>
      </div>
    </Card>
  );
}
