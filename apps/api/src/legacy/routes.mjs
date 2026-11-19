// GENERATED (step 1a, stage 2): v0.1.0 "routes" code extracted from reference/v0.1.0/app.js.
// Rewritten as readable TypeScript in the following commits.
/* eslint-disable */
import { $f, Df, Ef, If, Kf, Lf, Mf, Nf, Qf, Rf, Tf, Uf, Wf, Xf, Zf, _f, bf, ep, gf, jf, kf, mf, pf, qf, rp, tp, yf } from "./club.mjs";
import { A, Be, F, Fe, He, N, O, Oe, P, Re, Ue, j, k, ze } from "./core.mjs";
import { Cd, Ed, Gu, Id, Ju, Ku, Ld, Rd, Sd, Td, Xu, _d, bd, dd, fd, hd, jd, ld, md, pd, qu, td, ud, vd, xd, yd, zd } from "./distribution.mjs";
import { Cp, Dp, Ep, Op, Sp, Tp, bp, kp, wp, xp } from "./finance.mjs";
import { Fl, H, Ql, V, Zt, _u, ae, cu, du, he, hu, ie, jl, nu, ol, re, ve, xu, yu } from "./lib.mjs";
import { _p, dp, fp, hp, mp, pp, up, vp } from "./payments.mjs";
import { Bp } from "./seed.mjs";

var Kp = `mips-distribution`,
  qp = [`company_admin`, `dispatcher`, `finance`, `agent`],
  Jp = yu(Gu);
