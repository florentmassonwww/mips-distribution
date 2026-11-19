// GENERATED (step 1b, stage 2): v0.1.0 interface "shared" code extracted from reference/v0.1.0/app.js.
// Rewritten as readable TSX in the following commits.
/* eslint-disable */
import { A_, D_, K, M_, j_, k_ } from "./i18n.js";
import { G, q } from "./lib.js";

var N_ = (e, t) => k_ === `en` ? D_[t] ?? D_[`err.${e}`] ?? t : t,
  F_ = e => `#${e}`,
  I_ = e => `${location.href.split(`#`)[0]}#${e}`,
  L_ = class extends Error {
    code;
    status;
    constructor(e, t, n) {
      super(n), this.status = e, this.code = t;
    }
  };
async function J(e, t, n) {
  let r;
  try {
    r = await fetch(t, {
      method: e,
      credentials: `same-origin`,
      headers: {
        "X-Requested-With": `mips-distribution`,
        ...(n === void 0 ? {} : {
          "Content-Type": `application/json`
        })
      },
      body: n === void 0 ? void 0 : JSON.stringify(n)
    });
  } catch {
    throw new L_(0, `network`, K(`Connexion impossible. Vérifiez le réseau puis réessayez.`));
  }
  let i = await r.json().catch(() => null);
  if (!r.ok) throw new L_(r.status, i?.error?.code ?? `error`, N_(i?.error?.code ?? `error`, i?.error?.message ?? K(`Une erreur est survenue. Réessayez.`)));
  return i;
}
function Y(e, t) {
  let [n, r] = (0, G.useState)({
      data: null,
      error: null,
      loading: !!e,
      at: 0
    }),
    i = (0, G.useRef)(0),
    a = (0, G.useCallback)(async (t = !1) => {
      if (!e) return;
      let n = ++i.current;
      t || r(e => ({
        ...e,
        loading: !0,
        error: null
      }));
      try {
        let t = await J(`GET`, e);
        n === i.current && r({
          data: t,
          error: null,
          loading: !1,
          at: Date.now()
        });
      } catch (e) {
        n === i.current && r(n => t && n.data ? {
          ...n,
          loading: !1
        } : {
          data: null,
          error: e,
          loading: !1,
          at: n.at
        });
      }
    }, [e]);
  return (0, G.useEffect)(() => {
    a();
  }, [a]), (0, G.useEffect)(() => {
    if (!t) return;
    let e = setInterval(() => {
      document.hidden || a(!0);
    }, t);
    return () => clearInterval(e);
  }, [t, a]), {
    ...n,
    reload: () => a(!0)
  };
}
function X(e) {
  if (e == null) return `—`;
  let t = Math.abs(e),
    n = Math.trunc(t / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, `,`),
    r = t % 100;
  return `${e < 0 ? `−` : ``}Rs ${n}${r ? `.` + String(r).padStart(2, `0`) : ``}`;
}
function R_(e) {
  let t = /^(\d{1,9})(?:[.,](\d{1,2}))?$/.exec(e.replace(/\s|Rs/gi, ``));
  return t ? Number(t[1]) * 100 + Number((t[2] ?? `0`).padEnd(2, `0`)) : null;
}
var z_ = e => `${Math.trunc(e / 100)}${e % 100 ? `.` + String(e % 100).padStart(2, `0`) : ``}`,
  B_ = `Indian/Mauritius`;
