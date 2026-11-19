// GENERATED (step 1b, stage 2): v0.1.0 interface "field" code extracted from reference/v0.1.0/app.js.
// Rewritten as readable TSX in the following commits.
/* eslint-disable */
import { K } from "./i18n.js";
import { G, Yv, eg, q } from "./lib.js";
import { $, $_, $v, H_, J, K_, N_, Qv, R_, U_, V_, W_, X, X_, Y, Z, _v, cv, cy, ey, hv, iy, lv, ly, ny, pv, q_, ry, sy, ty, xv, yv, z_ } from "./shared.js";

function uy() {
  let {
      session: e,
      refresh: t
    } = xv(),
    n = eg(),
    r = e.user,
    [i, a] = (0, G.useState)(() => ny(r.id)),
    o = (0, G.useCallback)(e => {
      ry(r.id, e), a(e);
    }, [r.id]),
    s = (0, G.useCallback)(() => o(null), [o]);
  return (0, q.jsx)(`div`, {
    className: `mobile`,
    children: i ? (0, q.jsx)(fy, {
      routeId: i,
      onLeave: s
    }, i) : (0, q.jsx)(dy, {
      onPick: o,
      onLogout: async () => {
        await J(`POST`, `/api/logout`).catch(() => null), await t(), n(`/`);
      }
    })
  });
}
function dy({
  onPick: e,
  onLogout: t
}) {
  let {
      session: n
    } = xv(),
    r = _v(),
    i = Y(`/api/agent/routes`),
    a = t => r.run(async () => {
      t.status === `loaded` && (await J(`POST`, `/api/agent/routes/${t.id}/start`)), ty(await J(`GET`, `/api/agent/routes/${t.id}/bundle`)), e(t.id);
    });
  return (0, q.jsxs)(`div`, {
    className: `stack`,
    children: [(0, q.jsxs)(`div`, {
      className: `mobile-head`,
      children: [(0, q.jsxs)(`div`, {
        className: `row spread`,
        children: [(0, q.jsx)(`h1`, {
          children: K(`Mes tournées`)
        }), (0, q.jsxs)(`span`, {
          className: `row`,
          children: [(0, q.jsx)(yv, {}), (0, q.jsx)(`button`, {
            className: `sm ghost`,
            onClick: t,
            children: K(`Déconnexion`)
          })]
        })]
      }), (0, q.jsxs)(`div`, {
        className: `muted`,
        children: [n.user.name, ` · `, n.user.companyName]
      })]
    }), (0, q.jsx)(pv, {
      q: i,
      children: e => e.length === 0 ? (0, q.jsx)(`div`, {
        className: `empty`,
        children: K(`Aucune tournée ne vous est affectée.`)
      }) : (0, q.jsx)(`ul`, {
        className: `plain tap`,
        children: e.map(e => (0, q.jsxs)(`li`, {
          children: [(0, q.jsxs)(`div`, {
            className: `row spread`,
            children: [(0, q.jsx)(`strong`, {
              children: e.name
            }), (0, q.jsx)(lv, {
              map: q_,
              value: e.status
            })]
          }), (0, q.jsxs)(`div`, {
            className: `small muted`,
            children: [H_(e.day), ` · `, e.vehicle || K(`véhicule non précisé`), ` · `, e.stops, ` `, K(`arrêt(s) ·`), ` `, e.orders_done, `/`, e.orders_total, ` `, K(`commande(s)`)]
          }), (0, q.jsx)(`div`, {
            style: {
              marginTop: 8
            },
            children: e.status === `planned` ? (0, q.jsx)(`div`, {
              className: `notice`,
              children: K(`Le véhicule n'est pas encore chargé par la centrale.`)
            }) : (0, q.jsx)(`button`, {
              className: `big`,
              onClick: () => a(e),
              children: e.status === `loaded` ? K(`Démarrer la tournée`) : e.status === `in_progress` ? K(`Reprendre la tournée`) : K(`Voir le bilan`)
            })
          })]
        }, e.id))
      })
    })]
  });
}
function fy({
  routeId: e,
  onLeave: t
}) {
  let {
      session: n
    } = xv(),
    r = n.user.id,
    i = _v(),
    a = sy(),
    [o, s] = (0, G.useState)(() => ey(e)),
    [c, l] = (0, G.useState)(() => Qv(r)),
    [u, d] = (0, G.useState)(null),
    [f, p] = (0, G.useState)(!1),
    [m, h] = (0, G.useState)({
      name: `home`
    }),
    [g, _] = (0, G.useState)(`route`),
    v = (0, G.useRef)(!1),
    y = (0, G.useCallback)(e => {
      $v(r, e), l(e);
    }, [r]),
    b = (0, G.useCallback)(async () => {
      let t = new Map();
      if (v.current) return t;
      v.current = !0, p(!0);
      try {
        let n = Qv(r).filter(e => e.state === `queued`);
        if (n.length) {
          let e = await J(`POST`, `/api/agent/sync`, {
              actions: n.map(({
                id: e,
                type: t,
                payload: n
              }) => ({
                id: e,
                type: t,
                payload: n
              }))
            }),
            i = Qv(r);
          for (let n of e.results) t.set(n.id, n), i = n.status === `rejected` ? i.map(e => e.id === n.id ? {
            ...e,
            state: `rejected`,
            message: n.message ? N_(n.code ?? ``, n.message) : void 0
          } : e) : i.filter(e => e.id !== n.id);
          y(i);
        }
        let i = await J(`GET`, `/api/agent/routes/${e}/bundle`);
        ty(i), s(i), d(Date.now());
      } finally {
        v.current = !1, p(!1);
      }
      return t;
    }, [r, e, y]);
  (0, G.useEffect)(() => {
    if (!a.online) return;
    let e = () => {
      b().catch(e => {
        (e.status === 404 || e.status === 403) && t();
      });
    };
    e();
    let n = setInterval(e, 2e4);
    return () => clearInterval(n);
  }, [a.online, b, t]);
  let ee = async e => {
      if (y([...Qv(r), e]), !a.online) return i.toast(K(`Enregistré sur le téléphone. Synchronisation au retour du réseau.`)), null;
      try {
        return (await b()).get(e.id) ?? null;
      } catch {
        return i.toast(K(`Réseau instable : action conservée, elle sera synchronisée automatiquement.`)), null;
      }
    },
    x = (0, G.useMemo)(() => o ? ly(o, c) : null, [o, c]);
  if (!o || !x) return (0, q.jsxs)(`div`, {
    className: `stack`,
    children: [(0, q.jsx)(`div`, {
      className: `notice warn`,
      children: K(`Tournée non disponible hors ligne : connectez-vous au réseau une première fois.`)
    }), (0, q.jsx)(`button`, {
      className: `secondary`,
      onClick: t,
      children: K(`Retour`)
    })]
  });
  let S = c.filter(e => e.state === `queued`).length,
    C = c.filter(e => e.state === `rejected`),
    w = o.route.status === `closed`,
    te = e => {
      h(e), window.scrollTo(0, 0);
    },
    T = (e, t) => {
      e?.status === `rejected` ? (i.toast(e.message ? N_(e.code ?? ``, e.message) : K(`Action refusée par le serveur.`), `err`), te({
        name: `stop`,
        customerId: t
      })) : e?.result?.invoiceId ? (i.toast(K(`{0} enregistrée.`, e.result.orderNumber)), te({
        name: `pay`,
        invoiceId: e.result.invoiceId
      })) : te({
        name: `stop`,
        customerId: t
      });
    };
  return (0, q.jsxs)(`div`, {
    className: `stack`,
    children: [(0, q.jsxs)(`div`, {
      className: `mobile-head`,
      children: [(0, q.jsxs)(`div`, {
        className: `row spread`,
        children: [(0, q.jsx)(`h1`, {
          children: o.route.name
        }), (0, q.jsxs)(`span`, {
          className: `row`,
          children: [(0, q.jsx)(yv, {}), (0, q.jsx)(`button`, {
            className: `sm ghost`,
            onClick: t,
            children: K(`Tournées`)
          })]
        })]
      }), (0, q.jsxs)(`div`, {
        className: `muted`,
        children: [H_(o.route.day), ` · `, o.route.vehicle]
      })]
    }), (0, q.jsxs)(`div`, {
      className: `syncbar ${a.online ? S ? `warn` : `ok` : `off`}`,
      role: `status`,
      children: [(0, q.jsxs)(`div`, {
        children: [(0, q.jsx)(`strong`, {
          children: a.online ? K(`En ligne`) : K(`Hors ligne`)
        }), ` · `, S ? K(`{0} action(s) à synchroniser`, S) : K(`tout est synchronisé`), (0, q.jsx)(`div`, {
          className: `small`,
          children: f ? K(`Synchronisation…`) : u ? K(`Dernière synchro {0}`, V_(u)) : K(`Données du {0}`, Z(o.generatedAt, !0))
        })]
      }), (0, q.jsxs)(`div`, {
        className: `row`,
        children: [a.online && (0, q.jsx)(`button`, {
          className: `sm secondary`,
          disabled: f,
          onClick: () => i.run(b),
          children: K(`Synchroniser`)
        }), n.demoMode && (0, q.jsx)(`button`, {
          className: `sm secondary`,
          onClick: () => a.setForced(!a.forced),
          children: a.forced ? K(`Rétablir le réseau`) : K(`Simuler hors ligne`)
        })]
      })]
    }), C.length > 0 && (0, q.jsxs)(`div`, {
      className: `notice err`,
      role: `alert`,
      children: [C.length, ` `, K(`action(s) refusée(s) par le serveur : voir l'onglet Historique.`)]
    }), m.name === `home` && (0, q.jsxs)(q.Fragment, {
      children: [(0, q.jsx)(`div`, {
        className: `tabs`,
        role: `tablist`,
        children: [[`route`, K(`Tournée`)], [`catalog`, K(`Catalogue`)], [`history`, K(`Historique`)], [`summary`, K(`Bilan`)]].map(([e, t]) => (0, q.jsx)(`button`, {
          role: `tab`,
          "aria-selected": g === e,
          onClick: () => _(e),
          children: t
        }, e))
      }), g === `route` && (0, q.jsx)(gy, {
        work: x,
        onOpen: e => te({
          name: `stop`,
          customerId: e
        }),
        closed: w
      }), g === `catalog` && (0, q.jsx)(wy, {
        work: x
      }), g === `history` && (0, q.jsx)(Ty, {
        work: x,
        queue: c,
        onDrop: e => y(Qv(r).filter(t => t.id !== e)),
        onInvoice: e => te({
          name: `receipt`,
          invoiceId: e
        })
      }), g === `summary` && (0, q.jsx)(Ey, {
        routeId: e,
        online: a.online,
        pending: S,
        closed: w,
        onClosed: () => void b().catch(() => null)
      })]
    }), m.name === `stop` && (0, q.jsx)(_y, {
      work: x,
      customerId: m.customerId,
      online: a.online,
      closed: w,
      go: te
    }), m.name === `deliver` && (0, q.jsx)(by, {
      work: x,
      order: x.orders.find(e => e.id === m.orderId),
      customerId: x.orders.find(e => e.id === m.orderId).customer_id,
      onCancel: e => te({
        name: `stop`,
        customerId: e
      }),
      onSubmit: async e => T(await ee(e), e.customerId)
    }), m.name === `sale` && (0, q.jsx)(by, {
      work: x,
      customerId: m.customerId,
      onCancel: e => te({
        name: `stop`,
        customerId: e
      }),
      onSubmit: async e => T(await ee(e), e.customerId)
    }), m.name === `pay` && (0, q.jsx)(Sy, {
      invoiceId: m.invoiceId,
      methods: o.methods,
      online: a.online,
      onBack: e => {
        b().catch(() => null), te(e ? {
          name: `stop`,
          customerId: e
        } : {
          name: `home`
        });
      },
      onReceipt: () => te({
        name: `receipt`,
        invoiceId: m.invoiceId
      })
    }), m.name === `receipt` && (0, q.jsx)(Cy, {
      invoiceId: m.invoiceId,
      online: a.online,
      onBack: e => te(e ? {
        name: `stop`,
        customerId: e
      } : {
        name: `home`
      }),
      onPay: () => te({
        name: `pay`,
        invoiceId: m.invoiceId
      })
    })]
  });
}
var py = ({
    onClick: e,
    children: t
  }) => (0, q.jsxs)(`button`, {
    className: `secondary sm`,
    onClick: e,
    children: [`← `, t]
  }),
  my = (e, t) => e.customers.find(e => e.id === t),
  hy = e => e.amount_minor - (e.paid_minor - e.refunded_minor);