function Yp(e, t, n, r = () => new Date()) {
  let i = new Zt(),
    a = e => {
      let n = Buffer.from(JSON.stringify(e)).toString(`base64url`);
      return `${n}.${he(`sha256`, t.sessionSecret).update(n).digest(`base64url`)}`;
    },
    o = e => {
      let [n, i] = (e ?? ``).split(`.`);
      if (!n || !i) return null;
      let a = Buffer.from(he(`sha256`, t.sessionSecret).update(n).digest(`base64url`)),
        o = Buffer.from(i);
      if (a.length !== o.length || !ve(a, o)) return null;
      try {
        let e = JSON.parse(Buffer.from(n, `base64url`).toString());
        return e.exp > r().getTime() ? e : null;
      } catch {
        return null;
      }
    },
    s = t => {
      let n = o(re(t, `md_session`));
      if (!n) return null;
      let r = k(e, `SELECT u.*, c.name AS company_name, c.status AS company_status, c.vertical FROM users u LEFT JOIN companies c ON c.id = u.company_id WHERE u.id = ? AND u.active = 1`, n.uid);
      return r ? {
        id: r.id,
        name: r.name,
        email: r.email,
        role: r.role,
        companyId: r.company_id,
        companyName: r.company_name,
        companyStatus: r.company_status,
        vertical: r.vertical
      } : null;
    },
    c = (...e) => async (t, n) => {
      let r = s(t);
      if (!r) throw new P(401, `unauthenticated`, `Connexion requise.`);
      if (!e.includes(r.role)) throw Be();
      if (r.companyId && r.companyStatus !== `active`) throw new P(403, `company_suspended`, `L'accès de cette entreprise est suspendu.`);
      t.set(`user`, r), await n();
    },
    l = e => e.get(`user`).companyId,
    u = (...e) => async (t, n) => {
      await c(...e)(t, async () => {
        if (t.get(`user`).vertical !== `club`) throw new P(403, `wrong_vertical`, `Cet espace est réservé aux clubs.`);
        await n();
      });
    },
    d = e => e.req.header(`origin`) ?? new URL(e.req.url).origin,
    f = new Map(),
    p = (e, t, n) => {
      let i = r().getTime(),
        a = (f.get(e) ?? []).filter(e => e > i - n);
      if (a.length >= t) throw new P(429, `too_many_requests`, `Trop de tentatives. Réessayez dans un instant.`);
      a.push(i), f.set(e, a);
    },
    m = async (e, t) => t.parse(await e.req.json().catch(() => ({}))),
    h = (e, t, n, r) => e.body(F(n, r), 200, {
      "Content-Type": `text/csv; charset=utf-8`,
      "Content-Disposition": `attachment; filename="${t}.csv"`
    }),
    g = e => e.req.query(`format`) === `csv`,
    _ = (e, t = `id`) => e.req.param(t) ?? ``,
    v = (e, ...t) => e.map(e => {
      let n = {
        ...e
      };
      for (let e of t) n[e] = Ue(n[e]);
      return n;
    }),
    y = async t => {
      t && Xu(e, t).erp.autoSync && (await kp(e, n, t, {}, void 0, r()));
    };
  if (i.onError((e, t) => e instanceof P ? t.json({
    error: {
      code: e.code,
      message: e.message
    }
  }, e.status) : e instanceof ol ? t.json({
    error: {
      code: `invalid_input`,
      message: `Données invalides : ` + e.issues.map(e => `${e.path.join(`.`)} ${e.message}`).join(` ; `)
    }
  }, 400) : (console.error(`Erreur interne :`, e instanceof Error ? e.message : `inconnue`), t.json({
    error: {
      code: `internal`,
      message: `Une erreur est survenue. Réessayez.`
    }
  }, 500))), i.use(`/api/*`, async (e, t) => {
    let n = e.req.method;
    if (n !== `GET` && n !== `HEAD` && !e.req.path.startsWith(`/api/webhooks/`) && !e.req.path.startsWith(`/api/access/`) && e.req.header(`X-Requested-With`) !== Kp) throw new P(403, `csrf`, `Requête refusée.`);
    e.header(`Cache-Control`, `no-store`), await t();
  }), t.accessCode) {
    let e = [`/api/webhooks/`, `/api/access/`, `/api/public/`, `/api/gate`];
    i.use(`/api/*`, async (t, n) => {
      if (!e.some(e => t.req.path.startsWith(e)) && !o(re(t, `md_gate`))) throw new P(401, `gate`, `Code d'accès requis.`);
      await n();
    }), i.post(`/api/gate`, async e => {
      p(`gate:${e.req.header(`x-forwarded-for`) ?? `local`}`, 5, 6e4);
      let {
        code: n
      } = await m(e, H({
        code: V().max(200)
      }));
      if (!ve(he(`sha256`, t.sessionSecret).update(n).digest(), he(`sha256`, t.sessionSecret).update(t.accessCode).digest())) throw new P(401, `bad_code`, `Code incorrect.`);
      return ie(e, `md_gate`, a({
        gate: !0,
        exp: r().getTime() + 432e5
      }), {
        httpOnly: !0,
        sameSite: `Lax`,
        secure: e.req.header(`x-forwarded-proto`) === `https`,
        path: `/`,
        maxAge: 43200
      }), e.json({
        ok: !0
      });
    });
  }
  if (i.get(`/api/session`, e => {
    let n = s(e);
    return e.json({
      demoMode: t.demoMode,
      version: Oe,
      today: Re(r()),
      user: n ? {
        id: n.id,
        name: n.name,
        role: n.role,
        companyId: n.companyId,
        companyName: n.companyName,
        vertical: n.vertical
      } : null
    });
  }), i.post(`/api/logout`, e => (ae(e, `md_session`, {
    path: `/`
  }), e.json({
    ok: !0
  }))), t.demoMode) {
    i.get(`/api/demo/users`, t => t.json(O(e, `SELECT u.id, u.name, u.role, c.id AS company_id, c.name AS company_name, c.status AS company_status, c.vertical AS company_vertical
      FROM users u LEFT JOIN companies c ON c.id = u.company_id WHERE u.active = 1 ORDER BY c.rowid, u.rowid`))), i.post(`/api/demo/login`, async t => {
      let {
        userId: n
      } = await m(t, H({
        userId: V()
      }));
      if (!k(e, `SELECT 1 FROM users WHERE id = ? AND active = 1`, n)) throw ze(`Utilisateur`);
      return ie(t, `md_session`, a({
        uid: n,
        exp: r().getTime() + 432e5
      }), {
        httpOnly: !0,
        sameSite: `Strict`,
        secure: !1,
        path: `/`,
        maxAge: 43200
      }), t.json({
        ok: !0
      });
    }), i.post(`/api/demo/reset`, c(`platform_admin`), async t => (await Bp(e, n, r()), t.json({
      ok: !0
    })));
    let t = async (t, i) => {
      if (!t.provider_ref) throw new P(409, `bad_status`, `Paiement sans référence prestataire.`);
      let a = n.payments[t.method].simulate(t.provider_ref, i, r()),
        o = a ? hp(e, n, t.method, a.rawBody, a.signature, r()).result : `no_notification`;
      return await y(t.company_id), o;
    };
    i.post(`/api/demo/payments/:id/simulate`, c(...qp), async n => {
      let {
        outcome: r
      } = await m(n, H({
        outcome: yu([`success`, `failure`, `lost_notification`, `duplicate`, `wrong_amount`])
      }));
      return n.json({
        result: await t(up(e, n.get(`user`), _(n)), r)
      });
    }), i.post(`/api/public/pay/:token/demo`, async n => {
      p(`pay:${_(n, `token`)}`, 10, 6e4);
      let {
          outcome: r
        } = await m(n, H({
          outcome: yu([`success`, `failure`])
        })),
        i = k(e, `SELECT * FROM payments WHERE link_token = ? AND method = 'link'`, _(n, `token`));
      if (!i) throw ze(`Lien de paiement`);
      if (i.status !== `pending`) throw new P(409, `bad_status`, `Ce lien n'est plus payable.`);
      return n.json({
        result: await t(i, r)
      });
    }), i.post(`/api/public/member/:token/pay/demo`, async t => {
      p(`mpay:${_(t, `token`)}`, 10, 6e4);
      let {
          outcome: i
        } = await m(t, H({
          outcome: yu([`success`, `failure`])
        })),
        a = tp(e, _(t, `token`)),
        o = k(e, `SELECT * FROM member_payments WHERE member_id = ? AND method = 'link' AND status = 'pending' ORDER BY created_at DESC LIMIT 1`, a.id);
      if (!o?.provider_ref) throw new P(409, `bad_status`, `Aucun paiement en ligne en attente pour ce compte.`);
      let s = n.payments.link.simulate(o.provider_ref, i, r()),
        c = s ? hp(e, n, `link`, s.rawBody, s.signature, r()) : null;
      return await y(a.company_id), t.json({
        result: c?.result ?? `no_notification`
      });
    });
  }
  i.get(`/api/public/pay/:token`, n => {
    p(`payget:${n.req.header(`x-forwarded-for`) ?? `local`}`, 120, 6e4);
    let r = k(e, `SELECT p.status, p.amount_minor, p.currency, p.expires_at, co.name AS company, i.number AS invoice
      FROM payments p JOIN companies co ON co.id = p.company_id JOIN invoices i ON i.id = p.invoice_id WHERE p.link_token = ? AND p.method = 'link'`, _(n, `token`));
    if (!r) throw ze(`Lien de paiement`);
    return n.json({
      ...r,
      demoMode: t.demoMode
    });
  }), i.post(`/api/webhooks/:method`, async t => {
    let i = Jp.safeParse(_(t, `method`));
    if (!i.success) throw ze(`Prestataire`);
    let a = await t.req.text(),
      o = hp(e, n, i.data, a, t.req.header(`X-Signature`), r());
    return o.paymentId && (await y(o.companyId)), t.json({
      received: !0,
      result: o.result
    });
  }), i.get(`/api/connectors`, c(...qp, `platform_admin`), e => e.json({
    payments: Gu.map(e => {
      let t = n.payments[e];
      return {
        method: e,
        label: t.label,
        demo: t.demo,
        capabilities: t.capabilities,
        toVerify: t.toVerify
      };
    }),
    bank: {
      label: n.bank.label,
      demo: n.bank.demo,
      toVerify: n.bank.toVerify
    },
    erp: {
      label: n.erp.label,
      demo: n.erp.demo,
      toVerify: n.erp.toVerify
    },
    access: {
      label: n.access.label,
      demo: n.access.demo,
      toVerify: n.access.toVerify
    }
  }));
  for (let e of [`/api/agent/*`, `/api/centrale/*`, `/api/payments`, `/api/payments/*`, `/api/chain/*`, `/api/invoices/*`, `/api/finance/journal`, `/api/finance/invoices`, `/api/finance/reconciliation`, `/api/finance/statements`, `/api/finance/statements/*`, `/api/finance/close`, `/api/finance/payments/*`]) i.use(e, async (e, t) => {
    if (s(e)?.vertical === `club`) throw new P(403, `wrong_vertical`, `Cet espace est réservé à la distribution.`);
    await t();
  });
  let b = c(`agent`);
  i.get(`/api/agent/routes`, b, t => t.json(bd(e, l(t), t.get(`user`).id))), i.post(`/api/agent/routes/:id/start`, b, t => (Td(e, t.get(`user`), _(t), r()), t.json({
    ok: !0
  }))), i.get(`/api/agent/routes/:id/bundle`, b, t => {
    let i = Xu(e, l(t)).payments.methods;
    return t.json({
      ...Ed(e, t.get(`user`), _(t), r()),
      methods: Gu.filter(e => i[e].enabled).map(e => ({
        method: e,
        label: n.payments[e].label
      }))
    });
  }), i.get(`/api/agent/routes/:id/summary`, b, t => (Ed(e, t.get(`user`), _(t)), t.json(xd(e, l(t), _(t))))), i.post(`/api/agent/routes/:id/close`, b, t => t.json(Ld(e, t.get(`user`), _(t), r()))), i.post(`/api/agent/sync`, b, async t => {
    let {
        actions: n
      } = await m(t, H({
        actions: cu(jd).max(100)
      })),
      i = n.map(n => Id(e, t.get(`user`), n, r()));
    return await y(l(t)), t.json({
      results: i
    });
  });
  let ee = c(`agent`, `finance`, `company_admin`);
  i.post(`/api/payments`, ee, async t => {
    let i = await m(t, H({
        invoiceId: V(),
        method: Jp,
        amountMinor: Ql().int().positive(),
        idempotencyKey: V().min(16).max(80)
      })),
      a = t.req.header(`origin`) ?? new URL(t.req.url).origin,
      o = await dp(e, n, t.get(`user`), i, a, r());
    return t.json({
      payment: rp(o.payment),
      replayed: o.replayed
    });
  }), i.get(`/api/payments/:id`, ee, t => t.json(rp(up(e, t.get(`user`), _(t))))), i.post(`/api/payments/:id/check`, ee, async t => {
    let i = await fp(e, n, t.get(`user`), _(t), r());
    return await y(i.company_id), t.json(rp(i));
  }), i.post(`/api/payments/:id/cancel`, ee, async t => t.json(rp(await pp(e, n, t.get(`user`), _(t), r())))), i.post(`/api/payments/:id/claim`, ee, t => t.json(rp(mp(e, t.get(`user`), _(t), r())))), i.get(`/api/invoices/:id/receipt`, c(...qp), t => t.json(vp(e, t.get(`user`), _(t))));
  let x = c(...Ku),
    S = c(`company_admin`, `dispatcher`, `finance`);
  i.get(`/api/centrale/dashboard`, S, t => t.json(zd(e, l(t), r()))), i.get(`/api/centrale/reference`, S, t => t.json({
    customers: O(e, `SELECT c.id, c.code, c.name, c.zone, c.address, pl.name AS price_list FROM customers c LEFT JOIN price_lists pl ON pl.id = c.price_list_id WHERE c.company_id = ? AND c.active = 1 ORDER BY c.name`, l(t)),
    products: O(e, `SELECT p.id, p.sku, p.name, p.unit, p.price_minor, COALESCE(w.qty, 0) AS qty FROM products p LEFT JOIN warehouse_stock w ON w.product_id = p.id AND w.company_id = p.company_id WHERE p.company_id = ? AND p.active = 1 ORDER BY p.name`, l(t)),
    agents: O(e, `SELECT id, name FROM users WHERE company_id = ? AND role = 'agent' AND active = 1 ORDER BY name`, l(t))
  })), i.get(`/api/centrale/orders`, S, t => t.json(pd(e, l(t), {
    status: t.req.query(`status`) || void 0,
    routeId: t.req.query(`routeId`) || void 0
  }))), i.post(`/api/centrale/orders`, x, async t => t.json(ud(e, t.get(`user`), await m(t, ld), r()))), i.get(`/api/chain/:id`, S, t => t.json(md(e, l(t), _(t)))), i.post(`/api/centrale/orders/:id/assign`, x, async t => {
    let {
      routeId: n
    } = await m(t, H({
      routeId: V().nullable()
    }));
    return dd(e, t.get(`user`), _(t), n, r()), t.json({
      ok: !0
    });
  }), i.post(`/api/centrale/orders/:id/status`, x, async t => {
    let {
      status: n
    } = await m(t, H({
      status: yu([`prepared`, `confirmed`, `cancelled`])
    }));
    return fd(e, t.get(`user`), _(t), n, r()), t.json({
      ok: !0
    });
  }), i.get(`/api/centrale/routes`, S, t => t.json(bd(e, l(t)))), i.post(`/api/centrale/routes`, x, async t => t.json(_d(e, t.get(`user`), await m(t, hd), r()))), i.get(`/api/centrale/routes/:id`, S, t => t.json({
    ...xd(e, l(t), _(t)),
    stops: O(e, `SELECT s.customer_id, s.seq, c.name, c.zone FROM route_stops s JOIN customers c ON c.id = s.customer_id WHERE s.route_id = ? AND s.company_id = ? ORDER BY s.seq`, _(t), l(t)),
    orderList: pd(e, l(t), {
      routeId: _(t)
    })
  })), i.patch(`/api/centrale/routes/:id`, x, async t => (vd(e, t.get(`user`), _(t), await m(t, hd.partial()), r()), t.json({
    ok: !0
  }))), i.post(`/api/centrale/routes/:id/load`, x, async t => {
    let {
      extras: n
    } = await m(t, H({
      extras: cu(H({
        productId: V(),
        qty: Ql().int().min(0).max(1e5)
      })).max(200).default([])
    }));
    return yd(e, t.get(`user`), _(t), n, r()), t.json({
      ok: !0
    });
  }), i.get(`/api/centrale/stock`, S, t => t.json(Sd(e, l(t)))), i.post(`/api/centrale/stock/adjust`, x, async t => {
    let n = await m(t, H({
      productId: V(),
      delta: Ql().int().min(-1e5).max(1e5).refine(e => e !== 0),
      reason: V().min(3).max(200)
    }));
    return Cd(e, t.get(`user`), n.productId, n.delta, n.reason, r()), t.json({
      ok: !0
    });
  });
  let C = e => [...(Ku.includes(e.role) ? [`ops`] : []), ...(qu.includes(e.role) ? [`finance`] : [])];
  i.get(`/api/exceptions`, S, t => {
    let n = t.req.query(`domain`) === `finance` ? `finance` : `ops`;
    if (!C(t.get(`user`)).includes(n)) throw Be();
    let r = td(e, l(t), n, t.req.query(`status`) === `resolved` ? `resolved` : `open`);
    return g(t) ? h(t, `exceptions-${n}`, r, [[`created_at`, `Créée le`], [`type`, `Type`], [`message`, `Description`], [`status`, `État`], [`resolution`, `Décision`], [`resolution_note`, `Note`], [`resolved_at`, `Traitée le`]]) : t.json(r);
  }), i.post(`/api/exceptions/:id/resolve`, S, async t => {
    let n = await m(t, H({
      resolution: yu([`approved`, `rejected`]),
      note: V().min(3).max(300)
    }));
    return Rd(e, t.get(`user`), _(t), C(t.get(`user`)), n.resolution, n.note, r()), t.json({
      ok: !0
    });
  });
  let w = c(...qu);
  i.get(`/api/finance/journal`, w, t => {
    let n = bp(e, l(t), {
      status: t.req.query(`status`) || void 0,
      method: t.req.query(`method`) || void 0,
      day: t.req.query(`day`) || void 0,
      settlement: t.req.query(`settlement`) || void 0
    });
    return g(t) ? h(t, `journal-transactions`, v(n, `amount_minor`, `refunded_minor`, `fee_expected_minor`, `fee_actual_minor`), [[`created_at`, `Créé le (UTC)`], [`company`, `Entreprise`], [`invoice`, `Facture`], [`order_number`, `Commande`], [`customer`, `Commerce`], [`agent`, `Agent`], [`method`, `Moyen`], [`amount_minor`, `Montant`], [`currency`, `Devise`], [`status`, `État du paiement`], [`provider_ref`, `Référence prestataire`], [`confirmed_at`, `Confirmé le (UTC)`], [`confirmed_via`, `Confirmé par`], [`refunded_minor`, `Remboursé`], [`settlement_status`, `Règlement bancaire`], [`settled_at`, `Réglé le (UTC)`], [`fee_expected_minor`, `Frais attendus`], [`fee_actual_minor`, `Frais prélevés`], [`failure_reason`, `Motif d'échec`], [`verify_reason`, `Motif de vérification`]]) : t.json(n);
  }), i.get(`/api/finance/invoices`, w, t => {
    let n = xp(e, l(t));
    return g(t) ? h(t, `factures`, v(n, `amount_minor`, `paid_minor`, `refunded_minor`, `settled_minor`), [[`number`, `Facture`], [`issued_at`, `Émise le (UTC)`], [`order_number`, `Commande`], [`customer`, `Commerce`], [`route`, `Tournée`], [`agent`, `Agent`], [`amount_minor`, `Montant`], [`paid_minor`, `Encaissé confirmé`], [`refunded_minor`, `Remboursé`], [`settled_minor`, `Réglé en banque`], [`status`, `État`], [`erp_status`, `ERP`]]) : t.json(n);
  }), i.post(`/api/finance/payments/:id/refund`, w, async t => {
    let i = await m(t, H({
        amountMinor: Ql().int().positive(),
        reason: V().min(3).max(200)
      })),
      a = await _p(e, n, t.get(`user`), _(t), i.amountMinor, i.reason, r());
    return await y(a.company_id), t.json(rp(a));
  }), i.get(`/api/finance/reconciliation`, w, t => {
    let n = wp(e, l(t));
    return g(t) ? h(t, `rapprochement`, v(n.lines, `gross_minor`, `fee_minor`, `net_minor`, `fee_expected_minor`), [[`value_date`, `Date de valeur`], [`reference`, `Référence`], [`label`, `Libellé`], [`gross_minor`, `Brut`], [`fee_minor`, `Frais`], [`net_minor`, `Net`], [`match_status`, `Rapprochement`], [`invoice`, `Facture`], [`method`, `Moyen`], [`fee_expected_minor`, `Frais attendus`]]) : t.json(n);
  }), t.demoMode && i.get(`/api/finance/statements/demo`, w, t => t.json({
    filename: `releve-demo-${Re(r())}.csv`,
    content: Sp(e, l(t), t.req.query(`anomalies`) === `1`, r())
  })), i.post(`/api/finance/statements`, w, async t => {
    let i = await m(t, H({
        filename: V().min(1).max(120),
        content: V().min(10).max(2e6)
      })),
      a = Cp(e, n, t.get(`user`), i.filename, i.content, r());
    return await y(l(t)), t.json(a);
  }), i.get(`/api/finance/close`, w, t => {
    let n = Dp(e, l(t));
    return g(t) ? h(t, `clotures`, n.map(e => ({
      day: e.day,
      closed_at: e.closed_at,
      closed_by: e.closed_by,
      invoiced: Ue(e.totals.invoiced),
      outstanding: Ue(e.totals.outstanding),
      to_verify: e.totals.toVerify,
      exceptions: e.totals.openExceptions
    })), [[`day`, `Journée`], [`closed_at`, `Clôturée le (UTC)`], [`closed_by`, `Par`], [`invoiced`, `Facturé`], [`outstanding`, `Reste à encaisser`], [`to_verify`, `Paiements à vérifier`], [`exceptions`, `Exceptions ouvertes`]]) : t.json({
      preview: Tp(e, l(t), t.req.query(`day`) || Re(r())),
      closes: n
    });
  }), i.post(`/api/finance/close`, w, async t => t.json(Ep(e, t.get(`user`), (await m(t, H({
    day: V()
  }))).day, r()))), i.get(`/api/finance/erp`, w, t => {
    let n = Op(e, l(t));
    return g(t) ? h(t, `ecritures-erp`, v(n, `amount_minor`), [[`created_at`, `Créée le (UTC)`], [`kind`, `Type`], [`label`, `Libellé`], [`amount_minor`, `Montant`], [`status`, `État`], [`attempts`, `Tentatives`], [`last_error`, `Dernière erreur`], [`external_ref`, `Référence ERP`], [`synced_at`, `Synchronisée le (UTC)`]]) : t.json({
      entries: n,
      settings: {
        system: Xu(e, l(t)).erp.system,
        autoSync: Xu(e, l(t)).erp.autoSync,
        simulateFailure: Xu(e, l(t)).erp.simulateFailure
      }
    });
  }), i.post(`/api/finance/erp/sync`, w, async t => {
    let {
      ids: i
    } = await m(t, H({
      ids: cu(V()).max(200).optional()
    }));
    return t.json(await kp(e, n, l(t), {
      ids: i,
      retryFailed: !0
    }, t.get(`user`), r()));
  });
  let te = u(`company_admin`, `dispatcher`, `finance`),
    T = u(`company_admin`, `dispatcher`),
    E = u(`company_admin`, `finance`),
    ne = u(`company_admin`, `dispatcher`, `agent`),
    oe = V().min(16).max(80),
    se = du([jl().max(120), xu(``)]);
  i.get(`/api/club/dashboard`, te, t => t.json(Mf(e, l(t), r()))), i.get(`/api/club/members`, te, t => {
    let n = jf(e, l(t), r(), {
      q: t.req.query(`q`),
      filter: t.req.query(`filter`),
      sort: t.req.query(`sort`)
    });
    return g(t) ? h(t, `membres`, v(n, `balance_minor`, `overdue_minor`), [[`number`, `Numéro`], [`name`, `Nom`], [`plan`, `Catégorie`], [`status`, `État`], [`reference`, `Référence de paiement`], [`balance_minor`, `Solde dû`], [`overdue_minor`, `Dont en retard`], [`overdue_days`, `Jours de retard`], [`last_reminder_level`, `Dernière relance (niveau)`], [`last_reminder_at`, `Relancé le (UTC)`]]) : t.json(n);
  });
  let ce = H({
    name: V().min(2).max(80),
    email: se.default(``),
    phone: V().max(30).default(``),
    planId: V().nullable(),
    badge: V().regex(/^[A-Za-z0-9-]{3,24}$/).optional()
  });
  i.post(`/api/club/members`, T, async t => t.json(pf(e, t.get(`user`), await m(t, ce), r()))), i.get(`/api/club/members/:id`, te, t => t.json(Nf(e, l(t), _(t), r()))), i.patch(`/api/club/members/:id`, T, async t => {
    let n = await m(t, H({
      status: yu([`active`, `suspended`, `resigned`]).optional(),
      planId: V().nullable().optional(),
      email: se.optional(),
      phone: V().max(30).optional()
    }));
    return mf(e, t.get(`user`), _(t), n, r()), t.json({
      ok: !0
    });
  }), i.post(`/api/club/members/:id/charges`, T, async t => {
    let n = await m(t, H({
        kind: yu([`consumption`, `fee`]),
        outlet: yu(Ju),
        label: V().min(2).max(80),
        amountMinor: Ql().int().positive().max(1e8)
      })),
      i = gf(e, t.get(`user`), _(t), n, r());
    return await y(l(t)), t.json(i);
  }), i.post(`/api/club/charges/:id/cancel`, E, async t => (_f(e, t.get(`user`), _(t), (await m(t, H({
    reason: V().min(3).max(200)
  }))).reason, r()), await y(l(t)), t.json({
    ok: !0
  }))), i.post(`/api/club/members/:id/cash`, E, async t => {
    let n = await m(t, H({
        amountMinor: Ql().int().positive().max(1e8),
        note: V().max(200).default(``),
        idempotencyKey: oe
      })),
      i = Tf(e, t.get(`user`), _(t), n.amountMinor, n.note, n.idempotencyKey, r());
    return await y(l(t)), t.json({
      id: i.payment.id,
      status: i.payment.status,
      replayed: i.replayed
    });
  }), i.post(`/api/club/members/:id/statement`, te, t => t.json(Lf(e, t.get(`user`), _(t), d(t), r()))), i.get(`/api/club/dues`, te, t => t.json(bf(e, l(t)))), i.post(`/api/club/dues/run`, E, async t => {
    let n = yf(e, t.get(`user`), (await m(t, H({
      period: V().max(7)
    }))).period, r());
    return await y(l(t)), t.json(n);
  }), i.get(`/api/club/reminders`, te, t => t.json(Rf(e, l(t)))), i.post(`/api/club/reminders/run`, E, t => t.json(If(e, t.get(`user`), d(t), r()))), i.get(`/api/club/payments`, E, t => {
    let n = kf(e, l(t), {
      status: t.req.query(`status`) || void 0,
      method: t.req.query(`method`) || void 0
    });
    return g(t) ? h(t, `encaissements-membres`, v(n, `amount_minor`, `fee_actual_minor`), [[`created_at`, `Créé le (UTC)`], [`member_number`, `Membre`], [`member`, `Nom`], [`method`, `Moyen`], [`amount_minor`, `Montant`], [`status`, `État`], [`confirmed_via`, `Confirmé par`], [`confirmed_at`, `Confirmé le (UTC)`], [`settlement_status`, `Règlement bancaire`], [`fee_actual_minor`, `Frais prélevés`], [`provider_ref`, `Référence prestataire`], [`reference`, `Référence membre`]]) : t.json(n);
  }), i.post(`/api/club/payments/:id/check`, te, async t => {
    let i = await Df(e, n, t.get(`user`), _(t), r());
    return await y(l(t)), t.json({
      id: i.id,
      status: i.status
    });
  }), i.get(`/api/club/reconciliation`, E, t => t.json(Qf(e, l(t)))), t.demoMode && i.get(`/api/club/statements/demo`, E, t => t.json({
    filename: `releve-club-demo-${Re(r())}.csv`,
    content: qf(e, l(t), r())
  })), i.post(`/api/club/statements`, E, async t => {
    let i = await m(t, H({
        filename: V().min(1).max(120),
        content: V().min(10).max(2e6)
      })),
      a = Xf(e, n, t.get(`user`), i.filename, i.content, r());
    return await y(l(t)), t.json(a);
  }), i.post(`/api/club/bank-lines/:id/assign`, E, async t => {
    let n = await m(t, H({
        memberId: V(),
        note: V().min(3).max(200)
      })),
      i = Zf(e, t.get(`user`), _(t), n.memberId, n.note, r());
    return await y(l(t)), t.json(i);
  }), i.get(`/api/club/accounting`, E, t => {
    let n = Re(r()),
      i = V().regex(/^\d{4}-\d{2}-\d{2}$/),
      a = i.safeParse(t.req.query(`from`)).data ?? `${n.slice(0, 7)}-01`,
      o = i.safeParse(t.req.query(`to`)).data ?? n,
      s = $f(e, l(t), a, o);
    return g(t) ? h(t, `export-comptable-${a}-${o}`, v(s.lines, `debit`, `credit`), [[`date`, `Date`], [`journal`, `Journal`], [`account`, `Compte`], [`aux`, `Compte tiers`], [`piece`, `Pièce`], [`label`, `Libellé`], [`debit`, `Débit`], [`credit`, `Crédit`]]) : t.json(s);
  }), i.post(`/api/club/gate/check`, ne, async t => t.json(Uf(e, t.get(`user`), (await m(t, H({
    credential: V().min(1).max(64)
  }))).credential, r()))), i.get(`/api/club/gate/events`, ne, t => t.json(Kf(e, l(t), t.req.query(`today`) ? N(new Date(`${Re(r())}T00:00:00+04:00`)) : void 0))), i.get(`/api/club/gate/devices`, u(`company_admin`), t => t.json(O(e, `SELECT id, name, active, created_at FROM gate_devices WHERE company_id = ? ORDER BY created_at`, l(t)))), i.post(`/api/access/check`, async i => (p(`access:${i.req.header(`X-Device`) ?? `?`}`, 120, 6e4), i.json(Wf(e, n, t.webhookSecret, i.req.header(`X-Device`) ?? ``, await i.req.text(), i.req.header(`X-Signature`), r())))), i.get(`/api/public/member/:token`, n => (p(`member:${n.req.header(`x-forwarded-for`) ?? `local`}`, 120, 6e4), n.json({
    ...ep(e, _(n, `token`), r()),
    demoMode: t.demoMode
  }))), i.post(`/api/public/member/:token/pay`, async t => {
    p(`mpaystart:${_(t, `token`)}`, 10, 6e4);
    let {
        idempotencyKey: i
      } = await m(t, H({
        idempotencyKey: oe
      })),
      a = tp(e, _(t, `token`)),
      o = await Ef(e, n, a.company_id, a.id, i, d(t), {
        id: `member:${a.number}`,
        role: `member`,
        companyId: a.company_id
      }, r());
    return t.json({
      status: o.payment.status,
      amountMinor: o.payment.amount_minor,
      replayed: o.replayed
    });
  });
  let le = c(`company_admin`);
  i.get(`/api/admin/users`, le, t => t.json(O(e, `SELECT id, name, email, role, active, created_at FROM users WHERE company_id = ? ORDER BY rowid`, l(t)))), i.post(`/api/admin/users`, le, async t => {
    let n = await m(t, H({
      name: V().min(2).max(80),
      email: jl().max(120),
      role: yu(qp)
    }));
    if (k(e, `SELECT 1 FROM users WHERE email = ?`, n.email.toLowerCase())) throw new P(409, `email_taken`, `Cette adresse est déjà utilisée.`);
    let i = Fe(`usr`);
    return j(e, () => {
      A(e, `INSERT INTO users (id, company_id, name, email, role, created_at) VALUES (?,?,?,?,?,?)`, i, l(t), n.name, n.email.toLowerCase(), n.role, N(r())), He(e, t.get(`user`), `user.created`, `user`, i, {
        name: n.name,
        role: n.role
      }, l(t), r());
    }), t.json({
      id: i
    });
  }), i.patch(`/api/admin/users/:id`, le, async t => {
    let n = await m(t, H({
        role: yu(qp).optional(),
        active: nu().optional()
      })),
      i = k(e, `SELECT name FROM users WHERE id = ? AND company_id = ?`, _(t), l(t));
    if (!i) throw ze(`Utilisateur`);
    if (_(t) === t.get(`user`).id) throw new P(409, `self_change`, `Vous ne pouvez pas modifier votre propre accès.`);
    return j(e, () => {
      n.role && A(e, `UPDATE users SET role = ? WHERE id = ?`, n.role, _(t)), n.active !== void 0 && A(e, `UPDATE users SET active = ? WHERE id = ?`, +!!n.active, _(t)), He(e, t.get(`user`), `user.updated`, `user`, _(t), {
        name: i.name,
        ...n
      }, l(t), r());
    }), t.json({
      ok: !0
    });
  });
  let ue = H({
    payments: H({
      methods: _u(Jp, H({
        enabled: nu(),
        feeBps: Ql().int().min(0).max(1e3),
        merchantRef: V().max(60)
      })),
      settlementAccountLabel: V().max(120),
      attemptMinutes: Ql().int().min(1).max(60)
    }),
    erp: H({
      system: V().max(60),
      endpoint: Fl().max(200),
      secretRef: V().regex(/^[A-Z][A-Z0-9_]{2,63}$/),
      autoSync: nu(),
      simulateFailure: nu()
    }),
    club: H({
      dueDays: Ql().int().min(0).max(120),
      reminders: H({
        levels: hu([Ql().int().min(1).max(365), Ql().int().min(1).max(365), Ql().int().min(1).max(365)]).refine(([e, t, n]) => e < t && t < n, `niveaux croissants`),
        minAmountMinor: Ql().int().min(0).max(1e8)
      }),
      gate: H({
        flagAfterDays: Ql().int().min(0).max(365),
        denyAfterDays: Ql().int().min(0).max(365),
        minAmountMinor: Ql().int().min(0).max(1e8)
      })
    }).optional()
  });
  i.get(`/api/admin/settings`, le, t => t.json({
    settings: Xu(e, l(t)),
    subscription: k(e, `SELECT name, slug, plan, subscription_status, subscription_renews_at, status, currency, vertical FROM companies WHERE id = ?`, l(t))
  })), i.put(`/api/admin/settings`, le, async t => {
    let n = await m(t, ue),
      i = Xu(e, l(t)),
      a = {
        ...i,
        payments: n.payments,
        erp: n.erp,
        club: n.club ? {
          ...i.club,
          ...n.club
        } : i.club
      };
    return j(e, () => {
      A(e, `UPDATE companies SET settings_json = ? WHERE id = ?`, JSON.stringify(a), l(t)), He(e, t.get(`user`), `settings.updated`, `company`, l(t), {
        methods: Object.fromEntries(Object.entries(n.payments.methods).map(([e, t]) => [e, t.enabled])),
        erpAutoSync: n.erp.autoSync,
        erpSimulateFailure: n.erp.simulateFailure
      }, l(t), r());
    }), t.json({
      ok: !0
    });
  });
  let de = t => O(e, `SELECT a.id, a.at, a.action, a.entity, a.entity_id, a.actor_role, a.details_json, COALESCE(u.name, a.actor) AS actor, co.name AS company
    FROM audit_log a LEFT JOIN users u ON u.id = a.actor LEFT JOIN companies co ON co.id = a.company_id ${t ? `WHERE a.company_id = ?` : `WHERE a.action LIKE 'company.%' OR a.action LIKE 'user.%' OR a.action LIKE 'settings.%'`} ORDER BY a.at DESC, a.rowid DESC LIMIT 500`, ...(t ? [t] : [])),
    fe = (e, t) => {
      let n = de(t);
      return g(e) ? h(e, `journal-audit`, n.map(e => ({
        ...e,
        details: e.details_json
      })), [[`at`, `Date (UTC)`], [`company`, `Entreprise`], [`actor`, `Acteur`], [`actor_role`, `Rôle`], [`action`, `Action`], [`entity`, `Objet`], [`entity_id`, `Identifiant`], [`details`, `Détails`]]) : e.json(n.map(e => ({
        ...e,
        details_json: void 0,
        details: JSON.parse(e.details_json)
      })));
    };
  i.get(`/api/admin/audit`, le, e => fe(e, l(e)));
  let pe = c(`platform_admin`);
  return i.get(`/api/platform/companies`, pe, t => t.json(O(e, `SELECT co.id, co.name, co.slug, co.vertical, co.status, co.plan, co.subscription_status, co.subscription_renews_at, co.created_at,
      (SELECT COUNT(*) FROM users WHERE company_id = co.id AND active = 1) AS users,
      (SELECT COUNT(*) FROM users WHERE company_id = co.id AND active = 1 AND role = 'agent') AS agents
    FROM companies co ORDER BY co.rowid`))), i.post(`/api/platform/companies`, pe, async t => {
    let n = await m(t, H({
      name: V().min(2).max(80),
      slug: V().regex(/^[a-z0-9-]{2,30}$/),
      adminName: V().min(2).max(80),
      adminEmail: jl().max(120),
      vertical: yu([`distribution`, `club`]).default(`distribution`)
    }));
    if (k(e, `SELECT 1 FROM companies WHERE slug = ?`, n.slug)) throw new P(409, `slug_taken`, `Cet identifiant d'entreprise est déjà pris.`);
    if (k(e, `SELECT 1 FROM users WHERE email = ?`, n.adminEmail.toLowerCase())) throw new P(409, `email_taken`, `Cette adresse est déjà utilisée.`);
    let i = Fe(`co`);
    return j(e, () => {
      let a = n.vertical === `club` ? JSON.stringify({
        club: {
          refPrefix: n.slug.replace(/[^a-z]/g, ``).slice(0, 4).toUpperCase().padEnd(2, `X`)
        }
      }) : `{}`;
      A(e, `INSERT INTO companies (id, name, slug, vertical, settings_json, created_at) VALUES (?,?,?,?,?,?)`, i, n.name, n.slug, n.vertical, a, N(r())), A(e, `INSERT INTO users (id, company_id, name, email, role, created_at) VALUES (?,?,?,?,'company_admin',?)`, Fe(`usr`), i, n.adminName, n.adminEmail.toLowerCase(), N(r())), He(e, t.get(`user`), `company.created`, `company`, i, {
        name: n.name,
        vertical: n.vertical
      }, i, r());
    }), t.json({
      id: i
    });
  }), i.patch(`/api/platform/companies/:id`, pe, async t => {
    let n = await m(t, H({
      status: yu([`active`, `suspended`]).optional(),
      plan: yu([`pilote`, `standard`, `entreprise`]).optional(),
      subscriptionStatus: yu([`essai`, `actif`, `impayé`, `résilié`]).optional(),
      renewsAt: V().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
    }));
    if (!k(e, `SELECT 1 FROM companies WHERE id = ?`, _(t))) throw ze(`Entreprise`);
    return j(e, () => {
      n.status && A(e, `UPDATE companies SET status = ? WHERE id = ?`, n.status, _(t)), n.plan && A(e, `UPDATE companies SET plan = ? WHERE id = ?`, n.plan, _(t)), n.subscriptionStatus && A(e, `UPDATE companies SET subscription_status = ? WHERE id = ?`, n.subscriptionStatus, _(t)), n.renewsAt && A(e, `UPDATE companies SET subscription_renews_at = ? WHERE id = ?`, `${n.renewsAt}T00:00:00.000Z`, _(t)), He(e, t.get(`user`), `company.updated`, `company`, _(t), n, _(t), r());
    }), t.json({
      ok: !0
    });
  }), i.get(`/api/platform/audit`, pe, e => fe(e, null)), i.all(`/api/*`, () => {
    throw ze(`Ressource`);
  }), i;
}

export { Jp, Kp, Yp, qp };
