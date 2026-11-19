// Company administration: payment methods, settlement, club rules and ERP settings.
import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { K } from "../legacy/i18n.js";
import {
  $ as Field,
  J as api,
  Q as Card,
  R_ as parseAmount,
  X_ as METHOD_LABELS,
  Y as useQuery,
  Z as formatDate,
  _v as useUi,
  cv as Badge,
  fv as PageHead,
  pv as Loaded,
  xv as useSession,
  z_ as formatAmountInput,
} from "../legacy/shared.js";

interface PaymentMethodSettings {
  enabled: boolean;
  feeBps: number;
  merchantRef: string;
}

interface ClubSettings {
  refPrefix: string;
  dueDays: number;
  reminders: { levels: number[]; minAmountMinor: number };
  gate: { flagAfterDays: number; denyAfterDays: number; minAmountMinor: number };
}

interface CompanySettings {
  payments: {
    methods: Record<string, PaymentMethodSettings>;
    settlementAccountLabel: string;
    attemptMinutes: number;
  };
  erp: {
    system: string;
    endpoint: string;
    secretRef: string;
    autoSync: boolean;
    simulateFailure: boolean;
  };
  club: ClubSettings;
}

/** GET /api/admin/settings */
interface SettingsResponse {
  settings: CompanySettings;
  subscription: {
    name: string;
    currency: string;
    plan: string;
    subscription_status: string;
    subscription_renews_at: string | null;
  };
}

interface Connector {
  label: string;
  demo: boolean;
  toVerify: string[];
}

interface PaymentConnector extends Connector {
  method: string;
  capabilities?: Record<string, boolean>;
}

/** GET /api/connectors */
interface Connectors {
  payments: PaymentConnector[];
  bank: Connector;
  erp: Connector;
  access: Connector;
}

/** Club amounts are edited as typed text (rupees) and parsed on save. */
interface AmountDrafts {
  reminders: string;
  gate: string;
}

/** Club day-count fields: a reminder level (0, 1, 2) or a named delay. */
type ClubDayField = number | "dueDays" | "flagAfterDays" | "denyAfterDays";

type SetSettings = Dispatch<SetStateAction<CompanySettings | null>>;

const CAPABILITY_LABELS: Record<string, string> = {
  onSite: K("sur place"),
  remote: K("à distance"),
  refund: K("remboursement"),
  cancel: K("annulation garantie"),
  statusQuery: K("interrogation de statut"),
};