function gy({
  work: e,
  onOpen: t,
  closed: n
}) {
  let [r, i] = (0, G.useState)(``),
    a = new Set(e.stops.map(e => e.customer_id));
  return (0, q.jsxs)(`div`, {
    className: `stack`,
    children: [n && (0, q.jsx)(`div`, {
      className: `notice`,
      children: K(`Tournée clôturée : consultation seule.`)
    }), (0, q.jsx)(`ul`, {
      className: `plain tap`,
      children: e.stops.map(n => {
        let r = e.orders.filter(e => e.customer_id === n.customer_id),
          i = r.filter(t => t.status === `loaded` && !e.queuedOrders.has(t.id)).length,
          a = r.filter(t => e.queuedOrders.has(t.id) || t.local).length,
          o = e.invoices.filter(e => e.customer_id === n.customer_id).reduce((e, t) => e + Math.max(0, hy(t)), 0),
          s = e.invoices.some(e => e.customer_id === n.customer_id && e.status === `to_verify`);
        return (0, q.jsx)(`li`, {
          children: (0, q.jsxs)(`button`, {
            className: `stopbtn`,
            "aria-label": K(`Arrêt {0} : {1}`, n.seq, n.name),
            onClick: () => t(n.customer_id),
            children: [(0, q.jsx)(`span`, {
              className: `seq`,
              children: n.seq
            }), (0, q.jsxs)(`span`, {
              className: `grow`,
              children: [(0, q.jsx)(`strong`, {
                children: n.name
              }), (0, q.jsx)(`span`, {
                className: `small muted block`,
                children: n.address
              }), (0, q.jsxs)(`span`, {
                className: `row`,
                style: {
                  marginTop: 6,
                  gap: 6
                },
                children: [i > 0 && (0, q.jsxs)(cv, {
                  kind: `info`,
                  children: [i, ` `, K(`à livrer`)]
                }), a > 0 && (0, q.jsxs)(cv, {
                  kind: `warn`,
                  children: [a, ` `, K(`à synchroniser`)]
                }), o > 0 && (0, q.jsxs)(cv, {
                  kind: `warn`,
                  children: [X(o), ` `, K(`à encaisser`)]
                }), s && (0, q.jsx)(cv, {
                  kind: `warn`,
                  children: K(`Paiement à vérifier`)
                }), i === 0 && a === 0 && o === 0 && r.length > 0 && (0, q.jsx)(cv, {
                  kind: `ok`,
                  children: K(`Terminé`)
                }), r.length === 0 && (0, q.jsx)(cv, {
                  children: K(`Visite libre`)
                })]
              })]
            }), (0, q.jsx)(`span`, {
              "aria-hidden": `true`,
              children: `›`
            })]
          })
        }, n.customer_id);
      })
    }), !n && (0, q.jsx)(`div`, {
      className: `card`,
      children: (0, q.jsxs)(`div`, {
        className: `body stack`,
        children: [(0, q.jsx)($, {
          label: K(`Vente à un commerce hors tournée`),
          children: (0, q.jsxs)(`select`, {
            value: r,
            onChange: e => i(e.target.value),
            children: [(0, q.jsx)(`option`, {
              value: ``,
              children: K(`Choisir un commerce…`)
            }), e.customers.filter(e => !a.has(e.id)).map(e => (0, q.jsxs)(`option`, {
              value: e.id,
              children: [e.name, ` · `, e.zone]
            }, e.id))]
          })
        }), (0, q.jsx)(`button`, {
          className: `secondary`,
          disabled: !r,
          onClick: () => t(r),
          children: K(`Ouvrir ce commerce`)
        })]
      })
    })]
  });
}
function _y({
  work: e,
  customerId: t,
  online: n,
  closed: r,
  go: i
}) {
  let a = my(e, t),
    o = new Map(e.products.map(e => [e.id, e.name])),
    s = e.orders.filter(e => e.customer_id === t),
    c = e.invoices.filter(e => e.customer_id === t);
  return (0, q.jsxs)(`div`, {
    className: `stack`,
    children: [(0, q.jsx)(py, {
      onClick: () => i({
        name: `home`
      }),
      children: K(`Tournée`)
    }), (0, q.jsxs)(`div`, {
      children: [(0, q.jsx)(`h1`, {
        children: a?.name
      }), (0, q.jsxs)(`div`, {
        className: `muted`,
        children: [a?.address, ` · `, a?.phone]
      }), a?.price_list_id && (0, q.jsx)(`div`, {
        style: {
          marginTop: 6
        },
        children: (0, q.jsx)(cv, {
          kind: `info`,
          children: K(`Tarif grands comptes`)
        })
      })]
    }), (0, q.jsx)(`h2`, {
      children: K(`Commandes`)
    }), s.length === 0 && (0, q.jsx)(`div`, {
      className: `empty`,
      children: K(`Aucune commande pour ce commerce.`)
    }), s.map(t => {
      let n = e.queuedOrders.has(t.id) || t.local,
        a = t.lines.reduce((e, t) => e + t.qty_ordered * t.unit_price_minor, 0);
      return (0, q.jsx)(`div`, {
        className: `card`,
        children: (0, q.jsxs)(`div`, {
          className: `body stack`,
          children: [(0, q.jsxs)(`div`, {
            className: `row spread`,
            children: [(0, q.jsx)(`strong`, {
              children: t.number
            }), n ? (0, q.jsx)(cv, {
              kind: `warn`,
              children: K(`À synchroniser`)
            }) : (0, q.jsx)(lv, {
              map: K_,
              value: t.status
            })]
          }), t.note && (0, q.jsx)(`div`, {
            className: `notice`,
            children: t.note
          }), (0, q.jsx)(`ul`, {
            className: `plain small`,
            children: t.lines.map(e => (0, q.jsxs)(`li`, {
              className: `row spread`,
              children: [(0, q.jsx)(`span`, {
                children: o.get(e.product_id)
              }), (0, q.jsxs)(`span`, {
                className: `nowrap`,
                children: [t.status === `loaded` ? e.qty_ordered : `${e.qty_delivered}/${e.qty_ordered}`, e.unit_price_minor ? ` × ${X(e.unit_price_minor)}` : ``]
              })]
            }, e.id))
          }), t.status === `loaded` && !n && (0, q.jsxs)(q.Fragment, {
            children: [(0, q.jsxs)(`div`, {
              className: `row spread`,
              children: [(0, q.jsx)(`span`, {
                className: `muted`,
                children: K(`Total commandé`)
              }), (0, q.jsx)(`strong`, {
                children: X(a)
              })]
            }), !r && (0, q.jsx)(`button`, {
              className: `big`,
              onClick: () => i({
                name: `deliver`,
                orderId: t.id
              }),
              children: K(`Livrer cette commande`)
            })]
          })]
        })
      }, t.id);
    }), c.length > 0 && (0, q.jsx)(`h2`, {
      children: K(`Factures et encaissements`)
    }), c.map(e => (0, q.jsx)(`div`, {
      className: `card`,
      children: (0, q.jsxs)(`div`, {
        className: `body stack`,
        children: [(0, q.jsxs)(`div`, {
          className: `row spread`,
          children: [(0, q.jsx)(`strong`, {
            children: e.number
          }), (0, q.jsx)(lv, {
            map: U_,
            value: e.status
          })]
        }), (0, q.jsxs)(`div`, {
          className: `row spread`,
          children: [(0, q.jsx)(`span`, {
            className: `muted`,
            children: K(`Montant`)
          }), (0, q.jsx)(`strong`, {
            children: X(e.amount_minor)
          })]
        }), hy(e) > 0 && hy(e) !== e.amount_minor && (0, q.jsxs)(`div`, {
          className: `row spread`,
          children: [(0, q.jsx)(`span`, {
            className: `muted`,
            children: K(`Reste dû`)
          }), (0, q.jsx)(`strong`, {
            children: X(hy(e))
          })]
        }), (0, q.jsxs)(`div`, {
          className: `row`,
          children: [hy(e) > 0 && (0, q.jsx)(`button`, {
            className: `grow`,
            disabled: !n,
            onClick: () => i({
              name: `pay`,
              invoiceId: e.id
            }),
            children: e.status === `pending` || e.status === `to_verify` ? K(`Suivre le paiement`) : K(`Encaisser`)
          }), (0, q.jsx)(`button`, {
            className: `secondary grow`,
            disabled: !n,
            onClick: () => i({
              name: `receipt`,
              invoiceId: e.id
            }),
            children: K(`Reçu`)
          })]
        }), !n && hy(e) > 0 && (0, q.jsx)(`div`, {
          className: `small muted`,
          children: K(`Encaissement électronique indisponible hors ligne : la facture reste « non payée » jusqu'au retour du réseau.`)
        })]
      })
    }, e.id)), !r && (0, q.jsx)(`button`, {
      className: `big secondary`,
      onClick: () => i({
        name: `sale`,
        customerId: t
      }),
      children: K(`Nouvelle vente sur place`)
    })]
  });
}
function vy({
  onChange: e
}) {
  let t = (0, G.useRef)(null),
    n = (0, G.useRef)(!1),
    [r, i] = (0, G.useState)(!1),
    a = () => t.current.getContext(`2d`),
    o = e => {
      let n = t.current,
        r = n.getBoundingClientRect();
      return [(e.clientX - r.left) * (n.width / r.width), (e.clientY - r.top) * (n.height / r.height)];
    },
    s = e => {
      n.current = !0, t.current.setPointerCapture(e.pointerId);
      let r = a();
      r.lineWidth = 2.5, r.lineCap = `round`, r.strokeStyle = `#0e2a55`, r.beginPath(), r.moveTo(...o(e));
    },
    c = e => {
      if (!n.current) return;
      let t = a();
      t.lineTo(...o(e)), t.stroke();
    },
    l = () => {
      n.current && (n.current = !1, i(!0), e(t.current.toDataURL(`image/png`)));
    };
  return (0, q.jsxs)(`div`, {
    children: [(0, q.jsx)(`canvas`, {
      ref: t,
      className: `signature`,
      width: 480,
      height: 150,
      onPointerDown: s,
      onPointerMove: c,
      onPointerUp: l,
      onPointerCancel: l,
      "aria-label": K(`Zone de signature du réceptionnaire`)
    }), (0, q.jsxs)(`div`, {
      className: `row spread small`,
      children: [(0, q.jsx)(`span`, {
        className: `muted`,
        children: K(r ? `Signature enregistrée` : `Signature du réceptionnaire (facultative)`)
      }), r && (0, q.jsx)(`button`, {
        type: `button`,
        className: `sm secondary`,
        onClick: () => {
          let n = t.current;
          a().clearRect(0, 0, n.width, n.height), i(!1), e(null);
        },
        children: K(`Effacer`)
      })]
    })]
  });
}
var yy = [K(`Commerce fermé`), K(`Client absent`), K(`Refus du client`), K(`Produit endommagé`), K(`Manque dans le véhicule`)];
function by({
  work: e,
  order: t,
  customerId: n,
  onCancel: r,
  onSubmit: i
}) {
  let a = my(e, n),
    o = (0, G.useMemo)(() => new Map(e.products.map(e => [e.id, e])), [e.products]),
    s = (0, G.useMemo)(() => t ? t.lines.map(e => ({
      key: e.id,
      productId: e.product_id,
      max: e.qty_ordered,
      price: e.unit_price_minor,
      ordered: e.qty_ordered
    })) : e.products.map(t => ({
      key: t.id,
      productId: t.id,
      max: Math.max(0, e.stock[t.id] ?? 0),
      price: cy(e, a, t),
      ordered: 0
    })), [t, e, a]),
    [c, l] = (0, G.useState)(() => Object.fromEntries(s.map(e => [e.key, e.ordered]))),
    [u, d] = (0, G.useState)({}),
    [f, p] = (0, G.useState)(!1),
    [m, h] = (0, G.useState)(``),
    [g, _] = (0, G.useState)(``),
    [v, y] = (0, G.useState)(null),
    [b, ee] = (0, G.useState)(``),
    [x, S] = (0, G.useState)(!1),
    C = s.reduce((e, t) => e + (c[t.key] ?? 0), 0),
    w = s.reduce((e, t) => e + t.ordered, 0),
    te = Object.entries(u).reduce((t, [n, r]) => t + r * cy(e, a, o.get(n)), 0),
    T = s.reduce((e, t) => e + (c[t.key] ?? 0) * t.price, 0) - te,
    E = t ? C === 0 ? `refused` : C < w ? `partial` : `full` : `full`,
    ne = E !== `full`,
    re = !t && C === 0 ? K(`Ajoutez au moins un produit.`) : ne && m.trim().length < 3 ? K(`Indiquez le motif.`) : E !== `refused` && g.trim().length < 2 ? K(`Indiquez le nom du réceptionnaire.`) : T < 0 ? K(`Les retours dépassent la valeur livrée.`) : null,
    ie = async () => {
      S(!0);
      let r = s.filter(e => (c[e.key] ?? 0) > 0).map(e => ({
          productId: e.productId,
          qty: c[e.key]
        })),
        o = Object.entries(u).filter(([, e]) => e > 0).map(([e, t]) => ({
          productId: e,
          qty: t
        })),
        l = {
          returns: E === `refused` ? [] : o,
          pod: {
            name: g.trim(),
            signature: E === `refused` ? null : v,
            note: ``
          },
          at: new Date().toISOString(),
          expectedTotalMinor: Math.max(0, T)
        },
        d = t ? {
          id: iy(),
          type: `deliver`,
          state: `queued`,
          createdAt: l.at,
          customerId: n,
          orderId: t.id,
          totalMinor: Math.max(0, T),
          items: r,
          label: `${K(E === `refused` ? `Non-livraison` : E === `partial` ? `Livraison partielle` : `Livraison`)} ${t.number}`,
          payload: {
            orderId: t.id,
            lines: s.map(e => ({
              lineId: e.key,
              qtyDelivered: c[e.key] ?? 0
            })),
            reason: m.trim(),
            ...l
          }
        } : {
          id: iy(),
          type: `sale`,
          state: `queued`,
          createdAt: l.at,
          customerId: n,
          totalMinor: T,
          items: r,
          label: K(`Vente sur place · {0}`, a?.name ?? ``),
          payload: {
            routeId: e.route.id,
            customerId: n,
            lines: r,
            ...l
          }
        };
      try {
        await i(d);
      } finally {
        S(!1);
      }
    },
    ae = s.filter(e => t || !b || o.get(e.productId).name.toLowerCase().includes(b.toLowerCase()));
  return (0, q.jsxs)(`div`, {
    className: `stack`,
    children: [(0, q.jsx)(py, {
      onClick: () => r(n),
      children: a?.name
    }), (0, q.jsx)(`h1`, {
      children: t ? K(`Livrer {0}`, t.number) : K(`Vente sur place`)
    }), !t && (0, q.jsx)(`input`, {
      type: `text`,
      placeholder: K(`Rechercher un produit…`),
      value: b,
      onChange: e => ee(e.target.value),
      "aria-label": K(`Rechercher un produit`)
    }), (0, q.jsx)(`ul`, {
      className: `plain`,
      children: ae.map(e => {
        let n = o.get(e.productId);
        return (0, q.jsxs)(`li`, {
          className: `qtyrow`,
          children: [(0, q.jsxs)(`div`, {
            className: `grow`,
            children: [(0, q.jsx)(`strong`, {
              children: n.name
            }), (0, q.jsxs)(`div`, {
              className: `small muted`,
              children: [n.unit, ` · `, X(e.price), ` · `, t ? K(`commandé : {0}`, e.ordered) : K(`stock véhicule : {0}`, e.max)]
            })]
          }), (0, q.jsx)(hv, {
            label: K(`Quantité {0}`, n.name),
            value: c[e.key] ?? 0,
            max: e.max,
            onChange: t => l(n => ({
              ...n,
              [e.key]: t
            }))
          })]
        }, e.key);
      })
    }), t && (0, q.jsxs)(`div`, {
      className: `row`,
      children: [(0, q.jsx)(`button`, {
        type: `button`,
        className: `secondary grow`,
        onClick: () => l(Object.fromEntries(s.map(e => [e.key, e.ordered]))),
        children: K(`Tout livrer`)
      }), (0, q.jsx)(`button`, {
        type: `button`,
        className: `danger grow`,
        onClick: () => l(Object.fromEntries(s.map(e => [e.key, 0]))),
        children: K(`Rien livré`)
      })]
    }), ne && (0, q.jsx)(`div`, {
      className: `card`,
      children: (0, q.jsxs)(`div`, {
        className: `body stack`,
        children: [(0, q.jsx)(`strong`, {
          children: K(E === `refused` ? `Motif de non-livraison` : `Motif de la livraison partielle`)
        }), (0, q.jsx)(`div`, {
          className: `row`,
          children: yy.map(e => (0, q.jsx)(`button`, {
            type: `button`,
            className: `sm ${m === e ? `` : `secondary`}`,
            onClick: () => h(e),
            children: e
          }, e))
        }), (0, q.jsx)(`input`, {
          type: `text`,
          value: m,
          onChange: e => h(e.target.value),
          placeholder: K(`Précisez si besoin`),
          "aria-label": K(`Motif`)
        })]
      })
    }), E !== `refused` && (0, q.jsxs)(q.Fragment, {
      children: [(0, q.jsx)(`button`, {
        type: `button`,
        className: `secondary`,
        onClick: () => p(!f),
        children: K(f ? `Masquer les retours` : `Ajouter un retour de marchandise`)
      }), f && (0, q.jsx)(`div`, {
        className: `card`,
        children: (0, q.jsxs)(`div`, {
          className: `body`,
          children: [(0, q.jsx)(`div`, {
            className: `small muted`,
            style: {
              marginBottom: 8
            },
            children: K(`Les retours sont déduits de la facture au tarif du commerce et soumis à validation de la centrale.`)
          }), (0, q.jsx)(`ul`, {
            className: `plain`,
            children: e.products.map(t => (0, q.jsxs)(`li`, {
              className: `qtyrow`,
              children: [(0, q.jsxs)(`div`, {
                className: `grow`,
                children: [t.name, (0, q.jsx)(`div`, {
                  className: `small muted`,
                  children: X(cy(e, a, t))
                })]
              }), (0, q.jsx)(hv, {
                label: K(`Retour {0}`, t.name),
                value: u[t.id] ?? 0,
                max: 999,
                onChange: e => d(n => ({
                  ...n,
                  [t.id]: e
                }))
              })]
            }, t.id))
          })]
        })
      }), (0, q.jsx)(`div`, {
        className: `card`,
        children: (0, q.jsxs)(`div`, {
          className: `body stack`,
          children: [(0, q.jsx)(`strong`, {
            children: K(`Preuve de livraison`)
          }), (0, q.jsx)($, {
            label: K(`Nom du réceptionnaire`),
            children: (0, q.jsx)(`input`, {
              type: `text`,
              value: g,
              onChange: e => _(e.target.value),
              autoComplete: `off`
            })
          }), (0, q.jsx)(vy, {
            onChange: y
          })]
        })
      })]
    }), (0, q.jsxs)(`div`, {
      className: `totalbar`,
      children: [(0, q.jsxs)(`div`, {
        children: [te > 0 && (0, q.jsxs)(`div`, {
          className: `small`,
          children: [K(`Retours :`), ` `, X(-te)]
        }), (0, q.jsx)(`div`, {
          className: `small`,
          children: K(E === `refused` ? `Aucune facture` : `À facturer`)
        }), (0, q.jsx)(`strong`, {
          children: X(Math.max(0, T))
        })]
      }), (0, q.jsx)(`button`, {
        disabled: !!re || x,
        onClick: ie,
        children: K(x ? `Envoi…` : E === `refused` ? `Déclarer non livrée` : t ? `Confirmer la livraison` : `Valider la vente`)
      })]
    }), re && (0, q.jsx)(`div`, {
      className: `small muted`,
      role: `status`,
      children: re
    })]
  });
}
function xy({
  value: e
}) {
  let [t, n] = (0, G.useState)(``);
  return (0, G.useEffect)(() => {
    Yv.toDataURL(e, {
      margin: 1,
      width: 240
    }).then(n).catch(() => n(``));
  }, [e]), (0, q.jsx)(`div`, {
    className: `qr`,
    children: t ? (0, q.jsx)(`img`, {
      src: t,
      alt: K(`Code à présenter au client`)
    }) : (0, q.jsx)(`span`, {
      className: `muted`,
      children: K(`Génération du code…`)
    })
  });
}
function Sy({
  invoiceId: e,
  methods: t,
  online: n,
  onBack: r,
  onReceipt: i
}) {
  let {
      session: a
    } = xv(),
    o = _v(),
    s = Y(n ? `/api/invoices/${e}/receipt` : null, 2500),
    [c, l] = (0, G.useState)(null),
    [u, d] = (0, G.useState)(iy),
    [f, p] = (0, G.useState)(!1);
  return n ? (0, q.jsx)(pv, {
    q: s,
    children: n => {
      let m = n.invoice,
        h = m.amount_minor - (m.paid_minor - m.refunded_minor),
        g = n.payments.find(e => e.status === `pending` || e.status === `to_verify`),
        _ = n.payments[n.payments.length - 1],
        v = c ?? z_(h),
        y = R_(v),
        b = y !== null && y > 0 && y <= h,
        ee = async t => {
          p(!0), (await o.run(() => J(`POST`, `/api/payments`, {
            invoiceId: e,
            method: t,
            amountMinor: y,
            idempotencyKey: `${u}-${t}`
          }))) && (d(iy()), l(null)), await s.reload(), p(!1);
        },
        x = (e, t) => o.run(async () => {
          await J(`POST`, e), await s.reload();
        }, t),
        S = e => o.run(async () => {
          let t = await J(`POST`, `/api/demo/payments/${g.id}/simulate`, {
            outcome: e
          });
          o.toast(K(`Prestataire simulé : {0}`, {
            confirmed: K(`paiement confirmé`),
            failed: K(`paiement refusé`),
            duplicate: K(`notification en double ignorée`),
            no_notification: K(`payé chez le prestataire, notification perdue`),
            amount_mismatch: K(`montant notifié incohérent`),
            already_confirmed: K(`déjà confirmé`)
          }[t.result] ?? t.result)), await s.reload();
        });
      return (0, q.jsxs)(`div`, {
        className: `stack`,
        children: [(0, q.jsx)(py, {
          onClick: () => r(m.customer_id),
          children: m.customer
        }), (0, q.jsxs)(`div`, {
          className: `row spread`,
          children: [(0, q.jsx)(`h1`, {
            children: m.number
          }), (0, q.jsx)(lv, {
            map: U_,
            value: m.status
          })]
        }), (0, q.jsxs)(`div`, {
          className: `duebox`,
          children: [(0, q.jsx)(`div`, {
            className: `small`,
            children: K(h > 0 ? `Reste à encaisser` : `Facture soldée`)
          }), (0, q.jsx)(`div`, {
            className: `amount`,
            children: X(Math.max(0, h))
          }), h !== m.amount_minor && (0, q.jsxs)(`div`, {
            className: `small`,
            children: [K(`sur`), ` `, X(m.amount_minor)]
          })]
        }), g && (0, q.jsx)(`div`, {
          className: `card`,
          children: (0, q.jsxs)(`div`, {
            className: `body stack`,
            children: [(0, q.jsxs)(`div`, {
              className: `row spread`,
              children: [(0, q.jsxs)(`strong`, {
                children: [X_[g.method], ` · `, X(g.amountMinor)]
              }), (0, q.jsx)(lv, {
                map: W_,
                value: g.status
              })]
            }), g.status === `pending` && (0, q.jsxs)(q.Fragment, {
              children: [g.presentation.kind !== `terminal` && g.presentation.value && (0, q.jsx)(xy, {
                value: g.presentation.value
              }), g.presentation.kind === `terminal` && (0, q.jsxs)(`div`, {
                className: `terminal`,
                children: [K(`Terminal de paiement`), (0, q.jsx)(`br`, {}), (0, q.jsx)(`strong`, {
                  children: X(g.amountMinor)
                })]
              }), (0, q.jsx)(`p`, {
                children: K(g.presentation.instructions)
              }), g.presentation.kind === `url` && (0, q.jsxs)(`div`, {
                className: `stack`,
                children: [(0, q.jsx)(`div`, {
                  className: `code`,
                  children: g.presentation.value
                }), (0, q.jsxs)(`div`, {
                  className: `row`,
                  children: [(0, q.jsx)(`button`, {
                    className: `secondary grow`,
                    onClick: () => o.run(() => navigator.clipboard.writeText(g.presentation.value), K(`Lien copié.`)),
                    children: K(`Copier le lien`)
                  }), typeof navigator.share == `function` && (0, q.jsx)(`button`, {
                    className: `secondary grow`,
                    onClick: () => void navigator.share({
                      title: K(`Paiement {0}`, m.number),
                      text: `${m.company} : ${X(g.amountMinor)} pour ${m.number}`,
                      url: g.presentation.value
                    }).catch(() => null),
                    children: K(`Partager`)
                  }), (0, q.jsx)(`a`, {
                    className: `btn secondary grow`,
                    href: g.presentation.value,
                    target: `_blank`,
                    rel: `noreferrer`,
                    children: K(`Ouvrir`)
                  })]
                })]
              }), (0, q.jsxs)(`div`, {
                className: `small muted`,
                children: [K(`Référence prestataire :`), ` `, (0, q.jsx)(`span`, {
                  className: `code`,
                  children: g.providerRef
                }), ` `, K(`· en attente de la confirmation du prestataire…`)]
              }), (0, q.jsx)(`button`, {
                className: `secondary`,
                onClick: () => x(`/api/payments/${g.id}/check`),
                children: K(`Vérifier auprès du prestataire`)
              }), (0, q.jsx)(`button`, {
                className: `secondary`,
                onClick: () => x(`/api/payments/${g.id}/claim`, K(`Paiement placé « à vérifier ». Aucune confirmation n'est enregistrée.`)),
                children: K(`Le client montre une capture d'écran`)
              }), (0, q.jsx)(`button`, {
                className: `danger`,
                onClick: () => x(`/api/payments/${g.id}/cancel`),
                children: K(`Annuler cette tentative`)
              })]
            }), g.status === `to_verify` && (0, q.jsxs)(q.Fragment, {
              children: [(0, q.jsxs)(`div`, {
                className: `notice warn`,
                children: [(0, q.jsx)(`strong`, {
                  children: K(`À vérifier.`)
                }), ` `, K(g.verifyReason ?? ``), ` `, K(`Ce paiement n'est pas confirmé : ne le considérez pas comme encaissé. Aucune nouvelle tentative n'est possible tant que le doute n'est pas levé, pour éviter un double débit.`)]
              }), (0, q.jsx)(`button`, {
                className: `secondary`,
                onClick: () => x(`/api/payments/${g.id}/check`),
                children: K(`Interroger le prestataire`)
              })]
            }), a.demoMode && (0, q.jsxs)(`div`, {
              className: `demo-box`,
              children: [(0, q.jsx)(`strong`, {
                children: K(`Simulateur de prestataire (démonstration)`)
              }), (0, q.jsx)(`div`, {
                className: `small`,
                children: K(`Tient le rôle du client et du prestataire. Les notifications passent par le webhook signé, comme en réel.`)
              }), (0, q.jsxs)(`div`, {
                className: `row`,
                children: [(0, q.jsx)(`button`, {
                  className: `sm`,
                  onClick: () => S(`success`),
                  children: K(`Paiement réussi`)
                }), (0, q.jsx)(`button`, {
                  className: `sm secondary`,
                  onClick: () => S(`failure`),
                  children: K(`Paiement refusé`)
                }), (0, q.jsx)(`button`, {
                  className: `sm secondary`,
                  onClick: () => S(`lost_notification`),
                  children: K(`Réussi, notification perdue`)
                }), (0, q.jsx)(`button`, {
                  className: `sm secondary`,
                  onClick: () => S(`wrong_amount`),
                  children: K(`Montant incohérent`)
                })]
              })]
            })]
          })
        }), !g && _?.status === `failed` && h > 0 && (0, q.jsxs)(`div`, {
          className: `notice err`,
          role: `alert`,
          children: [(0, q.jsx)(`strong`, {
            children: K(`Dernier paiement échoué`)
          }), ` (`, X_[_.method], `) : `, K(_.failureReason ?? ``), ` `, K(`La facture reste due.`)]
        }), !g && _?.status === `confirmed` && (0, q.jsxs)(`div`, {
          className: `success`,
          children: [(0, q.jsx)(`div`, {
            className: `big`,
            children: K(`Paiement confirmé`)
          }), (0, q.jsxs)(`div`, {
            children: [X(_.amountMinor), ` · `, X_[_.method]]
          }), (0, q.jsxs)(`div`, {
            className: `small`,
            children: [K(`Confirmé par`), ` `, $_[_.confirmedVia ?? ``] ?? K(`le prestataire`), K(`. Le règlement en banque est suivi par la finance.`)]
          }), a.demoMode && (0, q.jsx)(`button`, {
            className: `sm secondary`,
            style: {
              marginTop: 10
            },
            onClick: () => o.run(async () => {
              let e = await J(`POST`, `/api/demo/payments/${_.id}/simulate`, {
                outcome: `duplicate`
              });
              o.toast(e.result === `duplicate` ? K(`Notification renvoyée : reconnue comme doublon, rien n'est ajouté.`) : e.result), await s.reload();
            }),
            children: K(`Démo : renvoyer la notification`)
          })]
        }), !g && h > 0 && (0, q.jsx)(`div`, {
          className: `card`,
          children: (0, q.jsxs)(`div`, {
            className: `body stack`,
            children: [(0, q.jsx)($, {
              label: K(`Montant à encaisser (Rs)`),
              hint: y !== null && y < h && y > 0 ? K(`Paiement partiel : il restera {0}.`, X(h - y)) : b ? void 0 : K(`Montant invalide ou supérieur au reste dû.`),
              children: (0, q.jsx)(`input`, {
                type: `text`,
                inputMode: `decimal`,
                value: v,
                "aria-invalid": !b,
                onChange: e => l(e.target.value)
              })
            }), (0, q.jsx)(`div`, {
              className: `methods`,
              children: t.map(e => (0, q.jsx)(`button`, {
                disabled: !b || f,
                onClick: () => ee(e.method),
                children: X_[e.method] ?? e.label
              }, e.method))
            }), (0, q.jsx)(`div`, {
              className: `small muted`,
              children: K(`Aucune donnée de carte n'est saisie dans cette application. Le paiement n'est « payé » qu'après confirmation du prestataire.`)
            })]
          })
        }), (0, q.jsx)(`button`, {
          className: `secondary`,
          onClick: i,
          children: K(`Voir le reçu`)
        })]
      });
    }
  }) : (0, q.jsxs)(`div`, {
    className: `stack`,
    children: [(0, q.jsx)(py, {
      onClick: () => r(),
      children: K(`Retour`)
    }), (0, q.jsx)(`div`, {
      className: `notice warn`,
      children: K(`Hors ligne : aucun paiement électronique ne peut être lancé ni confirmé. La facture reste « non payée » et pourra être encaissée au retour du réseau.`)
    })]
  });
}
function Cy({
  invoiceId: e,
  online: t,
  onBack: n,
  onPay: r
}) {
  let {
      session: i
    } = xv(),
    a = Y(t ? `/api/invoices/${e}/receipt` : null);
  return t ? (0, q.jsx)(pv, {
    q: a,
    children: e => {
      let t = e.invoice,
        a = t.amount_minor - (t.paid_minor - t.refunded_minor);
      return (0, q.jsxs)(`div`, {
        className: `stack`,
        children: [(0, q.jsx)(`div`, {
          className: `noprint`,
          children: (0, q.jsx)(py, {
            onClick: () => n(t.customer_id),
            children: t.customer
          })
        }), (0, q.jsxs)(`div`, {
          className: `receipt`,
          children: [(0, q.jsxs)(`div`, {
            className: `row spread`,
            children: [(0, q.jsxs)(`div`, {
              children: [(0, q.jsx)(`strong`, {
                children: t.company
              }), (0, q.jsxs)(`div`, {
                className: `small muted`,
                children: [K(`Reçu ·`), ` `, t.number, ` `, K(`· commande`), ` `, t.order_number]
              })]
            }), (0, q.jsx)(lv, {
              map: U_,
              value: t.status
            })]
          }), i.demoMode && (0, q.jsx)(`div`, {
            className: `small muted`,
            children: K(`Document de démonstration, sans valeur fiscale.`)
          }), (0, q.jsx)(`hr`, {}), (0, q.jsxs)(`div`, {
            children: [(0, q.jsx)(`strong`, {
              children: t.customer
            }), (0, q.jsxs)(`div`, {
              className: `small muted`,
              children: [t.address, ` · `, Z(t.issued_at, !0)]
            })]
          }), (0, q.jsx)(`table`, {
            children: (0, q.jsxs)(`tbody`, {
              children: [e.lines.filter(e => e.qty_delivered > 0).map(e => (0, q.jsxs)(`tr`, {
                children: [(0, q.jsxs)(`td`, {
                  children: [e.product, (0, q.jsxs)(`div`, {
                    className: `small muted`,
                    children: [e.qty_delivered, ` × `, X(e.unit_price_minor), e.qty_delivered < e.qty_ordered ? K(` (commandé : {0})`, e.qty_ordered) : ``]
                  })]
                }), (0, q.jsx)(`td`, {
                  className: `right nowrap`,
                  children: X(e.qty_delivered * e.unit_price_minor)
                })]
              }, e.product)), e.delivery?.returns.map(e => (0, q.jsxs)(`tr`, {
                children: [(0, q.jsxs)(`td`, {
                  children: [K(`Retour ·`), ` `, e.product, (0, q.jsxs)(`div`, {
                    className: `small muted`,
                    children: [e.qty, ` × `, X(e.unitPriceMinor)]
                  })]
                }), (0, q.jsx)(`td`, {
                  className: `right nowrap`,
                  children: X(-e.qty * e.unitPriceMinor)
                })]
              }, `r-${e.product}`)), (0, q.jsxs)(`tr`, {
                className: `total`,
                children: [(0, q.jsx)(`td`, {
                  children: K(`Total`)
                }), (0, q.jsx)(`td`, {
                  className: `right nowrap`,
                  children: X(t.amount_minor)
                })]
              })]
            })
          }), (0, q.jsx)(`hr`, {}), (0, q.jsx)(`strong`, {
            children: K(`Encaissements`)
          }), e.payments.length === 0 && (0, q.jsx)(`div`, {
            className: `small muted`,
            children: K(`Aucun encaissement.`)
          }), e.payments.map(e => (0, q.jsxs)(`div`, {
            className: `row spread small`,
            children: [(0, q.jsxs)(`span`, {
              children: [X_[e.method], ` · `, Z(e.createdAt, !0), e.providerRef ? (0, q.jsxs)(q.Fragment, {
                children: [` · `, (0, q.jsx)(`span`, {
                  className: `code`,
                  children: e.providerRef
                })]
              }) : null]
            }), (0, q.jsxs)(`span`, {
              className: `nowrap`,
              children: [X(e.amountMinor), ` `, (0, q.jsx)(lv, {
                map: W_,
                value: e.status
              })]
            })]
          }, e.id)), (0, q.jsxs)(`div`, {
            className: `row spread`,
            children: [(0, q.jsx)(`span`, {
              children: K(`Encaissé (confirmé par le prestataire)`)
            }), (0, q.jsx)(`strong`, {
              children: X(t.paid_minor - t.refunded_minor)
            })]
          }), a > 0 && (0, q.jsxs)(`div`, {
            className: `row spread`,
            children: [(0, q.jsx)(`span`, {
              children: K(`Reste dû`)
            }), (0, q.jsx)(`strong`, {
              children: X(a)
            })]
          }), e.delivery?.pod_name && (0, q.jsxs)(q.Fragment, {
            children: [(0, q.jsx)(`hr`, {}), (0, q.jsxs)(`div`, {
              className: `small`,
              children: [K(`Reçu par`), ` `, (0, q.jsx)(`strong`, {
                children: e.delivery.pod_name
              }), ` `, K(`le`), ` `, Z(e.delivery.at, !0)]
            }), e.delivery.pod_signature && (0, q.jsx)(`img`, {
              className: `sigimg`,
              src: e.delivery.pod_signature,
              alt: K(`Signature du réceptionnaire`)
            })]
          })]
        }), (0, q.jsxs)(`div`, {
          className: `row noprint`,
          children: [a > 0 && (0, q.jsx)(`button`, {
            className: `grow`,
            onClick: r,
            children: K(`Encaisser`)
          }), (0, q.jsx)(`button`, {
            className: `secondary grow`,
            onClick: () => window.print(),
            children: K(`Imprimer`)
          }), typeof navigator.share == `function` && (0, q.jsx)(`button`, {
            className: `secondary grow`,
            onClick: () => void navigator.share({
              title: K(`Reçu {0}`, t.number),
              text: K(`{0} - {1} - {2}
Montant : {3}
État : {4}
Encaissé (confirmé) : {5}`, t.company, t.number, t.customer, X(t.amount_minor), U_[t.status]?.[0], X(t.paid_minor - t.refunded_minor))
            }).catch(() => null),
            children: K(`Partager`)
          })]
        })]
      });
    }
  }) : (0, q.jsxs)(`div`, {
    className: `stack`,
    children: [(0, q.jsx)(py, {
      onClick: () => n(),
      children: K(`Retour`)
    }), (0, q.jsx)(`div`, {
      className: `notice warn`,
      children: K(`Reçu indisponible hors ligne.`)
    })]
  });
}
function wy({
  work: e
}) {
  let [t, n] = (0, G.useState)(``),
    r = my(e, t);
  return (0, q.jsxs)(`div`, {
    className: `stack`,
    children: [(0, q.jsx)($, {
      label: K(`Prix applicables pour`),
      children: (0, q.jsxs)(`select`, {
        value: t,
        onChange: e => n(e.target.value),
        children: [(0, q.jsx)(`option`, {
          value: ``,
          children: K(`Tarif de base`)
        }), e.customers.map(e => (0, q.jsx)(`option`, {
          value: e.id,
          children: e.name
        }, e.id))]
      })
    }), (0, q.jsx)(`ul`, {
      className: `plain`,
      children: e.products.map(t => {
        let n = e.stock[t.id] ?? 0;
        return (0, q.jsxs)(`li`, {
          className: `row spread`,
          children: [(0, q.jsxs)(`div`, {
            children: [(0, q.jsx)(`strong`, {
              children: t.name
            }), (0, q.jsxs)(`div`, {
              className: `small muted`,
              children: [t.sku, ` · `, t.unit]
            })]
          }), (0, q.jsxs)(`div`, {
            className: `right`,
            children: [(0, q.jsx)(`strong`, {
              children: X(cy(e, r, t))
            }), (0, q.jsx)(`div`, {
              children: (0, q.jsx)(cv, {
                kind: n > 5 ? `ok` : n > 0 ? `warn` : `err`,
                children: n > 0 ? K(`{0} à bord`, n) : n < 0 ? K(`{0} (écart)`, n) : K(`épuisé`)
              })
            })]
          })]
        }, t.id);
      })
    })]
  });
}
function Ty({
  work: e,
  queue: t,
  onDrop: n,
  onInvoice: r
}) {
  let i = t => my(e, t)?.name ?? K(`Commerce`),
    a = e.orders.filter(e => !e.local && [`delivered`, `partially_delivered`, `refused`].includes(e.status)).sort((e, t) => (t.delivered_at ?? ``).localeCompare(e.delivered_at ?? ``)),
    o = e.invoices.flatMap(e => e.payments.map(t => ({
      ...t,
      invoice: e
    }))).sort((e, t) => t.created_at.localeCompare(e.created_at));
  return (0, q.jsxs)(`div`, {
    className: `stack`,
    children: [t.length > 0 && (0, q.jsxs)(`div`, {
      className: `card`,
      children: [(0, q.jsx)(`header`, {
        children: (0, q.jsx)(`h2`, {
          children: K(`File de synchronisation`)
        })
      }), (0, q.jsx)(`div`, {
        className: `body`,
        children: (0, q.jsx)(`ul`, {
          className: `plain`,
          children: t.map(e => (0, q.jsxs)(`li`, {
            children: [(0, q.jsxs)(`div`, {
              className: `row spread`,
              children: [(0, q.jsx)(`strong`, {
                children: e.label
              }), (0, q.jsx)(cv, {
                kind: e.state === `rejected` ? `err` : `warn`,
                children: e.state === `rejected` ? K(`Refusée`) : K(`En attente`)
              })]
            }), (0, q.jsxs)(`div`, {
              className: `small muted`,
              children: [i(e.customerId), ` · `, V_(e.createdAt), ` · `, X(e.totalMinor)]
            }), e.state === `rejected` && (0, q.jsxs)(`div`, {
              className: `row spread small`,
              style: {
                marginTop: 6
              },
              children: [(0, q.jsx)(`span`, {
                className: `notice err grow`,
                children: e.message
              }), (0, q.jsx)(`button`, {
                className: `sm secondary`,
                onClick: () => n(e.id),
                children: K(`Retirer`)
              })]
            })]
          }, e.id))
        })
      })]
    }), (0, q.jsx)(`h2`, {
      children: K(`Livraisons et ventes`)
    }), a.length === 0 ? (0, q.jsx)(`div`, {
      className: `empty`,
      children: K(`Rien pour l'instant.`)
    }) : (0, q.jsx)(`ul`, {
      className: `plain`,
      children: a.map(t => {
        let n = e.invoices.find(e => e.order_id === t.id);
        return (0, q.jsxs)(`li`, {
          children: [(0, q.jsxs)(`div`, {
            className: `row spread`,
            children: [(0, q.jsx)(`strong`, {
              children: t.number
            }), (0, q.jsx)(lv, {
              map: K_,
              value: t.status
            })]
          }), (0, q.jsxs)(`div`, {
            className: `small muted`,
            children: [t.kind === `route_sale` ? K(`Vente sur place`) : K(`Commande`), ` · `, i(t.customer_id), ` · `, t.delivered_at ? V_(t.delivered_at) : ``]
          }), n && (0, q.jsxs)(`div`, {
            className: `row spread small`,
            style: {
              marginTop: 4
            },
            children: [(0, q.jsxs)(`button`, {
              className: `linkish`,
              onClick: () => r(n.id),
              children: [n.number, ` · `, X(n.amount_minor)]
            }), (0, q.jsx)(lv, {
              map: U_,
              value: n.status
            })]
          })]
        }, t.id);
      })
    }), (0, q.jsx)(`h2`, {
      children: K(`Encaissements`)
    }), o.length === 0 ? (0, q.jsx)(`div`, {
      className: `empty`,
      children: K(`Aucune tentative de paiement.`)
    }) : (0, q.jsx)(`ul`, {
      className: `plain`,
      children: o.map(e => (0, q.jsxs)(`li`, {
        children: [(0, q.jsxs)(`div`, {
          className: `row spread`,
          children: [(0, q.jsxs)(`strong`, {
            children: [X(e.amount_minor), ` · `, X_[e.method]]
          }), (0, q.jsx)(lv, {
            map: W_,
            value: e.status
          })]
        }), (0, q.jsxs)(`div`, {
          className: `small muted`,
          children: [e.invoice.number, ` · `, i(e.invoice.customer_id), ` · `, V_(e.created_at), e.failure_reason ? ` · ${K(e.failure_reason)}` : ``, e.verify_reason ? ` · ${K(e.verify_reason)}` : ``]
        })]
      }, e.id))
    })]
  });
}
function Ey({
  routeId: e,
  online: t,
  pending: n,
  closed: r,
  onClosed: i
}) {
  let a = _v(),
    o = Y(t ? `/api/agent/routes/${e}/summary` : null);
  if (!t) return (0, q.jsx)(`div`, {
    className: `notice warn`,
    children: K(`Le bilan se calcule sur le serveur : il sera disponible au retour du réseau.`)
  });
  let s = async () => {
    (await a.ask({
      kind: `confirm`,
      title: K(`Clôturer la tournée ?`),
      text: K(`Le stock restant revient au dépôt. La tournée ne pourra plus être modifiée.`),
      confirm: K(`Clôturer`)
    })) && (await a.run(() => J(`POST`, `/api/agent/routes/${e}/close`), K(`Tournée clôturée.`))) && (await o.reload(), i());
  };
  return (0, q.jsx)(pv, {
    q: o,
    children: e => (0, q.jsxs)(`div`, {
      className: `stack`,
      children: [(0, q.jsxs)(`div`, {
        className: `grid g2 keep2`,
        children: [(0, q.jsxs)(`div`, {
          className: `tile`,
          children: [(0, q.jsx)(`div`, {
            className: `label`,
            children: K(`Facturé`)
          }), (0, q.jsx)(`div`, {
            className: `value`,
            children: X(e.money.invoiced)
          })]
        }), (0, q.jsxs)(`div`, {
          className: `tile`,
          children: [(0, q.jsx)(`div`, {
            className: `label`,
            children: K(`Encaissé confirmé`)
          }), (0, q.jsx)(`div`, {
            className: `value`,
            children: X(e.money.confirmed)
          })]
        }), (0, q.jsxs)(`div`, {
          className: `tile`,
          children: [(0, q.jsx)(`div`, {
            className: `label`,
            children: K(`Reste à encaisser`)
          }), (0, q.jsx)(`div`, {
            className: `value`,
            children: X(e.money.invoiced - e.money.confirmed)
          }), (0, q.jsxs)(`div`, {
            className: `hint`,
            children: [e.money.pending > 0 && K(`{0} en attente · `, X(e.money.pending)), e.money.toVerify > 0 && K(`{0} à vérifier`, X(e.money.toVerify))]
          })]
        }), (0, q.jsxs)(`div`, {
          className: `tile`,
          children: [(0, q.jsx)(`div`, {
            className: `label`,
            children: K(`Commandes`)
          }), (0, q.jsxs)(`div`, {
            className: `value`,
            children: [e.orders.delivered + e.orders.partial, `/`, e.orders.total]
          }), (0, q.jsxs)(`div`, {
            className: `hint`,
            children: [e.orders.partial, ` `, K(`partielle(s) ·`), ` `, e.orders.refused, ` `, K(`non livrée(s) ·`), ` `, e.orders.routeSales, ` `, K(`vente(s) sur place`)]
          })]
        })]
      }), e.byMethod.length > 0 && (0, q.jsxs)(`div`, {
        className: `card`,
        children: [(0, q.jsx)(`header`, {
          children: (0, q.jsx)(`h2`, {
            children: K(`Encaissements par moyen`)
          })
        }), (0, q.jsx)(`div`, {
          className: `body`,
          children: (0, q.jsx)(`ul`, {
            className: `plain`,
            children: e.byMethod.map(e => (0, q.jsxs)(`li`, {
              className: `row spread`,
              children: [(0, q.jsxs)(`span`, {
                children: [X_[e.method], ` · `, e.count]
              }), (0, q.jsx)(`strong`, {
                children: X(e.amount_minor)
              })]
            }, e.method))
          })
        })]
      }), (0, q.jsxs)(`div`, {
        className: `card`,
        children: [(0, q.jsx)(`header`, {
          children: (0, q.jsx)(`h2`, {
            children: K(`Stock du véhicule`)
          })
        }), (0, q.jsx)(`div`, {
          className: `table-wrap`,
          children: (0, q.jsxs)(`table`, {
            children: [(0, q.jsx)(`thead`, {
              children: (0, q.jsxs)(`tr`, {
                children: [(0, q.jsx)(`th`, {
                  children: K(`Produit`)
                }), (0, q.jsx)(`th`, {
                  className: `right`,
                  children: K(`Chargé`)
                }), (0, q.jsx)(`th`, {
                  className: `right`,
                  children: K(`Sorti`)
                }), (0, q.jsx)(`th`, {
                  className: `right`,
                  children: K(`Reste`)
                }), (0, q.jsx)(`th`, {
                  className: `right`,
                  children: K(`Retours`)
                })]
              })
            }), (0, q.jsx)(`tbody`, {
              children: e.stock.map(e => (0, q.jsxs)(`tr`, {
                children: [(0, q.jsx)(`td`, {
                  children: e.name
                }), (0, q.jsx)(`td`, {
                  className: `right`,
                  children: e.loaded_qty
                }), (0, q.jsx)(`td`, {
                  className: `right`,
                  children: e.loaded_qty - e.qty
                }), (0, q.jsx)(`td`, {
                  className: `right`,
                  children: e.qty
                }), (0, q.jsx)(`td`, {
                  className: `right`,
                  children: e.returned_qty || ``
                })]
              }, e.product_id))
            })]
          })
        })]
      }), r || e.route.status === `closed` ? (0, q.jsxs)(`div`, {
        className: `notice ok`,
        children: [K(`Tournée clôturée`), e.route.closed_at ? ` le ${Z(e.route.closed_at, !0)}` : ``, `.`]
      }) : (0, q.jsxs)(q.Fragment, {
        children: [(0, q.jsx)(`button`, {
          className: `big`,
          disabled: n > 0 || e.orders.toDeliver > 0,
          onClick: s,
          children: K(`Clôturer la tournée`)
        }), (n > 0 || e.orders.toDeliver > 0) && (0, q.jsxs)(`div`, {
          className: `small muted`,
          children: [n > 0 ? K(`Synchronisez d'abord les actions en attente. `) : ``, e.orders.toDeliver > 0 ? K(`{0} commande(s) restent à livrer ou à déclarer non livrées.`, e.orders.toDeliver) : ``]
        })]
      })]
    })
  });
}
var Dy = {
  "delivery.full": K(`Livraison`),
  "delivery.partial": K(`Livraison partielle`),
  "delivery.refused": K(`Non-livraison`),
  "payment.initiated": K(`Paiement lancé`),
  "payment.confirmed": K(`Paiement confirmé`),
  "payment.failed": K(`Paiement échoué`),
  "payment.to_verify": K(`Paiement à vérifier`),
  "payment.settled": K(`Règlement bancaire`),
  "payment.refunded": K(`Remboursement`),
  "route.created": K(`Tournée créée`),
  "route.loaded": K(`Véhicule chargé`),
  "route.started": K(`Tournée démarrée`),
  "route.closed": K(`Tournée clôturée`),
  "route.updated": K(`Tournée modifiée`)
};

export { Cy, Dy, Ey, Sy, Ty, _y, by, dy, fy, gy, hy, my, py, uy, vy, wy, xy, yy };
