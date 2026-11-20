// Company administration: payment methods, settlement, club rules and ERP settings.
import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { translate } from "../i18n/translate.ts";
import { apiRequest } from "../shared/api.ts";
import { Badge } from "../shared/Badge.tsx";
import { useFeedback } from "../shared/Feedback.tsx";
import { Field } from "../shared/Form.tsx";
import { formatDate, formatMoneyInput, parseMoney } from "../shared/format.ts";
import { useApi } from "../shared/hooks.ts";
import { PAYMENT_CHANNEL } from "../shared/labels.ts";
import { Card, PageHeader } from "../shared/Layout.tsx";
import { QueryView } from "../shared/QueryView.tsx";
import { hasModule, inCatalogueOrder, isClubOnly, MODULE_LABEL } from "../shared/modules.ts";
import { useSession } from "../shared/session.ts";

interface PaymentMethodSettings {
  enabled: boolean;
  /** Provider fee in basis points; null while it is to be agreed with the provider. */
  feeBps: number | null;
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
    /** Enabled modules, in catalogue order. */
    modules: string[];
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

/** Fee typed in basis points: empty means "to be agreed" (null); otherwise a whole number of 0 to 1000. */
const parseFeeBps = (value: string): number | null =>
  value.trim() === "" ? null : Math.max(0, Math.min(1000, Math.trunc(Number(value) || 0)));

const CAPABILITY_LABELS: Record<string, string> = {
  onSite: translate("sur place"),
  remote: translate("à distance"),
  refund: translate("remboursement"),
  cancel: translate("annulation garantie"),
  statusQuery: translate("interrogation de statut"),
};

export function SettingsPage() {
  const ui = useFeedback();
  const settingsQuery = useApi<SettingsResponse>("/api/admin/settings");
  const connectorsQuery = useApi<Connectors>("/api/connectors");
  const modules = useSession().session.user?.modules ?? [];
  const hasClub = hasModule(modules, "club");
  // A club alone collects through payment links only; with Distribution, every method is shown.
  const linksOnly = isClubOnly(modules);
  const [amounts, setAmounts] = useState<AmountDrafts | null>(null);
  // The form is initialised once from the server, then edited locally until saved.
  useEffect(() => {
    if (settingsQuery.data && !amounts) {
      setAmounts({
        reminders: formatMoneyInput(settingsQuery.data.settings.club.reminders.minAmountMinor),
        gate: formatMoneyInput(settingsQuery.data.settings.club.gate.minAmountMinor),
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
            reminders: { levels: current.club.reminders.levels, minAmountMinor: parseMoney(drafts.reminders) ?? 0 },
            gate: { ...current.club.gate, minAmountMinor: parseMoney(drafts.gate) ?? 0 },
          }
        : undefined;
      // Club rules are sent by companies with the Club module only; the server merges them into the stored settings.
      await apiRequest("PUT", "/api/admin/settings", { payments: current.payments, erp: current.erp, ...(hasClub ? { club } : {}) });
      await settingsQuery.reload();
    }, translate("Paramètres enregistrés."));

  return (
    <>
      <PageHeader title={translate("Paramètres")} sub={translate("Moyens de paiement, compte de règlement et ERP de l'entreprise.")} />
      <QueryView q={settingsQuery}>
        {(data) =>
          settings ? (
            <div className="stack">
              <SubscriptionCard subscription={data.subscription} />
              <PaymentMethodsCard settings={settings} setSettings={setSettings} connectors={connectorsQuery.data} linksOnly={linksOnly} />
              <SettlementCard settings={settings} setSettings={setSettings} />
              {hasClub && amounts && (
                <ClubRulesCard settings={settings} setSettings={setSettings} amounts={amounts} setAmounts={setAmounts} />
              )}
              <ErpCard settings={settings} setSettings={setSettings} />
              <div>
                <button onClick={() => save(settings, amounts)}>{translate("Enregistrer les paramètres")}</button>
              </div>
              <QueryView q={connectorsQuery}>{(connectors) => <ConnectorsCard connectors={connectors} linksOnly={linksOnly} gate={hasClub} />}</QueryView>
            </div>
          ) : null
        }
      </QueryView>
    </>
  );
}

function SubscriptionCard({ subscription }: { subscription: SettingsResponse["subscription"] }) {
  return (
    <Card title={translate("Abonnement (démonstration)")}>
      <dl className="kv">
        <dt>{translate("Entreprise")}</dt>
        <dd>
          {subscription.name} {translate("· devise")} {subscription.currency}
        </dd>
        <dt>{translate("Formule")}</dt>
        <dd>
          <Badge kind="info">{translate(subscription.plan)}</Badge> {translate("· état :")} {translate(subscription.subscription_status)}{" "}
          {translate("· échéance :")} {formatDate(subscription.subscription_renews_at)}
        </dd>
        <dt>{translate("Modules")}</dt>
        <dd>
          {subscription.modules.length === 0 ? (
            <span className="muted">{translate("Aucun module activé : seules l'administration et l'audit restent accessibles.")}</span>
          ) : (
            inCatalogueOrder(subscription.modules).map((module, index) => (
              <span key={module}>
                {index > 0 && " "}
                <Badge kind="info">{MODULE_LABEL[module]}</Badge>
              </span>
            ))
          )}{" "}
          <span className="small muted">{translate("· tarif à convenir · activés depuis l'espace plateforme")}</span>
        </dd>
        <dt>{translate("Facturation")}</dt>
        <dd className="muted">{translate("Fictive : aucun prix ni prélèvement n'est défini. La formule se modifie depuis l'espace plateforme.")}</dd>
      </dl>
    </Card>
  );
}

interface PaymentMethodsCardProps {
  settings: CompanySettings;
  setSettings: SetSettings;
  connectors: Connectors | null;
  /** Only the payment link is offered (a club without the Distribution module). */
  linksOnly: boolean;
}

function PaymentMethodsCard({ settings, setSettings, connectors, linksOnly }: PaymentMethodsCardProps) {
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
  const methods = Object.entries(settings.payments.methods).filter(([method]) => !linksOnly || method === "link");
  return (
    <Card title={translate("Moyens de paiement")} flush>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{translate("Moyen")}</th>
              <th>{translate("Activé")}</th>
              <th>{translate("Frais attendus (points de base)")}</th>
              <th>{translate("Identifiant marchand")}</th>
              <th>{translate("Connecteur")}</th>
            </tr>
          </thead>
          <tbody>
            {methods.map(([method, methodSettings]) => {
              const connector = connectors?.payments.find((candidate) => candidate.method === method);
              const label = PAYMENT_CHANNEL[method];
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
                      aria-label={translate("Activer {0}", label)}
                      style={{ width: 20, height: 20 }}
                    />
                  </td>
                  <td>
                    {/* Empty: the fee is to be agreed with the provider (null); no figure is assumed. */}
                    <input
                      type="number"
                      min={0}
                      max={1000}
                      value={methodSettings.feeBps ?? ""}
                      placeholder={translate("à convenir")}
                      onChange={(event) => updateMethod(method, { feeBps: parseFeeBps(event.target.value) })}
                      aria-label={translate("Frais {0}", label)}
                      aria-describedby={`fee-${method}`}
                      style={{ width: 110 }}
                    />{" "}
                    <span className="small muted" id={`fee-${method}`}>
                      {methodSettings.feeBps === null ? translate("à convenir") : `= ${(methodSettings.feeBps / 100).toFixed(2)} %`}
                    </span>
                  </td>
                  <td>
                    <input
                      type="text"
                      value={methodSettings.merchantRef}
                      onChange={(event) => updateMethod(method, { merchantRef: event.target.value })}
                      aria-label={translate("Identifiant marchand {0}", label)}
                    />
                  </td>
                  <td>
                    {connector && (
                      <>
                        <Badge kind="warn">{connector.demo ? translate("Simulé") : translate("Réel")}</Badge>
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
    <Card title={translate("Règlement et délais")}>
      <div className="grid g2">
        <Field
          label={translate("Compte de règlement (libellé)")}
          hint={translate(
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
          label={translate("Durée de validité d'une tentative (minutes)")}
          hint={translate("Passé ce délai sans réponse du prestataire, la tentative passe « à vérifier », jamais « échouée ».")}
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
    <Card title={translate("Club : échéances, relances et barrière")}>
      <div className="stack">
        <div className="grid g4">
          <Field
            label={translate("Préfixe des références")}
            hint={translate("Fixé à la création du club : les références déjà diffusées aux membres doivent rester valables.")}
          >
            <input type="text" value={settings.club.refPrefix} disabled />
          </Field>
          <Field label={translate("Délai de paiement (jours)")}>
            <input type="number" min={0} max={120} value={settings.club.dueDays} onChange={(event) => setDays("dueDays", event.target.value)} />
          </Field>
          <Field label={translate("Montant dû minimal pour relancer (Rs)")}>
            <input
              type="text"
              inputMode="decimal"
              value={amounts.reminders}
              onChange={(event) => setAmounts({ ...amounts, reminders: event.target.value })}
            />
          </Field>
          <div />
          {[0, 1, 2].map((level) => (
            <Field key={level} label={translate("Relance de niveau {0} après (jours de retard)", level + 1)}>
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
          <Field label={translate("Barrière : signaler au-delà de (jours)")}>
            <input
              type="number"
              min={0}
              max={365}
              value={settings.club.gate.flagAfterDays}
              onChange={(event) => setDays("flagAfterDays", event.target.value)}
            />
          </Field>
          <Field
            label={translate("Barrière : refuser au-delà de (jours)")}
            hint={translate("0 : la barrière ne refuse jamais pour une dette, elle signale seulement.")}
          >
            <input
              type="number"
              min={0}
              max={365}
              value={settings.club.gate.denyAfterDays}
              onChange={(event) => setDays("denyAfterDays", event.target.value)}
            />
          </Field>
          <Field label={translate("Barrière : montant en retard minimal (Rs)")}>
            <input type="text" inputMode="decimal" value={amounts.gate} onChange={(event) => setAmounts({ ...amounts, gate: event.target.value })} />
          </Field>
        </div>
        <div className="small muted">
          {translate(
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
          <Field label={translate("Système")}>
            <input type="text" value={settings.erp.system} onChange={(event) => setErp({ system: event.target.value })} />
          </Field>
          <Field label={translate("Adresse de l'interface")}>
            <input type="text" value={settings.erp.endpoint} onChange={(event) => setErp({ endpoint: event.target.value })} />
          </Field>
          <Field
            label={translate("Référence du secret")}
            hint={translate("Nom de la variable d'environnement qui porte la clé. La clé elle-même n'est jamais saisie ni stockée ici.")}
          >
            {/* Environment variable names are upper case. */}
            <input type="text" value={settings.erp.secretRef} onChange={(event) => setErp({ secretRef: event.target.value.toUpperCase() })} />
          </Field>
        </div>
        <label className="check">
          <input type="checkbox" checked={settings.erp.autoSync} onChange={(event) => setErp({ autoSync: event.target.checked })} />
          <span>{translate("Synchroniser automatiquement après chaque événement")}</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={settings.erp.simulateFailure} onChange={(event) => setErp({ simulateFailure: event.target.checked })} />
          <span>
            {translate("Démonstration : simuler une panne de l'ERP (les écritures passent « en erreur » et attendent leur reprise)")}
          </span>
        </label>
      </div>
    </Card>
  );
}

function ConnectorsCard({ connectors, linksOnly, gate }: { connectors: Connectors; linksOnly: boolean; gate: boolean }) {
  // A club uses payment links, the bank, the ERP and the gate; a distributor every payment method.
  const shown = [
    ...connectors.payments.filter((connector) => !linksOnly || connector.method === "link"),
    connectors.bank,
    connectors.erp,
    ...(gate ? [connectors.access] : []),
  ];
  return (
    <Card title={translate("Connecteurs : capacités à vérifier auprès de chaque prestataire")}>
      <div className="notice warn" style={{ marginBottom: 12 }}>
        {translate("Tous les connecteurs sont des simulateurs. Aucune API réelle, certification ou garantie de règlement n'est supposée.")}
      </div>
      <div className="grid g2">
        {shown.map((connector) => (
          <div key={connector.label}>
            <h3>{translate(connector.label)}</h3>
            <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
              {connector.toVerify.map((item) => (
                <li key={item}>{translate(item)}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}