export function SettingsPage() {
  const ui = useUi();
  const settingsQuery = useQuery<SettingsResponse>("/api/admin/settings");
  const connectorsQuery = useQuery<Connectors>("/api/connectors");
  const isClub = useSession().session.user?.vertical === "club";
  const [amounts, setAmounts] = useState<AmountDrafts | null>(null);
  // The form is initialised once from the server, then edited locally until saved.
  useEffect(() => {
    if (settingsQuery.data && !amounts) {
      setAmounts({
        reminders: formatAmountInput(settingsQuery.data.settings.club.reminders.minAmountMinor),
        gate: formatAmountInput(settingsQuery.data.settings.club.gate.minAmountMinor),
      });
    }
  }, [settingsQuery.data, amounts]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  useEffect(() => {
    if (settingsQuery.data && !settings) setSettings(settingsQuery.data.settings);
  }, [settingsQuery.data, settings]);

  const save = (current: CompanySettings, drafts: AmountDrafts | null) =>
    ui.run(async () => {
      const club = drafts
        ? {
            dueDays: current.club.dueDays,
            reminders: { levels: current.club.reminders.levels, minAmountMinor: parseAmount(drafts.reminders) ?? 0 },
            gate: { ...current.club.gate, minAmountMinor: parseAmount(drafts.gate) ?? 0 },
          }
        : undefined;
      // Club rules are sent by club companies only; the server merges them into the stored settings.
      await api("PUT", "/api/admin/settings", { payments: current.payments, erp: current.erp, ...(isClub ? { club } : {}) });
      await settingsQuery.reload();
    }, K("Paramètres enregistrés."));

  return (
    <>
      <PageHead title={K("Paramètres")} sub={K("Moyens de paiement, compte de règlement et ERP de l'entreprise.")} />
      <Loaded q={settingsQuery}>
        {(data) =>
          settings ? (
            <div className="stack">
              <SubscriptionCard subscription={data.subscription} />
              <PaymentMethodsCard settings={settings} setSettings={setSettings} connectors={connectorsQuery.data} isClub={isClub} />
              <SettlementCard settings={settings} setSettings={setSettings} />
              {isClub && amounts && (
                <ClubRulesCard settings={settings} setSettings={setSettings} amounts={amounts} setAmounts={setAmounts} />
              )}
              <ErpCard settings={settings} setSettings={setSettings} />
              <div>
                <button onClick={() => save(settings, amounts)}>{K("Enregistrer les paramètres")}</button>
              </div>
              <Loaded q={connectorsQuery}>{(connectors) => <ConnectorsCard connectors={connectors} isClub={isClub} />}</Loaded>
            </div>
          ) : null
        }
      </Loaded>
    </>
  );
}

function SubscriptionCard({ subscription }: { subscription: SettingsResponse["subscription"] }) {
  return (
    <Card title={K("Abonnement (démonstration)")}>
      <dl className="kv">
        <dt>{K("Entreprise")}</dt>
        <dd>
          {subscription.name} {K("· devise")} {subscription.currency}
        </dd>
        <dt>{K("Formule")}</dt>
        <dd>
          <Badge kind="info">{K(subscription.plan)}</Badge> {K("· état :")} {K(subscription.subscription_status)}{" "}
          {K("· échéance :")} {formatDate(subscription.subscription_renews_at)}
        </dd>
        <dt>{K("Facturation")}</dt>
        <dd className="muted">{K("Fictive : aucun prix ni prélèvement n'est défini. La formule se modifie depuis l'espace plateforme.")}</dd>
      </dl>
    </Card>
  );
}

interface PaymentMethodsCardProps {
  settings: CompanySettings;
  setSettings: SetSettings;
  connectors: Connectors | null;
  isClub: boolean;
}

function PaymentMethodsCard({ settings, setSettings, connectors, isClub }: PaymentMethodsCardProps) {
  const updateMethod = (method: string, patch: Partial<PaymentMethodSettings>) =>
    setSettings((current) => {
      if (!current) return current;
      const methodSettings = current.payments.methods[method];
      return {
        ...current,
        payments: { ...current.payments, methods: { ...current.payments.methods, [method]: { ...methodSettings, ...patch } as PaymentMethodSettings } },
      };
    });
  // A club only collects through payment links.
  const methods = Object.entries(settings.payments.methods).filter(([method]) => !isClub || method === "link");
  return (
    <Card title={K("Moyens de paiement")} flush>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{K("Moyen")}</th>
              <th>{K("Activé")}</th>
              <th>{K("Frais attendus (points de base)")}</th>
              <th>{K("Identifiant marchand")}</th>
              <th>{K("Connecteur")}</th>
            </tr>
          </thead>
          <tbody>
            {methods.map(([method, methodSettings]) => {
              const connector = connectors?.payments.find((candidate) => candidate.method === method);
              const label = METHOD_LABELS[method];
              return (
                <tr key={method}>
                  <td>
                    <strong>{label}</strong>
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={methodSettings.enabled}
                      onChange={(event) => updateMethod(method, { enabled: event.target.checked })}
                      aria-label={K("Activer {0}", label)}
                      style={{ width: 20, height: 20 }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      max={1000}
                      value={methodSettings.feeBps}
                      onChange={(event) => updateMethod(method, { feeBps: Math.trunc(Number(event.target.value) || 0) })}
                      aria-label={K("Frais {0}", label)}
                      style={{ width: 110 }}
                    />{" "}
                    <span className="small muted">
                      = {(methodSettings.feeBps / 100).toFixed(2)} %
                    </span>
                  </td>
                  <td>
                    <input
                      type="text"
                      value={methodSettings.merchantRef}
                      onChange={(event) => updateMethod(method, { merchantRef: event.target.value })}
                      aria-label={K("Identifiant marchand {0}", label)}
                    />
                  </td>
                  <td>
                    {connector && (
                      <>
                        <Badge kind="warn">{connector.demo ? K("Simulé") : K("Réel")}</Badge>
                        <div className="small muted">
                          {Object.entries(connector.capabilities ?? {})
                            .filter(([, supported]) => supported)
                            .map(([capability]) => CAPABILITY_LABELS[capability])
                            .join(" · ")}
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SettlementCard({ settings, setSettings }: { settings: CompanySettings; setSettings: SetSettings }) {
  return (
    <Card title={K("Règlement et délais")}>
      <div className="grid g2">
        <Field
          label={K("Compte de règlement (libellé)")}
          hint={K(
            "Le règlement effectif sur ce compte dépend du circuit validé avec chaque prestataire : aucune garantie n'est donnée par l'application.",
          )}
        >
          <input
            type="text"
            value={settings.payments.settlementAccountLabel}
            onChange={(event) => setSettings({ ...settings, payments: { ...settings.payments, settlementAccountLabel: event.target.value } })}
          />
        </Field>
        <Field
          label={K("Durée de validité d'une tentative (minutes)")}
          hint={K("Passé ce délai sans réponse du prestataire, la tentative passe « à vérifier », jamais « échouée ».")}
        >
          <input
            type="number"
            min={1}
            max={60}
            value={settings.payments.attemptMinutes}
            onChange={(event) =>
              setSettings({ ...settings, payments: { ...settings.payments, attemptMinutes: Math.trunc(Number(event.target.value) || 1) } })
            }
          />
        </Field>
      </div>
    </Card>
  );
}

interface ClubRulesCardProps {
  settings: CompanySettings;
  setSettings: SetSettings;
  amounts: AmountDrafts;
  setAmounts: (amounts: AmountDrafts) => void;
}

function ClubRulesCard({ settings, setSettings, amounts, setAmounts }: ClubRulesCardProps) {
  // Day counts are whole, non-negative numbers; an empty or invalid entry becomes 0.
  const setDays = (field: ClubDayField, value: string) =>
    setSettings((current) => {
      if (!current) return current;
      const days = Math.max(0, Math.trunc(Number(value) || 0));
      const club = current.club;
      if (field === "dueDays") return { ...current, club: { ...club, dueDays: days } };
      if (field === "flagAfterDays" || field === "denyAfterDays") return { ...current, club: { ...club, gate: { ...club.gate, [field]: days } } };
      const levels = [...club.reminders.levels];
      levels[field] = days;
      return { ...current, club: { ...club, reminders: { ...club.reminders, levels } } };
    });
  return (
    <Card title={K("Club : échéances, relances et barrière")}>
      <div className="stack">
        <div className="grid g4">
          <Field
            label={K("Préfixe des références")}
            hint={K("Fixé à la création du club : les références déjà diffusées aux membres doivent rester valables.")}
          >
            <input type="text" value={settings.club.refPrefix} disabled />
          </Field>
          <Field label={K("Délai de paiement (jours)")}>
            <input type="number" min={0} max={120} value={settings.club.dueDays} onChange={(event) => setDays("dueDays", event.target.value)} />
          </Field>
          <Field label={K("Montant dû minimal pour relancer (Rs)")}>
            <input
              type="text"
              inputMode="decimal"
              value={amounts.reminders}
              onChange={(event) => setAmounts({ ...amounts, reminders: event.target.value })}
            />
          </Field>
          <div />
          {[0, 1, 2].map((level) => (
            <Field key={level} label={K("Relance de niveau {0} après (jours de retard)", level + 1)}>
              <input
                type="number"
                min={1}
                max={365}
                value={settings.club.reminders.levels[level]}
                onChange={(event) => setDays(level, event.target.value)}
              />
            </Field>
          ))}
          <div />
          <Field label={K("Barrière : signaler au-delà de (jours)")}>
            <input
              type="number"
              min={0}
              max={365}
              value={settings.club.gate.flagAfterDays}
              onChange={(event) => setDays("flagAfterDays", event.target.value)}
            />
          </Field>
          <Field
            label={K("Barrière : refuser au-delà de (jours)")}
            hint={K("0 : la barrière ne refuse jamais pour une dette, elle signale seulement.")}
          >
            <input
              type="number"
              min={0}
              max={365}
              value={settings.club.gate.denyAfterDays}
              onChange={(event) => setDays("denyAfterDays", event.target.value)}
            />
          </Field>
          <Field label={K("Barrière : montant en retard minimal (Rs)")}>
            <input type="text" inputMode="decimal" value={amounts.gate} onChange={(event) => setAmounts({ ...amounts, gate: event.target.value })} />
          </Field>
        </div>
        <div className="small muted">
          {K(
            "Un membre suspendu ou résilié, ou un badge inconnu, est toujours refusé. Les comptes de l'export comptable sont des valeurs de démonstration, à remplacer par le plan comptable du club.",
          )}
        </div>
      </div>
    </Card>
  );
}

function ErpCard({ settings, setSettings }: { settings: CompanySettings; setSettings: SetSettings }) {
  const setErp = (patch: Partial<CompanySettings["erp"]>) => setSettings({ ...settings, erp: { ...settings.erp, ...patch } });
  return (
    <Card title="ERP">
      <div className="stack">
        <div className="grid g3">
          <Field label={K("Système")}>
            <input type="text" value={settings.erp.system} onChange={(event) => setErp({ system: event.target.value })} />
          </Field>
          <Field label={K("Adresse de l'interface")}>
            <input type="text" value={settings.erp.endpoint} onChange={(event) => setErp({ endpoint: event.target.value })} />
          </Field>
          <Field
            label={K("Référence du secret")}
            hint={K("Nom de la variable d'environnement qui porte la clé. La clé elle-même n'est jamais saisie ni stockée ici.")}
          >
            {/* Environment variable names are upper case. */}
            <input type="text" value={settings.erp.secretRef} onChange={(event) => setErp({ secretRef: event.target.value.toUpperCase() })} />
          </Field>
        </div>
        <label className="check">
          <input type="checkbox" checked={settings.erp.autoSync} onChange={(event) => setErp({ autoSync: event.target.checked })} />
          <span>{K("Synchroniser automatiquement après chaque événement")}</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={settings.erp.simulateFailure} onChange={(event) => setErp({ simulateFailure: event.target.checked })} />
          <span>
            {K("Démonstration : simuler une panne de l'ERP (les écritures passent « en erreur » et attendent leur reprise)")}
          </span>
        </label>
      </div>
    </Card>
  );
}

function ConnectorsCard({ connectors, isClub }: { connectors: Connectors; isClub: boolean }) {
  // A club uses payment links, the bank, the ERP and the gate; a distributor every payment method.
  const shown = [
    ...connectors.payments.filter((connector) => !isClub || connector.method === "link"),
    connectors.bank,
    connectors.erp,
    ...(isClub ? [connectors.access] : []),
  ];
  return (
    <Card title={K("Connecteurs : capacités à vérifier auprès de chaque prestataire")}>
      <div className="notice warn" style={{ marginBottom: 12 }}>
        {K("Tous les connecteurs sont des simulateurs. Aucune API réelle, certification ou garantie de règlement n'est supposée.")}
      </div>
      <div className="grid g2">
        {shown.map((connector) => (
          <div key={connector.label}>
            <h3>{K(connector.label)}</h3>
            <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
              {connector.toVerify.map((item) => (
                <li key={item}>{K(item)}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}