function Z(e, t = !1) {
  return e ? new Intl.DateTimeFormat(j_(), {
    timeZone: B_,
    day: `numeric`,
    month: `short`,
    ...(t ? {
      hour: `2-digit`,
      minute: `2-digit`
    } : {
      year: `numeric`
    })
  }).format(new Date(e)) : `—`;
}
var V_ = e => new Intl.DateTimeFormat(j_(), {
    timeZone: B_,
    hour: `2-digit`,
    minute: `2-digit`,
    second: `2-digit`
  }).format(new Date(e)),
  H_ = e => new Intl.DateTimeFormat(j_(), {
    timeZone: `UTC`,
    weekday: `long`,
    day: `numeric`,
    month: `long`
  }).format(new Date(`${e}T00:00:00Z`)),
  U_ = {
    unpaid: [K(`Non payé`), ``],
    pending: [K(`En attente`), `info`],
    to_verify: [K(`À vérifier`), `warn`],
    partially_paid: [K(`Partiellement payé`), `info`],
    paid: [K(`Payé`), `ok`],
    failed: [K(`Échoué`), `err`],
    refunded: [K(`Remboursé`), ``]
  },
  W_ = {
    pending: [K(`En attente`), `info`],
    to_verify: [K(`À vérifier`), `warn`],
    confirmed: [K(`Confirmé`), `ok`],
    failed: [K(`Échoué`), `err`],
    refunded: [K(`Remboursé`), ``]
  },
  G_ = {
    unsettled: [K(`Non réglé en banque`), `warn`],
    settled: [K(`Réglé en banque`), `ok`]
  },
  K_ = {
    confirmed: [K(`À préparer`), `warn`],
    prepared: [K(`Préparée`), `info`],
    loaded: [K(`Chargée`), `info`],
    delivered: [K(`Livrée`), `ok`],
    partially_delivered: [K(`Livrée partiellement`), `warn`],
    refused: [K(`Non livrée`), `err`],
    cancelled: [K(`Annulée`), ``]
  },
  q_ = {
    planned: [K(`Planifiée`), ``],
    loaded: [K(`Chargée`), `info`],
    in_progress: [K(`En cours`), `ok`],
    closed: [K(`Clôturée`), ``]
  },
  J_ = {
    pending: [K(`En attente`), `info`],
    synced: [K(`Synchronisée`), `ok`],
    failed: [K(`En erreur`), `err`]
  },
  Y_ = {
    matched: [K(`Rapproché`), `ok`],
    unmatched: [K(`Sans correspondance`), `err`],
    amount_mismatch: [K(`Écart de montant`), `warn`],
    duplicate: [K(`Doublon`), `err`]
  },
  X_ = {
    paystation: `PayStation`,
    card_tpe: K(`Carte (TPE)`),
    juice: `Juice`,
    link: K(`Lien de paiement`)
  },
  Z_ = {
    platform_admin: K(`Administrateur plateforme`),
    company_admin: K(`Administrateur`),
    dispatcher: K(`Centrale`),
    finance: K(`Finance`),
    agent: K(`Agent terrain`)
  },
  Q_ = {
    delivery_partial: K(`Livraison partielle`),
    delivery_refused: K(`Non-livraison`),
    return: K(`Retour de marchandise`),
    stock_variance: K(`Écart de stock`),
    price_mismatch: K(`Écart de prix`),
    payment_to_verify: K(`Paiement à vérifier`),
    amount_mismatch: K(`Montant notifié incohérent`),
    overpayment: K(`Trop-perçu`),
    conflicting_notification: K(`Notification contradictoire`),
    unknown_credit: K(`Crédit inconnu`),
    duplicate_settlement: K(`Règlement en double`),
    credit_on_failed: K(`Crédit sur paiement échoué`),
    settlement_amount_mismatch: K(`Écart de montant réglé`),
    fee_variance: K(`Écart de frais`),
    erp_sync_failed: K(`Erreur ERP`),
    reference_invalid: K(`Référence de membre incorrecte`),
    unidentified_transfer: K(`Virement non identifié`)
  },
  $_ = {
    notification: K(`notification signée`),
    status_query: K(`interrogation du prestataire`),
    bank_statement: K(`relevé bancaire`),
    cash_desk: K(`remise au bureau du club`),
    manual_assignment: K(`affectation par la comptabilité`)
  },
  ev = {
    company_admin: K(`Direction du club`),
    dispatcher: K(`Secrétariat`),
    finance: K(`Comptabilité`),
    agent: K(`Accueil et barrière`)
  },
  tv = (e, t) => (t === `club` ? ev[e] : void 0) ?? Z_[e] ?? e,
  nv = {
    active: [K(`Actif`), `ok`],
    suspended: [K(`Suspendu`), `err`],
    resigned: [K(`Résilié`), ``]
  },
  rv = {
    link: K(`Paiement en ligne`),
    bank_transfer: K(`Virement`),
    cash: K(`Espèces`)
  },
  iv = {
    restaurant: K(`Restaurant`),
    bar: K(`Bar`),
    tennis: K(`Tennis`),
    squash: K(`Squash`),
    golf: K(`Golf`),
    shop: K(`Boutique`),
    events: K(`Événements`),
    other: K(`Autre`)
  },
  av = {
    allow: [K(`Entrée autorisée`), `ok`],
    flag: [K(`Entrée signalée`), `warn`],
    deny: [K(`Entrée refusée`), `err`]
  },
  ov = {
    dues: K(`Cotisation`),
    consumption: K(`Consommation`),
    fee: K(`Frais`)
  },
  sv = {
    open: [K(`À régler`), `warn`],
    paid: [K(`Réglé`), `ok`],
    cancelled: [K(`Annulé`), ``]
  },
  cv = ({
    kind: e = ``,
    children: t
  }) => (0, q.jsx)(`span`, {
    className: `badge ${e}`,
    children: t
  }),
  lv = ({
    map: e,
    value: t
  }) => (0, q.jsx)(cv, {
    kind: e[t]?.[1],
    children: e[t]?.[0] ?? t
  });
