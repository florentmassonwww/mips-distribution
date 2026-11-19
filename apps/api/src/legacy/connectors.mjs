// GENERATED (step 1a, stage 2): v0.1.0 "connectors" code extracted from reference/v0.1.0/app.js.
// Rewritten as readable TypeScript in the following commits.
/* eslint-disable */
import { A, N, P, _e, k } from "./core.mjs";
import { Bd, Vd } from "./distribution.mjs";
import { me } from "./lib.mjs";

var Hd = [{
    method: `paystation`,
    label: `PayStation`,
    prefix: `PS`,
    capabilities: {
      onSite: !0,
      remote: !1,
      refund: !0,
      cancel: !0,
      statusQuery: !0
    },
    toVerify: [`Mode d'intégration depuis une application mobile tierce (API, SDK ou appel d'application) et parcours exact présenté au client.`, `Format, signature et politique de renvoi des notifications de paiement ; existence d'une interrogation de statut serveur à serveur.`, `Prise en charge d'une clé d'idempotence à l'initiation, de l'annulation d'une demande en attente et du remboursement partiel.`, `Référence reprise sur le relevé bancaire, délai et compte de règlement (compte MCB du distributeur : à confirmer par circuit).`],
    present: (e, t) => ({
      kind: `qr`,
      value: `DEMO-PAYSTATION:${t}:${e.amountMinor}`,
      instructions: `Présentez ce code au client. Il valide le paiement sur son téléphone.`
    })
  }, {
    method: `card_tpe`,
    label: `Carte bancaire (TPE)`,
    prefix: `TPE`,
    capabilities: {
      onSite: !0,
      remote: !1,
      refund: !0,
      cancel: !0,
      statusQuery: !0
    },
    toVerify: [`Modèles de TPE compatibles et mode de liaison avec le téléphone de l'agent (Bluetooth, réseau, cloud) ; certification requise le cas échéant.`, `Transmission du montant et de la référence de facture au terminal, et retour du résultat sans ressaisie.`, `Périmètre PCI DSS : l'application ne doit jamais voir, saisir ni stocker de numéro de carte ; seule la référence d'autorisation est conservée.`, `Annulation avant télécollecte, remboursement, et référence reprise sur le relevé d'acquisition.`],
    present: (e, t) => ({
      kind: `terminal`,
      value: t,
      instructions: `Montant envoyé au terminal. Le client présente ou insère sa carte sur le TPE ; aucune donnée de carte n'est saisie dans l'application.`
    })
  }, {
    method: `juice`,
    label: `Juice`,
    prefix: `JCE`,
    capabilities: {
      onSite: !0,
      remote: !0,
      refund: !0,
      cancel: !1,
      statusQuery: !0
    },
    toVerify: [`Disponibilité d'une interface marchand permettant d'initier une demande de paiement et d'en recevoir la confirmation (API, QR dynamique ou autre).`, `Notification serveur signée ou interrogation de statut : sans l'une des deux, le paiement reste « à vérifier » jusqu'au relevé.`, `Possibilité d'annuler une demande en attente (supposée indisponible dans l'adaptateur de démonstration).`, `Référence de transaction visible côté client et sur le relevé, plafonds et délai de règlement.`],
    present: (e, t) => ({
      kind: `app_request`,
      value: `DEMO-JUICE:${t}:${e.amountMinor}`,
      instructions: `Le client scanne ce code ou valide la demande dans son application. Une capture d'écran ne vaut pas confirmation.`
    })
  }, {
    method: `link`,
    label: `Paiement par lien`,
    prefix: `LNK`,
    capabilities: {
      onSite: !0,
      remote: !0,
      refund: !0,
      cancel: !0,
      statusQuery: !0
    },
    toVerify: [`Prestataire de la page de paiement hébergée et moyens acceptés sur cette page.`, `Durée de validité du lien, usage unique, et annulation d'un lien non payé.`, `Notification signée à la confirmation et référence reprise sur le relevé bancaire.`],
    present: e => ({
      kind: `url`,
      value: e.payUrl ?? ``,
      instructions: `Partagez ce lien au client ou présentez le code sur place. Le paiement se fait sur la page hébergée du prestataire.`
    })
  }],
  Ud = class {
    demo = !0;
    method;
    label;
    capabilities;
    toVerify;
    db;
    spec;
    secret;
    tolerance;
    constructor(e, t, n, r) {
      this.db = e, this.spec = t, this.secret = n, this.tolerance = r, this.method = t.method, this.label = t.label, this.capabilities = t.capabilities, this.toVerify = t.toVerify;
    }
    tx(e) {
      return k(this.db, `SELECT * FROM demo_provider_tx WHERE provider_ref = ? AND method = ?`, e, this.method);
    }
    async initiate(e) {
      let t = `${this.spec.prefix}-DEMO-${me(`sha256`).update(`${e.companyId}:${e.idempotencyKey}`).digest(`hex`).slice(0, 10).toUpperCase()}`;
      return A(this.db, `INSERT OR IGNORE INTO demo_provider_tx (provider_ref, method, amount_minor, currency, status, created_at) VALUES (?,?,?,?,'pending',?)`, t, this.method, e.amountMinor, e.currency, N(new Date())), {
        providerRef: t,
        presentation: this.spec.present(e, t)
      };
    }
    async queryStatus(e) {
      return this.tx(e)?.status ?? `unknown`;
    }
    async cancel(e) {
      return this.capabilities.cancel ? A(this.db, `UPDATE demo_provider_tx SET status = 'failed' WHERE provider_ref = ? AND method = ? AND status = 'pending'`, e, this.method) === 1 : !1;
    }
    async refund(e, t, n) {
      let r = this.tx(e);
      if (!r || r.status !== `succeeded`) throw new P(409, `provider_refused`, `Le prestataire refuse le remboursement : paiement non confirmé chez lui.`);
      if (r.refunded_minor + t > r.amount_minor) throw new P(409, `provider_refused`, `Le prestataire refuse : montant supérieur au solde remboursable.`);
      return A(this.db, `UPDATE demo_provider_tx SET refunded_minor = refunded_minor + ? WHERE provider_ref = ?`, t, e), {
        refundRef: `RF-DEMO-${me(`sha256`).update(n).digest(`hex`).slice(0, 10).toUpperCase()}`
      };
    }
    verifyNotification(e, t, n) {
      Vd(this.secret, e, t, n, this.tolerance);
      let r = JSON.parse(e);
      if (!r.eventId || !r.providerRef || !Number.isInteger(r.amountMinor) || !r.currency || r.type !== `payment.succeeded` && r.type !== `payment.failed`) throw new P(400, `invalid_notification`, `Notification incomplète.`);
      return {
        eventId: r.eventId,
        type: r.type,
        providerRef: r.providerRef,
        amountMinor: r.amountMinor,
        currency: r.currency,
        occurredAt: r.occurredAt ?? N(n),
        failureReason: r.failureReason
      };
    }
    simulate(e, t, n) {
      let r = this.tx(e);
      if (!r) throw new P(404, `not_found`, `Transaction inconnue du prestataire simulé.`);
      if (t === `duplicate`) {
        if (!r.last_event_json) throw new P(409, `nothing_to_replay`, `Aucune notification à renvoyer pour ce paiement.`);
        return {
          rawBody: r.last_event_json,
          signature: Bd(this.secret, r.last_event_json, n)
        };
      }
      if (r.status !== `pending`) throw new P(409, `already_final`, `Le prestataire simulé a déjà une issue pour ce paiement.`);
      let i = t !== `failure`;
      if (A(this.db, `UPDATE demo_provider_tx SET status = ? WHERE provider_ref = ?`, i ? `succeeded` : `failed`, e), t === `lost_notification`) return null;
      let a = JSON.stringify({
        eventId: `evt_demo_${_e()}`,
        type: i ? `payment.succeeded` : `payment.failed`,
        providerRef: e,
        amountMinor: t === `wrong_amount` ? r.amount_minor - 100 : r.amount_minor,
        currency: r.currency,
        occurredAt: N(n),
        ...(i ? {} : {
          failureReason: `Refusé par l'émetteur (simulation)`
        })
      });
      return A(this.db, `UPDATE demo_provider_tx SET last_event_json = ? WHERE provider_ref = ?`, a, e), {
        rawBody: a,
        signature: Bd(this.secret, a, n)
      };
    }
  },
  Wd = `date;reference;libelle;montant_brut;frais;montant_net`,
  Gd = e => {
    let t = /^(-?)(\d+)(?:[.,](\d{1,2}))?$/.exec(e.trim());
    return t ? (t[1] ? -1 : 1) * (Number(t[2]) * 100 + Number((t[3] ?? `0`).padEnd(2, `0`))) : null;
  },
  Kd = {
    label: `Relevé de démonstration (CSV)`,
    demo: !0,
    toVerify: [`Format réel des relevés (CSV, MT940, camt.053) et canal de mise à disposition par la banque.`, `Présence de la référence du prestataire sur chaque ligne, ou règlement en lot : un lot impose un rapport de règlement détaillé du prestataire.`, `Frais prélevés à la source ou facturés à part ; date de valeur et fréquence des règlements.`],
    parse(e) {
      let t = (e.charCodeAt(0) === 65279 ? e.slice(1) : e).split(/\r?\n/).map(e => e.trim()).filter(Boolean);
      if (t[0]?.toLowerCase() !== `date;reference;libelle;montant_brut;frais;montant_net`) throw new P(400, `bad_statement`, `En-tête attendu : ${Wd}`);
      return t.slice(1).map((e, t) => {
        let n = e.split(`;`),
          [r, i, a] = [Gd(n[3] ?? ``), Gd(n[4] ?? ``), Gd(n[5] ?? ``)];
        if (n.length !== 6 || !/^\d{4}-\d{2}-\d{2}$/.test(n[0]) || !n[1] || r === null || i === null || a === null) throw new P(400, `bad_statement`, `Ligne ${t + 2} illisible.`);
        if (r - i !== a) throw new P(400, `bad_statement`, `Ligne ${t + 2} : brut - frais ne donne pas le net.`);
        return {
          valueDate: n[0],
          reference: n[1].trim(),
          label: n[2].trim(),
          grossMinor: r,
          feeMinor: i,
          netMinor: a
        };
      });
    }
  },
  qd = {
    label: `ERP de démonstration`,
    demo: !0,
    toVerify: [`ERP cible, version, et interface d'écriture disponible (API, fichier d'échange, middleware). Pour un club équipé d'un logiciel comptable : édition, outil d'import et droits d'accès.`, `Plan comptable, journaux et comptes de tiers à utiliser ; traitement de la TVA.`, `Clé d'idempotence acceptée par l'ERP pour qu'une reprise ne crée pas de doublon.`, `Sens de la référence maître (clients, articles, prix) : l'ERP ou cette application.`],
    async push(e, t) {
      if (t.simulateFailure) throw Error(`ERP de démonstration indisponible (panne simulée dans les paramètres).`);
      return {
        externalRef: `ERP-DEMO-${me(`sha256`).update(e.id).digest(`hex`).slice(0, 8).toUpperCase()}`
      };
    }
  },
  Jd = e => ({
    label: `Barrière de démonstration`,
    demo: !0,
    toVerify: [`Interface exposée par le logiciel de contrôle d'accès du fournisseur de la barrière (API, webhook, liste blanche synchronisée) : l'intégration en dépend.`, `Temps de réponse admissible au passage du badge et comportement du lecteur si le serveur du club ne répond pas (liste locale, ouverture ou refus par défaut).`, `Identifiants lus (carte RFID, NFC, BLE, PIN, QR) et format transmis par le lecteur ; association d'un badge à un membre.`, `Affichage possible à l'accueil d'un signalement « dette à régulariser » sans bloquer la barrière ; anti-retour et comptage des passages.`, `Option de lecture de plaques (ANPR) : à chiffrer séparément si retenue.`],
    verifyRequest(t, n, r, i) {
      Vd(r, t, n, i, e);
      let a = JSON.parse(t);
      if (!a.requestId || typeof a.credential != `string` || !a.credential.trim() || a.credential.length > 64) throw new P(400, `invalid_request`, `Demande de lecteur incomplète.`);
      return {
        requestId: a.requestId,
        credential: a.credential.trim(),
        occurredAt: a.occurredAt ?? N(i)
      };
    }
  });
function Yd(e, t, n) {
  return {
    payments: Object.fromEntries(Hd.map(r => [r.method, new Ud(e, r, t, n)])),
    bank: Kd,
    erp: qd,
    access: Jd(n)
  };
}

export { Gd, Hd, Jd, Kd, Ud, Wd, Yd, qd };
