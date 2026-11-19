// GENERATED (step 1b, stage 2): v0.1.0 interface "centrale" code extracted from reference/v0.1.0/app.js.
// Rewritten as readable TSX in the following commits.
/* eslint-disable */
import { Dy } from "./field.js";
import { A_, K } from "./i18n.js";
import { G, eg, m_, ng, q } from "./lib.js";
import { $, $_, G_, H_, J, J_, K_, Q, U_, V_, W_, X, X_, Y, Z, _v, cv, fv, hv, lv, mv, pv, q_, uv, xv } from "./shared.js";

function Oy() {
  let e = Y(`/api/centrale/dashboard`, 5e3),
    t = eg();
  return (0, q.jsxs)(q.Fragment, {
    children: [(0, q.jsx)(fv, {
      title: K(`Tableau de bord`),
      sub: e.data ? K(`{0} · actualisé à {1} (toutes les 5 s)`, H_(e.data.day), V_(e.at)) : void 0
    }), (0, q.jsx)(pv, {
      q: e,
      children: e => (0, q.jsxs)(`div`, {
        className: `stack`,
        children: [(0, q.jsxs)(`div`, {
          className: `grid g4`,
          children: [(0, q.jsx)(uv, {
            label: K(`Ventes du jour`),
            value: X(e.sales.invoiced),
            hint: K(`{0} facture(s) · {1} vente(s) sur place`, e.sales.invoices, e.sales.routeSales)
          }), (0, q.jsx)(uv, {
            label: K(`Livraisons`),
            value: `${e.deliveries.done}/${e.deliveries.planned}`,
            hint: K(`{0} partielle(s) · {1} non livrée(s)`, e.deliveries.partial, e.deliveries.refused)
          }), (0, q.jsx)(uv, {
            label: K(`Encaissé confirmé (jour)`),
            value: X(e.money.confirmed),
            hint: K(`dont réglé en banque : {0}`, X(e.money.settled))
          }), (0, q.jsx)(uv, {
            label: K(`Reste à encaisser`),
            value: X(e.money.outstanding),
            hint: K(`toutes factures ouvertes`)
          })]
        }), (0, q.jsxs)(`div`, {
          className: `grid g4`,
          children: [(0, q.jsx)(uv, {
            label: K(`Paiements en attente`),
            value: e.money.pending,
            kind: e.money.pending ? `info` : ``
          }), (0, q.jsx)(uv, {
            label: K(`Paiements à vérifier`),
            value: e.money.toVerify,
            kind: e.money.toVerify ? `warn` : ``
          }), (0, q.jsx)(uv, {
            label: K(`Incidents terrain ouverts`),
            value: e.exceptions.ops,
            kind: e.exceptions.ops ? `warn` : ``
          }), (0, q.jsx)(uv, {
            label: K(`Exceptions finance ouvertes`),
            value: e.exceptions.finance,
            kind: e.exceptions.finance ? `warn` : ``
          })]
        }), (0, q.jsx)(Q, {
          title: K(`Tournées du jour`),
          flush: !0,
          children: (0, q.jsx)(mv, {
            rows: e.routes,
            rowKey: e => e.id,
            empty: K(`Aucune tournée aujourd'hui.`),
            onRow: e => t(`/centrale/tournees/${e.id}`),
            cols: [[K(`Tournée`), e => (0, q.jsx)(`strong`, {
              children: e.name
            })], [K(`Agent`), e => e.agent ?? `—`], [K(`État`), e => (0, q.jsx)(lv, {
              map: q_,
              value: e.status
            })], [K(`Commandes`), e => (0, q.jsxs)(`div`, {
              style: {
                minWidth: 110
              },
              children: [e.orders_done, `/`, e.orders_total, (0, q.jsx)(`div`, {
                className: `bar`,
                children: (0, q.jsx)(`i`, {
                  style: {
                    width: `${e.orders_total ? e.orders_done / e.orders_total * 100 : 0}%`
                  }
                })
              })]
            })], [K(`Facturé`), e => X(e.invoiced_minor), `right`], [K(`Encaissé confirmé`), e => X(e.paid_minor), `right`]]
          })
        }), (0, q.jsxs)(`div`, {
          className: `grid g2`,
          children: [(0, q.jsx)(Q, {
            title: K(`Encaissements confirmés par moyen`),
            flush: !0,
            children: (0, q.jsx)(mv, {
              rows: e.byMethod,
              rowKey: e => e.method,
              empty: K(`Aucun encaissement confirmé aujourd'hui.`),
              cols: [[K(`Moyen`), e => X_[e.method]], [K(`Nombre`), e => e.count, `right`], [K(`Montant`), e => X(e.amount_minor), `right`]]
            })
          }), (0, q.jsx)(Q, {
            title: K(`Activité récente`),
            children: (0, q.jsxs)(`ul`, {
              className: `plain small`,
              children: [e.recent.length === 0 && (0, q.jsx)(`li`, {
                className: `muted`,
                children: K(`Aucune activité.`)
              }), e.recent.map((e, t) => (0, q.jsxs)(`li`, {
                className: `row spread`,
                children: [(0, q.jsxs)(`span`, {
                  children: [(0, q.jsx)(`strong`, {
                    children: Dy[e.action] ?? e.action
                  }), ` · `, e.details.order ?? e.details.invoice ?? e.details.name ?? ``, e.details.customer ? ` · ${e.details.customer}` : ``, e.details.method ? ` · ${X_[e.details.method]}` : ``, e.details.amountMinor ? ` · ${X(e.details.amountMinor)}` : ``]
                }), (0, q.jsxs)(`span`, {
                  className: `muted nowrap`,
                  children: [Z(e.at, !0), e.actor ? ` · ${e.actor.split(` (`)[0]}` : ``]
                })]
              }, t))]
            })
          })]
        })]
      })
    })]
  });
}
function ky({
  products: e,
  lines: t,
  onChange: n,
  stockLabel: r
}) {
  return (0, q.jsx)(`ul`, {
    className: `plain`,
    children: e.map(e => (0, q.jsxs)(`li`, {
      className: `qtyrow`,
      children: [(0, q.jsxs)(`div`, {
        className: `grow`,
        children: [e.name, (0, q.jsxs)(`div`, {
          className: `small muted`,
          children: [e.sku, ` · `, X(e.price_minor), ` · `, r, ` : `, e.qty]
        })]
      }), (0, q.jsx)(hv, {
        label: K(`Quantité {0}`, e.name),
        value: t[e.id] ?? 0,
        max: 1e5,
        onChange: r => n({
          ...t,
          [e.id]: r
        })
      })]
    }, e.id))
  });
}
function Ay() {
  let e = _v(),
    {
      session: t
    } = xv(),
    n = t.user.role !== `finance`,
    [r, i] = (0, G.useState)(``),
    a = Y(`/api/centrale/orders${r ? `?status=${r}` : ``}`),
    o = Y(`/api/centrale/reference`),
    s = Y(`/api/centrale/routes`),
    c = eg(),
    [l, u] = (0, G.useState)(!1),
    [d, f] = (0, G.useState)({
      customerId: ``,
      routeId: ``,
      note: ``,
      lines: {}
    }),
    p = (s.data ?? []).filter(e => e.status === `planned`),
    m = async () => {
      await Promise.all([a.reload(), o.reload(), s.reload()]);
    },
    h = () => e.run(async () => {
      let t = Object.entries(d.lines).filter(([, e]) => e > 0).map(([e, t]) => ({
          productId: e,
          qty: t
        })),
        n = await J(`POST`, `/api/centrale/orders`, {
          customerId: d.customerId,
          routeId: d.routeId || null,
          note: d.note,
          lines: t
        });
      e.toast(K(`Commande {0} créée.`, n.number)), u(!1), f({
        customerId: ``,
        routeId: ``,
        note: ``,
        lines: {}
      }), await m();
    }),
    g = (t, n, r, i) => e.run(async () => {
      await J(`POST`, `/api/centrale/orders/${t.id}/${n}`, r), await m();
    }, i),
    _ = e => n && e.kind === `preorder` && [`confirmed`, `prepared`].includes(e.status) && (!e.route_status || e.route_status === `planned`);
  return (0, q.jsxs)(q.Fragment, {
    children: [(0, q.jsxs)(fv, {
      title: K(`Commandes`),
      sub: K(`Création, préparation et affectation aux tournées.`),
      children: [(0, q.jsxs)(`select`, {
        value: r,
        onChange: e => i(e.target.value),
        "aria-label": K(`Filtrer par état`),
        style: {
          width: `auto`
        },
        children: [(0, q.jsx)(`option`, {
          value: ``,
          children: K(`Tous les états`)
        }), Object.entries(K_).map(([e, [t]]) => (0, q.jsx)(`option`, {
          value: e,
          children: t
        }, e))]
      }), n && (0, q.jsx)(`button`, {
        onClick: () => u(!l),
        children: K(l ? `Fermer` : `Nouvelle commande`)
      })]
    }), (0, q.jsxs)(`div`, {
      className: `stack`,
      children: [l && (0, q.jsx)(pv, {
        q: o,
        children: e => (0, q.jsx)(Q, {
          title: K(`Nouvelle commande`),
          children: (0, q.jsxs)(`div`, {
            className: `stack`,
            children: [(0, q.jsxs)(`div`, {
              className: `grid g3`,
              children: [(0, q.jsx)($, {
                label: K(`Commerce`),
                children: (0, q.jsxs)(`select`, {
                  value: d.customerId,
                  onChange: e => f({
                    ...d,
                    customerId: e.target.value
                  }),
                  children: [(0, q.jsx)(`option`, {
                    value: ``,
                    children: K(`Choisir…`)
                  }), e.customers.map(e => (0, q.jsxs)(`option`, {
                    value: e.id,
                    children: [e.name, ` · `, e.zone, e.price_list ? ` · ${e.price_list}` : ``]
                  }, e.id))]
                })
              }), (0, q.jsx)($, {
                label: K(`Tournée (facultatif)`),
                children: (0, q.jsxs)(`select`, {
                  value: d.routeId,
                  onChange: e => f({
                    ...d,
                    routeId: e.target.value
                  }),
                  children: [(0, q.jsx)(`option`, {
                    value: ``,
                    children: K(`À affecter plus tard`)
                  }), p.map(e => (0, q.jsxs)(`option`, {
                    value: e.id,
                    children: [e.name, ` · `, H_(e.day)]
                  }, e.id))]
                })
              }), (0, q.jsx)($, {
                label: K(`Consigne de livraison`),
                children: (0, q.jsx)(`input`, {
                  type: `text`,
                  value: d.note,
                  onChange: e => f({
                    ...d,
                    note: e.target.value
                  })
                })
              })]
            }), (0, q.jsx)(ky, {
              products: e.products,
              lines: d.lines,
              onChange: e => f({
                ...d,
                lines: e
              }),
              stockLabel: K(`stock dépôt`)
            }), (0, q.jsx)(`div`, {
              className: `small muted`,
              children: K(`Le prix appliqué est celui de la liste de prix du commerce, fixé à la création de la commande.`)
            }), (0, q.jsx)(`div`, {
              children: (0, q.jsx)(`button`, {
                disabled: !d.customerId || !Object.values(d.lines).some(e => e > 0),
                onClick: h,
                children: K(`Créer la commande`)
              })
            })]
          })
        })
      }), (0, q.jsx)(Q, {
        title: K(`Commandes`),
        flush: !0,
        children: (0, q.jsx)(pv, {
          q: a,
          children: t => (0, q.jsx)(mv, {
            rows: t,
            rowKey: e => e.id,
            empty: K(`Aucune commande.`),
            onRow: e => c(`/centrale/commandes/${e.id}`),
            cols: [[`N°`, e => (0, q.jsx)(`strong`, {
              children: e.number
            })], [K(`Type`), e => e.kind === `route_sale` ? K(`Vente sur place`) : K(`Commande`)], [K(`Commerce`), e => (0, q.jsxs)(q.Fragment, {
              children: [e.customer, (0, q.jsx)(`div`, {
                className: `small muted`,
                children: e.zone
              })]
            })], [K(`État`), e => (0, q.jsx)(lv, {
              map: K_,
              value: e.status
            })], [K(`Tournée`), e => _(e) ? (0, q.jsxs)(`select`, {
              value: e.route_id ?? ``,
              onClick: e => e.stopPropagation(),
              onChange: t => g(e, `assign`, {
                routeId: t.target.value || null
              }, K(`Affectation enregistrée.`)),
              "aria-label": K(`Tournée de {0}`, e.number),
              children: [(0, q.jsx)(`option`, {
                value: ``,
                children: K(`Non affectée`)
              }), p.map(e => (0, q.jsx)(`option`, {
                value: e.id,
                children: e.name
              }, e.id))]
            }) : e.route ?? `—`], [K(`Commandé`), e => X(e.ordered_minor), `right`], [K(`Facture`), e => e.invoice_number ? (0, q.jsxs)(q.Fragment, {
              children: [X(e.invoice_minor), ` `, (0, q.jsx)(lv, {
                map: U_,
                value: e.invoice_status
              })]
            }) : `—`], [``, t => _(t) ? (0, q.jsxs)(`div`, {
              className: `row`,
              onClick: e => e.stopPropagation(),
              children: [t.status === `confirmed` && (0, q.jsx)(`button`, {
                className: `sm`,
                onClick: () => g(t, `status`, {
                  status: `prepared`
                }, K(`{0} préparée.`, t.number)),
                children: K(`Marquer préparée`)
              }), t.status === `prepared` && (0, q.jsx)(`button`, {
                className: `sm secondary`,
                onClick: () => g(t, `status`, {
                  status: `confirmed`
                }, K(`Préparation annulée.`)),
                children: K(`Annuler la préparation`)
              }), (0, q.jsx)(`button`, {
                className: `sm danger`,
                onClick: async () => {
                  (await e.ask({
                    kind: `confirm`,
                    title: K(`Annuler {0} ?`, t.number),
                    danger: !0,
                    confirm: K(`Annuler la commande`)
                  })) && (await g(t, `status`, {
                    status: `cancelled`
                  }, K(`Commande annulée.`)));
                },
                children: K(`Annuler`)
              })]
            }) : null]]
          })
        })
      })]
    })]
  });
}
var jy = {
  invoice: K(`Facture`),
  payment: K(`Encaissement`),
  settlement: K(`Règlement bancaire`),
  refund: K(`Remboursement`)
};
function My({
  back: e
}) {
  let {
      id: t
    } = ng(),
    n = Y(`/api/chain/${t}`);
  return (0, q.jsx)(pv, {
    q: n,
    children: t => {
      let n = t.payments.filter(e => e.settlement_status === `settled`).reduce((e, t) => e + t.amount_minor - t.refunded_minor, 0),
        r = [[K(`Commande`), t.order.number, K_[t.order.status]?.[0] ?? t.order.status], [K(`Livraison`), t.delivery ? Z(t.delivery.at, !0) : `—`, t.delivery ? {
          full: K(`Complète`),
          partial: K(`Partielle`),
          refused: K(`Refusée`)
        }[t.delivery.outcome] ?? `` : K(`À faire`)], [K(`Facture`), t.invoice ? `${t.invoice.number} · ${X(t.invoice.amount_minor)}` : `—`, t.invoice ? U_[t.invoice.status][0] : K(`Aucune`)], [K(`Transaction`), t.payments.length ? `${t.payments.length} tentative(s)` : `—`, t.invoice ? K(`{0} confirmé`, X(t.invoice.paid_minor - t.invoice.refunded_minor)) : ``], [K(`Règlement bancaire`), X(n), t.invoice && n >= t.invoice.amount_minor ? K(`Réglé`) : K(n > 0 ? `Partiel` : `Non réglé`)], [`ERP`, `${t.erp.filter(e => e.status === `synced`).length}/${t.erp.length} écriture(s)`, t.erp.some(e => e.status === `failed`) ? K(`En erreur`) : t.erp.length && t.erp.every(e => e.status === `synced`) ? K(`Synchronisé`) : K(`En attente`)]];
      return (0, q.jsxs)(q.Fragment, {
        children: [(0, q.jsx)(fv, {
          title: `${t.order.number} · ${t.order.customer}`,
          sub: (0, q.jsxs)(q.Fragment, {
            children: [(0, q.jsx)(m_, {
              to: e,
              children: K(`← Retour`)
            }), ` · `, t.order.kind === `route_sale` ? K(`Vente sur place`) : K(`Commande`), t.order.route ? ` · ${t.order.route}` : ``, ` `, K(`· créée le`), ` `, Z(t.order.created_at, !0), t.order.created_by_name ? ` par ${t.order.created_by_name}` : ``]
          })
        }), (0, q.jsxs)(`div`, {
          className: `stack`,
          children: [(0, q.jsx)(`ol`, {
            className: `chain`,
            children: r.map(([e, t, n]) => (0, q.jsxs)(`li`, {
              children: [(0, q.jsx)(`div`, {
                className: `small muted`,
                children: e
              }), (0, q.jsx)(`strong`, {
                children: t
              }), (0, q.jsx)(`div`, {
                className: `small`,
                children: n
              })]
            }, e))
          }), (0, q.jsxs)(`div`, {
            className: `grid g2`,
            children: [(0, q.jsx)(Q, {
              title: K(`Lignes`),
              flush: !0,
              children: (0, q.jsx)(mv, {
                rows: t.lines,
                rowKey: e => e.id,
                empty: `—`,
                cols: [[K(`Produit`), e => (0, q.jsxs)(q.Fragment, {
                  children: [e.product, (0, q.jsx)(`div`, {
                    className: `small muted`,
                    children: e.sku
                  })]
                })], [K(`Commandé`), e => e.qty_ordered, `right`], [K(`Livré`), e => t.delivery ? e.qty_delivered : `—`, `right`], [K(`Prix`), e => X(e.unit_price_minor), `right`], [K(`Facturé`), e => t.delivery ? X(e.qty_delivered * e.unit_price_minor) : `—`, `right`]]
              })
            }), (0, q.jsx)(Q, {
              title: K(`Livraison et preuve`),
              children: t.delivery ? (0, q.jsxs)(`dl`, {
                className: `kv`,
                children: [(0, q.jsx)(`dt`, {
                  children: K(`Agent`)
                }), (0, q.jsx)(`dd`, {
                  children: t.delivery.agent
                }), (0, q.jsx)(`dt`, {
                  children: K(`Date du geste`)
                }), (0, q.jsxs)(`dd`, {
                  children: [Z(t.delivery.at, !0), ` `, t.delivery.offline ? (0, q.jsxs)(cv, {
                    kind: `warn`,
                    children: [K(`saisi hors ligne, synchronisé`), ` `, Z(t.delivery.synced_at, !0)]
                  }) : null]
                }), t.delivery.reason && (0, q.jsxs)(q.Fragment, {
                  children: [(0, q.jsx)(`dt`, {
                    children: K(`Motif`)
                  }), (0, q.jsx)(`dd`, {
                    children: t.delivery.reason
                  })]
                }), t.delivery.returns_minor > 0 && (0, q.jsxs)(q.Fragment, {
                  children: [(0, q.jsx)(`dt`, {
                    children: K(`Retours`)
                  }), (0, q.jsxs)(`dd`, {
                    children: [JSON.parse(t.delivery.returns_json).map(e => `${e.qty} × ${e.product}`).join(`, `), ` · `, X(-t.delivery.returns_minor)]
                  })]
                }), (0, q.jsx)(`dt`, {
                  children: K(`Reçu par`)
                }), (0, q.jsx)(`dd`, {
                  children: t.delivery.pod_name || `—`
                }), t.delivery.pod_signature && (0, q.jsxs)(q.Fragment, {
                  children: [(0, q.jsx)(`dt`, {
                    children: K(`Signature`)
                  }), (0, q.jsx)(`dd`, {
                    children: (0, q.jsx)(`img`, {
                      className: `sigimg`,
                      src: t.delivery.pod_signature,
                      alt: K(`Signature du réceptionnaire`)
                    })
                  })]
                })]
              }) : (0, q.jsxs)(`div`, {
                className: `muted`,
                children: [K(`Pas encore livrée.`), t.order.note ? K(` Consigne : {0}`, t.order.note) : ``]
              })
            })]
          }), (0, q.jsx)(Q, {
            title: K(`Transactions`),
            flush: !0,
            children: (0, q.jsx)(mv, {
              rows: t.payments,
              rowKey: e => e.id,
              empty: K(`Aucune tentative de paiement.`),
              cols: [[K(`Créée`), e => Z(e.created_at, !0)], [K(`Moyen`), e => X_[e.method]], [K(`Montant`), e => (0, q.jsxs)(q.Fragment, {
                children: [X(e.amount_minor), e.refunded_minor ? (0, q.jsxs)(`div`, {
                  className: `small muted`,
                  children: [K(`remboursé`), ` `, X(e.refunded_minor)]
                }) : null]
              }), `right`], [K(`Paiement`), e => (0, q.jsxs)(q.Fragment, {
                children: [(0, q.jsx)(lv, {
                  map: W_,
                  value: e.status
                }), e.confirmed_via && (0, q.jsxs)(`div`, {
                  className: `small muted`,
                  children: [K(`par`), ` `, $_[e.confirmed_via]]
                }), (e.failure_reason || e.verify_reason) && (0, q.jsx)(`div`, {
                  className: `small muted`,
                  children: K(e.failure_reason ?? e.verify_reason ?? ``)
                })]
              })], [K(`Règlement`), e => [`confirmed`, `refunded`].includes(e.status) ? (0, q.jsxs)(q.Fragment, {
                children: [(0, q.jsx)(lv, {
                  map: G_,
                  value: e.settlement_status
                }), e.settled_at && (0, q.jsx)(`div`, {
                  className: `small muted`,
                  children: Z(e.settled_at)
                })]
              }) : `—`], [K(`Frais`), e => e.fee_actual_minor === null ? e.status === `confirmed` ? (0, q.jsxs)(`span`, {
                className: `muted`,
                children: [X(e.fee_expected_minor), ` `, K(`attendu`)]
              }) : `—` : (0, q.jsxs)(q.Fragment, {
                children: [X(e.fee_actual_minor), e.fee_actual_minor !== e.fee_expected_minor && (0, q.jsxs)(`div`, {
                  className: `small muted`,
                  children: [K(`attendu`), ` `, X(e.fee_expected_minor)]
                })]
              }), `right`], [K(`Référence`), e => (0, q.jsx)(`span`, {
                className: `code`,
                children: e.provider_ref ?? `—`
              })], [K(`Agent`), e => e.agent ?? `—`]]
            })
          }), (0, q.jsx)(Q, {
            title: K(`Écritures ERP`),
            flush: !0,
            children: (0, q.jsx)(mv, {
              rows: t.erp,
              rowKey: e => e.id,
              empty: K(`Aucune écriture.`),
              cols: [[K(`Type`), e => jy[e.kind] ?? e.kind], [K(`Libellé`), e => e.label], [K(`Montant`), e => X(e.amount_minor), `right`], [K(`État`), e => (0, q.jsx)(lv, {
                map: J_,
                value: e.status
              })], [K(`Référence ERP`), e => e.external_ref ? (0, q.jsx)(`span`, {
                className: `code`,
                children: e.external_ref
              }) : e.last_error ?? `—`], [K(`Tentatives`), e => e.attempts, `right`]]
            })
          })]
        })]
      });
    }
  });
}
function Ny() {
  let e = _v(),
    {
      session: t
    } = xv(),
    n = t.user.role !== `finance`,
    r = Y(`/api/centrale/routes`),
    i = Y(`/api/centrale/reference`),
    a = eg(),
    [o, s] = (0, G.useState)(!1),
    [c, l] = (0, G.useState)({
      name: ``,
      day: t.today,
      agentId: ``,
      vehicle: ``,
      customerIds: []
    }),
    u = () => e.run(async () => {
      let e = await J(`POST`, `/api/centrale/routes`, {
        ...c,
        agentId: c.agentId || null
      });
      a(`/centrale/tournees/${e.id}`);
    }, K(`Tournée créée.`)),
    d = e => l(t => ({
      ...t,
      customerIds: t.customerIds.includes(e) ? t.customerIds.filter(t => t !== e) : [...t.customerIds, e]
    }));
  return (0, q.jsxs)(q.Fragment, {
    children: [(0, q.jsx)(fv, {
      title: K(`Tournées`),
      sub: K(`Organisation, affectation des agents et chargement des véhicules.`),
      children: n && (0, q.jsx)(`button`, {
        onClick: () => s(!o),
        children: K(o ? `Fermer` : `Nouvelle tournée`)
      })
    }), (0, q.jsxs)(`div`, {
      className: `stack`,
      children: [o && (0, q.jsx)(pv, {
        q: i,
        children: e => (0, q.jsx)(Q, {
          title: K(`Nouvelle tournée`),
          children: (0, q.jsxs)(`div`, {
            className: `stack`,
            children: [(0, q.jsxs)(`div`, {
              className: `grid g4`,
              children: [(0, q.jsx)($, {
                label: K(`Nom`),
                children: (0, q.jsx)(`input`, {
                  type: `text`,
                  value: c.name,
                  onChange: e => l({
                    ...c,
                    name: e.target.value
                  }),
                  placeholder: K(`Ex. Est - Flacq`)
                })
              }), (0, q.jsx)($, {
                label: K(`Jour`),
                children: (0, q.jsx)(`input`, {
                  type: `date`,
                  value: c.day,
                  onChange: e => l({
                    ...c,
                    day: e.target.value
                  })
                })
              }), (0, q.jsx)($, {
                label: K(`Agent`),
                children: (0, q.jsxs)(`select`, {
                  value: c.agentId,
                  onChange: e => l({
                    ...c,
                    agentId: e.target.value
                  }),
                  children: [(0, q.jsx)(`option`, {
                    value: ``,
                    children: K(`À affecter`)
                  }), e.agents.map(e => (0, q.jsx)(`option`, {
                    value: e.id,
                    children: e.name
                  }, e.id))]
                })
              }), (0, q.jsx)($, {
                label: K(`Véhicule`),
                children: (0, q.jsx)(`input`, {
                  type: `text`,
                  value: c.vehicle,
                  onChange: e => l({
                    ...c,
                    vehicle: e.target.value
                  })
                })
              })]
            }), (0, q.jsxs)(`div`, {
              children: [(0, q.jsx)(`div`, {
                className: `small muted`,
                style: {
                  marginBottom: 6
                },
                children: K(`Commerces à visiter, dans l'ordre de sélection`)
              }), (0, q.jsx)(`div`, {
                className: `chips`,
                children: e.customers.map(e => (0, q.jsxs)(`label`, {
                  className: `chip ${c.customerIds.includes(e.id) ? `on` : ``}`,
                  children: [(0, q.jsx)(`input`, {
                    type: `checkbox`,
                    checked: c.customerIds.includes(e.id),
                    onChange: () => d(e.id)
                  }), c.customerIds.includes(e.id) ? `${c.customerIds.indexOf(e.id) + 1}. ` : ``, e.name, ` · `, e.zone]
                }, e.id))
              })]
            }), (0, q.jsx)(`div`, {
              children: (0, q.jsx)(`button`, {
                disabled: c.name.trim().length < 2 || !c.day,
                onClick: u,
                children: K(`Créer la tournée`)
              })
            })]
          })
        })
      }), (0, q.jsx)(Q, {
        title: K(`Tournées`),
        flush: !0,
        children: (0, q.jsx)(pv, {
          q: r,
          children: e => (0, q.jsx)(mv, {
            rows: e,
            rowKey: e => e.id,
            empty: K(`Aucune tournée.`),
            onRow: e => a(`/centrale/tournees/${e.id}`),
            cols: [[K(`Jour`), e => H_(e.day)], [K(`Tournée`), e => (0, q.jsx)(`strong`, {
              children: e.name
            })], [K(`Agent`), e => e.agent ?? (0, q.jsx)(cv, {
              kind: `warn`,
              children: K(`À affecter`)
            })], [K(`Véhicule`), e => e.vehicle || `—`], [K(`État`), e => (0, q.jsx)(lv, {
              map: q_,
              value: e.status
            })], [K(`Arrêts`), e => e.stops, `right`], [K(`Commandes`), e => `${e.orders_done}/${e.orders_total}`, `right`], [K(`Facturé`), e => X(e.invoiced_minor), `right`], [K(`Encaissé confirmé`), e => X(e.paid_minor), `right`]]
          })
        })
      })]
    })]
  });
}
function Py() {
  let {
      id: e
    } = ng(),
    t = _v(),
    {
      session: n
    } = xv(),
    r = n.user.role !== `finance`,
    i = Y(`/api/centrale/routes/${e}`, 5e3),
    a = Y(`/api/centrale/reference`),
    o = eg(),
    [s, c] = (0, G.useState)({});
  return (0, q.jsx)(pv, {
    q: i,
    children: n => {
      let l = n.route,
        u = l.status === `planned`,
        d = n.orderList.filter(e => e.status === `confirmed`),
        f = (n, r) => t.run(async () => {
          await J(`PATCH`, `/api/centrale/routes/${e}`, n), await i.reload();
        }, r),
        p = () => t.run(async () => {
          await J(`POST`, `/api/centrale/routes/${e}/load`, {
            extras: Object.entries(s).filter(([, e]) => e > 0).map(([e, t]) => ({
              productId: e,
              qty: t
            }))
          }), c({}), await Promise.all([i.reload(), a.reload()]);
        }, K(`Véhicule chargé : la tournée peut démarrer.`));
      return (0, q.jsxs)(q.Fragment, {
        children: [(0, q.jsx)(fv, {
          title: l.name,
          sub: (0, q.jsxs)(q.Fragment, {
            children: [(0, q.jsx)(m_, {
              to: `/centrale/tournees`,
              children: K(`← Tournées`)
            }), ` · `, H_(l.day), ` · `, l.vehicle || K(`véhicule non précisé`), l.started_at ? K(` · démarrée {0}`, Z(l.started_at, !0)) : ``, l.closed_at ? K(` · clôturée {0}`, Z(l.closed_at, !0)) : ``]
          }),
          children: (0, q.jsx)(lv, {
            map: q_,
            value: l.status
          })
        }), (0, q.jsxs)(`div`, {
          className: `stack`,
          children: [(0, q.jsxs)(`div`, {
            className: `grid g4`,
            children: [(0, q.jsx)(uv, {
              label: K(`Commandes traitées`),
              value: `${n.orders.delivered + n.orders.partial + n.orders.refused}/${n.orders.total}`,
              hint: K(`{0} partielle(s) · {1} non livrée(s) · {2} vente(s) sur place`, n.orders.partial, n.orders.refused, n.orders.routeSales)
            }), (0, q.jsx)(uv, {
              label: K(`Facturé`),
              value: X(n.money.invoiced)
            }), (0, q.jsx)(uv, {
              label: K(`Encaissé confirmé`),
              value: X(n.money.confirmed),
              hint: K(`réglé en banque : {0}`, X(n.money.settled))
            }), (0, q.jsx)(uv, {
              label: K(`Reste à encaisser`),
              value: X(n.money.invoiced - n.money.confirmed),
              hint: K(`{0} en attente · {1} à vérifier`, X(n.money.pending), X(n.money.toVerify))
            })]
          }), r && l.status !== `closed` && l.status !== `in_progress` && (0, q.jsx)(pv, {
            q: a,
            children: e => (0, q.jsx)(Q, {
              title: K(`Agent et chargement`),
              children: (0, q.jsxs)(`div`, {
                className: `stack`,
                children: [(0, q.jsx)(`div`, {
                  className: `grid g3`,
                  children: (0, q.jsx)($, {
                    label: K(`Agent affecté`),
                    children: (0, q.jsxs)(`select`, {
                      value: l.agent_id ?? ``,
                      onChange: e => f({
                        agentId: e.target.value || null
                      }, K(`Agent affecté.`)),
                      children: [(0, q.jsx)(`option`, {
                        value: ``,
                        children: K(`À affecter`)
                      }), e.agents.map(e => (0, q.jsx)(`option`, {
                        value: e.id,
                        children: e.name
                      }, e.id))]
                    })
                  })
                }), u && (0, q.jsxs)(q.Fragment, {
                  children: [d.length > 0 && (0, q.jsxs)(`div`, {
                    className: `notice warn`,
                    children: [K(`À préparer avant le chargement :`), ` `, d.map(e => e.number).join(`, `), ` `, K(`(page Commandes).`)]
                  }), (0, q.jsxs)(`div`, {
                    children: [(0, q.jsx)(`strong`, {
                      children: K(`Stock de vente libre à charger`)
                    }), (0, q.jsx)(`div`, {
                      className: `small muted`,
                      children: K(`En plus des commandes préparées, pour les ventes sur place.`)
                    })]
                  }), (0, q.jsx)(ky, {
                    products: e.products,
                    lines: s,
                    onChange: c,
                    stockLabel: K(`stock dépôt`)
                  }), (0, q.jsx)(`div`, {
                    children: (0, q.jsx)(`button`, {
                      disabled: d.length > 0 || !l.agent_id,
                      onClick: p,
                      children: K(`Charger le véhicule`)
                    })
                  })]
                })]
              })
            })
          }), (0, q.jsxs)(`div`, {
            className: `grid g2`,
            children: [(0, q.jsx)(Q, {
              title: K(`Arrêts`),
              flush: !0,
              children: (0, q.jsx)(mv, {
                rows: n.stops,
                rowKey: e => e.customer_id,
                empty: K(`Aucun arrêt.`),
                cols: [[`#`, e => e.seq], [K(`Commerce`), e => e.name], [K(`Zone`), e => e.zone]]
              })
            }), (0, q.jsx)(Q, {
              title: K(`Stock du véhicule`),
              flush: !0,
              children: (0, q.jsx)(mv, {
                rows: n.stock,
                rowKey: e => e.product_id,
                empty: K(`Véhicule non chargé.`),
                cols: [[K(`Produit`), e => e.name], [K(`Chargé`), e => e.loaded_qty, `right`], [K(`Sorti`), e => e.loaded_qty - e.qty, `right`], [K(`À bord`), e => (0, q.jsx)(cv, {
                  kind: e.qty < 0 ? `err` : ``,
                  children: e.qty
                }), `right`], [K(`Retours`), e => e.returned_qty || ``, `right`]]
              })
            })]
          }), (0, q.jsx)(Q, {
            title: K(`Commandes et ventes de la tournée`),
            flush: !0,
            children: (0, q.jsx)(mv, {
              rows: n.orderList,
              rowKey: e => e.id,
              empty: K(`Aucune commande affectée.`),
              onRow: e => o(`/centrale/commandes/${e.id}`),
              cols: [[`N°`, e => (0, q.jsx)(`strong`, {
                children: e.number
              })], [K(`Type`), e => e.kind === `route_sale` ? K(`Vente sur place`) : K(`Commande`)], [K(`Commerce`), e => e.customer], [K(`État`), e => (0, q.jsx)(lv, {
                map: K_,
                value: e.status
              })], [K(`Commandé`), e => X(e.ordered_minor), `right`], [K(`Facture`), e => e.invoice_number ? (0, q.jsxs)(q.Fragment, {
                children: [X(e.invoice_minor), ` `, (0, q.jsx)(lv, {
                  map: U_,
                  value: e.invoice_status
                })]
              }) : `—`]]
            })
          })]
        })]
      });
    }
  });
}
var Fy = {
  load: K(`Chargement véhicule`),
  delivery: K(`Livraison`),
  sale: K(`Vente sur place`),
  return: K(`Retour client (véhicule)`),
  unload: K(`Retour au dépôt`),
  return_in: K(`Retours clients à contrôler`),
  adjust: K(`Ajustement`)
};
function Iy() {
  let e = _v(),
    {
      session: t
    } = xv(),
    n = t.user.role !== `finance`,
    r = Y(`/api/centrale/stock`, 1e4),
    [i, a] = (0, G.useState)(null),
    o = () => e.run(async () => {
      await J(`POST`, `/api/centrale/stock/adjust`, {
        productId: i.id,
        delta: i.delta,
        reason: i.reason
      }), a(null), await r.reload();
    }, K(`Ajustement enregistré et tracé.`));
  return (0, q.jsxs)(q.Fragment, {
    children: [(0, q.jsx)(fv, {
      title: K(`Stocks`),
      sub: K(`Dépôt, véhicules en tournée et mouvements.`)
    }), (0, q.jsx)(pv, {
      q: r,
      children: e => (0, q.jsxs)(`div`, {
        className: `stack`,
        children: [i && (0, q.jsx)(Q, {
          title: K(`Ajuster le stock · {0}`, i.name),
          children: (0, q.jsxs)(`div`, {
            className: `grid g3`,
            children: [(0, q.jsx)($, {
              label: K(`Variation (négative pour une sortie)`),
              children: (0, q.jsx)(`input`, {
                type: `number`,
                step: 1,
                value: i.delta,
                onChange: e => a({
                  ...i,
                  delta: Math.trunc(Number(e.target.value) || 0)
                })
              })
            }), (0, q.jsx)($, {
              label: K(`Motif (obligatoire)`),
              children: (0, q.jsx)(`input`, {
                type: `text`,
                value: i.reason,
                onChange: e => a({
                  ...i,
                  reason: e.target.value
                }),
                placeholder: K(`Ex. casse, inventaire, réception`)
              })
            }), (0, q.jsxs)(`div`, {
              className: `row`,
              style: {
                alignItems: `flex-end`
              },
              children: [(0, q.jsx)(`button`, {
                disabled: !i.delta || i.reason.trim().length < 3,
                onClick: o,
                children: K(`Enregistrer`)
              }), (0, q.jsx)(`button`, {
                className: `secondary`,
                onClick: () => a(null),
                children: K(`Annuler`)
              })]
            })]
          })
        }), (0, q.jsx)(Q, {
          title: K(`Stock par produit`),
          flush: !0,
          children: (0, q.jsx)(mv, {
            rows: e.warehouse,
            rowKey: e => e.id,
            empty: K(`Aucun produit.`),
            cols: [[K(`Produit`), e => (0, q.jsxs)(q.Fragment, {
              children: [e.name, (0, q.jsxs)(`div`, {
                className: `small muted`,
                children: [e.sku, ` · `, e.unit]
              })]
            })], [K(`Prix de base`), e => X(e.price_minor), `right`], [K(`Au dépôt`), e => (0, q.jsx)(`strong`, {
              children: e.qty
            }), `right`], [K(`Réservé (commandes)`), e => (0, q.jsx)(`span`, {
              className: e.reserved > e.qty ? `badge err` : ``,
              children: e.reserved
            }), `right`], [K(`Sur les véhicules`), e => e.on_vehicles, `right`], [``, e => n ? (0, q.jsx)(`button`, {
              className: `sm secondary`,
              onClick: () => a({
                id: e.id,
                name: e.name,
                delta: 0,
                reason: ``
              }),
              children: K(`Ajuster`)
            }) : null]]
          })
        }), (0, q.jsx)(Q, {
          title: K(`Derniers mouvements`),
          flush: !0,
          children: (0, q.jsx)(mv, {
            rows: e.movements,
            rowKey: e => e.id,
            empty: K(`Aucun mouvement.`),
            cols: [[K(`Date`), e => Z(e.at, !0)], [K(`Mouvement`), e => Fy[e.type] ?? e.type], [K(`Produit`), e => e.product], [K(`Quantité`), e => e.qty > 0 ? `+${e.qty}` : e.qty, `right`], [K(`Référence`), e => e.ref ?? `—`], [K(`Note`), e => e.note || `—`], [K(`Par`), e => e.actor ?? `—`]]
          })
        })]
      })
    })]
  });
}
var Ly = {
  order: `Order`,
  customer: `Outlet`,
  reason: `Reason`,
  invoice: `Invoice`,
  reference: `Reference`,
  providerRef: `Reference`,
  method: `Method`,
  amountMinor: `Amount`,
  returnsMinor: `Returns`,
  shownMinor: `Shown to agent`,
  invoicedMinor: `Invoiced`,
  notifiedMinor: `Notified`,
  expectedMinor: `Expected`,
  paidMinor: `Collected`,
  grossMinor: `Credited`,
  creditedMinor: `Credited`,
  feeMinor: `Fee charged`,
  valueDate: `Value date`,
  qty: `Quantity`,
  error: `Error`,
  member: `Member`,
  label: `Bank label`
};
function Ry(e) {
  return A_() === `fr` ? e.message : Object.entries(e.details ?? {}).filter(([e, t]) => Ly[e] && (typeof t == `string` || typeof t == `number`)).map(([e, t]) => `${Ly[e]}: ${e.endsWith(`Minor`) ? X(t) : e === `method` ? X_[t] ?? t : K(String(t))}`).join(` · `) || e.message;
}

export { Ay, Fy, Iy, Ly, My, Ny, Oy, Py, Ry, jy, ky };