function Q({
  title: e,
  actions: t,
  children: n,
  flush: r
}) {
  return (0, q.jsxs)(`section`, {
    className: `card`,
    children: [(0, q.jsxs)(`header`, {
      children: [(0, q.jsx)(`h2`, {
        children: e
      }), t]
    }), (0, q.jsx)(`div`, {
      className: r ? `` : `body`,
      children: n
    })]
  });
}
var uv = ({
    label: e,
    value: t,
    hint: n,
    kind: r
  }) => (0, q.jsxs)(`div`, {
    className: `tile ${r ?? ``}`,
    children: [(0, q.jsx)(`div`, {
      className: `label`,
      children: e
    }), (0, q.jsx)(`div`, {
      className: `value`,
      children: t
    }), n && (0, q.jsx)(`div`, {
      className: `hint`,
      children: n
    })]
  }),
  dv = ({
    href: e
  }) => (0, q.jsx)(`a`, {
    href: e,
    download: !0,
    children: K(`Exporter en CSV`)
  }),
  fv = ({
    title: e,
    sub: t,
    children: n
  }) => (0, q.jsxs)(`div`, {
    className: `page-head row spread`,
    children: [(0, q.jsxs)(`div`, {
      children: [(0, q.jsx)(`h1`, {
        children: e
      }), t && (0, q.jsx)(`div`, {
        className: `muted`,
        children: t
      })]
    }), n && (0, q.jsx)(`div`, {
      className: `row`,
      children: n
    })]
  });
function pv({
  q: e,
  children: t
}) {
  return e.error ? (0, q.jsxs)(`div`, {
    className: `notice err`,
    role: `alert`,
    children: [e.error.message, ` `, (0, q.jsx)(`button`, {
      className: `sm secondary`,
      onClick: e.reload,
      children: K(`Réessayer`)
    })]
  }) : e.data ? (0, q.jsx)(q.Fragment, {
    children: t(e.data)
  }) : (0, q.jsx)(`div`, {
    className: `loading`,
    role: `status`,
    children: K(`Chargement…`)
  });
}
function mv({
  rows: e,
  cols: t,
  empty: n,
  onRow: r,
  rowKey: i
}) {
  return e.length ? (0, q.jsx)(`div`, {
    className: `table-wrap`,
    children: (0, q.jsxs)(`table`, {
      children: [(0, q.jsx)(`thead`, {
        children: (0, q.jsx)(`tr`, {
          children: t.map(([e,, t]) => (0, q.jsx)(`th`, {
            className: t,
            children: e
          }, e))
        })
      }), (0, q.jsx)(`tbody`, {
        children: e.map(e => (0, q.jsx)(`tr`, {
          className: r ? `click` : ``,
          onClick: r ? () => r(e) : void 0,
          tabIndex: r ? 0 : void 0,
          onKeyDown: r ? t => {
            t.key === `Enter` && r(e);
          } : void 0,
          children: t.map(([t, n, r]) => (0, q.jsx)(`td`, {
            className: r,
            children: n(e)
          }, t))
        }, i(e)))
      })]
    })
  }) : (0, q.jsx)(`div`, {
    className: `empty`,
    children: n
  });
}
function $({
  label: e,
  children: t,
  hint: n
}) {
  return (0, q.jsxs)(`label`, {
    className: `field`,
    children: [(0, q.jsx)(`span`, {
      children: e
    }), t, n && (0, q.jsx)(`span`, {
      className: `small muted`,
      style: {
        marginTop: 4
      },
      children: n
    })]
  });
}
function hv({
  value: e,
  onChange: t,
  min: n = 0,
  max: r = 9999,
  label: i
}) {
  let a = e => t(Math.max(n, Math.min(r, Number.isFinite(e) ? Math.trunc(e) : n)));
  return (0, q.jsxs)(`div`, {
    className: `stepper`,
    role: `group`,
    "aria-label": i,
    children: [(0, q.jsx)(`button`, {
      type: `button`,
      className: `secondary`,
      onClick: () => a(e - 1),
      disabled: e <= n,
      "aria-label": K(`Moins`),
      children: `−`
    }), (0, q.jsx)(`input`, {
      type: `number`,
      inputMode: `numeric`,
      value: e,
      min: n,
      max: r,
      onChange: e => a(Number(e.target.value)),
      "aria-label": i
    }), (0, q.jsx)(`button`, {
      type: `button`,
      className: `secondary`,
      onClick: () => a(e + 1),
      disabled: e >= r,
      "aria-label": K(`Plus`),
      children: `+`
    })]
  });
}
var gv = (0, G.createContext)(null),
  _v = () => (0, G.useContext)(gv);
function vv({
  children: e
}) {
  let [t, n] = (0, G.useState)([]),
    [r, i] = (0, G.useState)(null),
    [a, o] = (0, G.useState)(``),
    s = (0, G.useCallback)((e, t = `ok`) => {
      let r = Date.now() + Math.random();
      n(n => [...n, {
        id: r,
        msg: e,
        kind: t
      }]), setTimeout(() => n(e => e.filter(e => e.id !== r)), t === `err` ? 7e3 : 3500);
    }, []),
    c = (0, G.useCallback)(e => new Promise(t => {
      o(e.initial ?? ``), i({
        ...e,
        resolve: t
      });
    }), []),
    l = (0, G.useCallback)(async (e, t) => {
      try {
        return await e(), t && s(t), !0;
      } catch (e) {
        return s(e.message, `err`), !1;
      }
    }, [s]),
    u = e => {
      r?.resolve(e), i(null);
    },
    d = r?.kind ?? `reason`,
    f = d === `confirm` || (d === `money` ? (R_(a) ?? 0) > 0 : a.trim().length >= 3);
  return (0, q.jsxs)(gv.Provider, {
    value: {
      toast: s,
      ask: c,
      run: l
    },
    children: [e, (0, q.jsx)(`div`, {
      className: `toasts`,
      "aria-live": `polite`,
      children: t.map(e => (0, q.jsx)(`div`, {
        className: `toast ${e.kind}`,
        role: e.kind === `err` ? `alert` : `status`,
        children: e.msg
      }, e.id))
    }), r && (0, q.jsx)(`div`, {
      className: `overlay`,
      role: `dialog`,
      "aria-modal": `true`,
      "aria-label": r.title,
      onKeyDown: e => {
        e.key === `Escape` && u(null);
      },
      children: (0, q.jsxs)(`form`, {
        className: `dialog stack`,
        onSubmit: e => {
          e.preventDefault(), f && u(d === `money` ? String(R_(a)) : d === `confirm` ? `ok` : a.trim());
        },
        children: [(0, q.jsx)(`h2`, {
          children: r.title
        }), r.text && (0, q.jsx)(`p`, {
          className: `muted`,
          children: r.text
        }), d !== `confirm` && (0, q.jsx)($, {
          label: r.label ?? K(`Motif`),
          children: d === `money` ? (0, q.jsx)(`input`, {
            type: `text`,
            inputMode: `decimal`,
            autoFocus: !0,
            value: a,
            onChange: e => o(e.target.value)
          }) : (0, q.jsx)(`textarea`, {
            autoFocus: !0,
            value: a,
            onChange: e => o(e.target.value)
          })
        }), (0, q.jsxs)(`div`, {
          className: `row`,
          style: {
            justifyContent: `flex-end`
          },
          children: [(0, q.jsx)(`button`, {
            type: `button`,
            className: `secondary`,
            onClick: () => u(null),
            children: K(`Annuler`)
          }), (0, q.jsx)(`button`, {
            type: `submit`,
            className: r.danger ? `danger` : ``,
            disabled: !f,
            children: r.confirm ?? K(`Confirmer`)
          })]
        })]
      })
    })]
  });
}
function yv({
  light: e
}) {
  let t = A_() === `fr` ? `en` : `fr`;
  return (0, q.jsx)(`button`, {
    type: `button`,
    className: `sm noprint ${e ? `secondary` : `ghost`}`,
    disabled: !navigator.onLine,
    onClick: () => M_(t),
    "aria-label": t === `en` ? `Switch to English` : `Passer en français`,
    children: t.toUpperCase()
  });
}
var bv = (0, G.createContext)(null),
  xv = () => (0, G.useContext)(bv),
  Xv = (e, t) => {
    try {
      let n = localStorage.getItem(e);
      return n ? JSON.parse(n) : t;
    } catch {
      return t;
    }
  },
  Zv = (e, t) => {
    try {
      localStorage.setItem(e, JSON.stringify(t));
    } catch {}
  },
  Qv = e => Xv(`md_queue_${e}`, []),
  $v = (e, t) => Zv(`md_queue_${e}`, t),
  ey = e => Xv(`md_bundle_${e}`, null),
  ty = e => Zv(`md_bundle_${e.route.id}`, e),
  ny = e => Xv(`md_route_${e}`, null),
  ry = (e, t) => Zv(`md_route_${e}`, t);
function iy() {
  return typeof crypto.randomUUID == `function` ? crypto.randomUUID() : [...crypto.getRandomValues(new Uint8Array(16))].map(e => e.toString(16).padStart(2, `0`)).join(``);
}
var ay = `md_force_offline`,
  oy = `md-network`;
function sy() {
  let e = () => ({
      forced: Xv(ay, !1),
      up: navigator.onLine
    }),
    [t, n] = (0, G.useState)(e);
  return (0, G.useEffect)(() => {
    let t = () => n(e());
    for (let e of [`online`, `offline`, oy]) window.addEventListener(e, t);
    return () => {
      for (let e of [`online`, `offline`, oy]) window.removeEventListener(e, t);
    };
  }, []), {
    online: t.up && !t.forced,
    forced: t.forced,
    setForced: e => {
      Zv(ay, e), window.dispatchEvent(new Event(oy));
    }
  };
}
var cy = (e, t, n) => (t?.price_list_id ? e.priceLists[t.price_list_id]?.[n.id] : void 0) ?? n.price_minor;
function ly(e, t) {
  let n = t.filter(e => e.state === `queued`),
    r = {
      ...e.stock
    },
    i = new Set(),
    a = [];
  for (let t of n) {
    if (t.type === `deliver` && t.orderId) {
      if (e.orders.find(e => e.id === t.orderId)?.status !== `loaded`) continue;
      i.add(t.orderId);
    } else t.type === `sale` && a.push({
      id: t.id,
      number: K(`Vente à synchroniser`),
      kind: `route_sale`,
      status: `delivered`,
      customer_id: t.customerId,
      note: ``,
      delivered_at: t.createdAt,
      local: !0,
      lines: t.items.map((e, n) => ({
        id: `${t.id}-${n}`,
        order_id: t.id,
        product_id: e.productId,
        qty_ordered: e.qty,
        qty_delivered: e.qty,
        unit_price_minor: 0
      }))
    });
    for (let e of t.items) r[e.productId] = (r[e.productId] ?? 0) - e.qty;
  }
  return {
    ...e,
    stock: r,
    orders: [...e.orders, ...a],
    queuedOrders: i
  };
}

export { $, $_, $v, B_, F_, G_, H_, I_, J, J_, K_, L_, N_, Q, Q_, Qv, R_, U_, V_, W_, X, X_, Xv, Y, Y_, Z, Z_, Zv, _v, av, ay, bv, cv, cy, dv, ev, ey, fv, gv, hv, iv, iy, lv, ly, mv, nv, ny, ov, oy, pv, q_, rv, ry, sv, sy, tv, ty, uv, vv, xv, yv, z_ };
