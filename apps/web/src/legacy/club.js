// GENERATED (step 1b, stage 2): v0.1.0 interface "club" code extracted from reference/v0.1.0/app.js.
// Rewritten as readable TSX in the following commits.
/* eslint-disable */
import { $y, Qy, ab, eb, ib, nb, rb, tb } from "./admin.js";
import { xy } from "./field.js";
import { K } from "./i18n.js";
import { G, b_, eg, m_, ng, q } from "./lib.js";
import { $, $_, F_, G_, I_, J, Q, R_, W_, X, Y, Y_, Z, _v, av, cv, dv, fv, iv, lv, mv, nv, ov, pv, rv, sv, uv, xv, yv } from "./shared.js";

function ob() {
  let e = eg(),
    t = Y(`/api/club/dashboard`, 1e4);
  return (0, q.jsxs)(q.Fragment, {
    children: [(0, q.jsx)(fv, {
      title: K(`Recouvrement`),
      sub: K(`Qui doit quoi, depuis quand, et ce qui est rentré ce mois-ci.`)
    }), (0, q.jsx)(pv, {
      q: t,
      children: t => {
        let n = Math.max(1, ...Object.values(t.aging)),
          r = t.collectedMonth.reduce((e, t) => e + t.amount_minor, 0);
        return (0, q.jsxs)(`div`, {
          className: `stack`,
          children: [(0, q.jsxs)(`div`, {
            className: `grid g4`,
            children: [(0, q.jsx)(uv, {
              label: K(`Total dû par les membres`),
              value: X(t.totals.owedMinor),
              hint: K(`{0} membre(s) actif(s)`, t.totals.members)
            }), (0, q.jsx)(uv, {
              label: K(`Dont en retard`),
              value: X(t.totals.overdueMinor),
              kind: t.totals.overdueMinor ? `warn` : ``,
              hint: K(`{0} membre(s) en retard`, t.totals.inArrears)
            }), (0, q.jsx)(uv, {
              label: K(`Encaissé ce mois-ci`),
              value: X(r),
              hint: t.collectedMonth.map(e => `${rv[e.method]} ${X(e.amount_minor)}`).join(` · `) || K(`aucun encaissement`)
            }), (0, q.jsx)(uv, {
              label: K(`Paiements en ligne non réglés en banque`),
              value: X(t.unsettledOnlineMinor),
              kind: t.unsettledOnlineMinor ? `info` : ``,
              hint: K(`confirmés par le prestataire, en attente du relevé`)
            })]
          }), (0, q.jsxs)(`div`, {
            className: `grid g2`,
            children: [(0, q.jsx)(Q, {
              title: K(`Ancienneté des sommes dues`),
              children: (0, q.jsx)(`div`, {
                className: `stack`,
                children: ab.map(([e, r]) => (0, q.jsxs)(`div`, {
                  children: [(0, q.jsxs)(`div`, {
                    className: `row spread small`,
                    children: [(0, q.jsx)(`span`, {
                      children: r
                    }), (0, q.jsx)(`strong`, {
                      children: X(t.aging[e] ?? 0)
                    })]
                  }), (0, q.jsx)(`div`, {
                    className: `bar`,
                    children: (0, q.jsx)(`i`, {
                      style: {
                        width: `${Math.round((t.aging[e] ?? 0) / n * 100)}%`,
                        background: e === `current` ? void 0 : e === `d1_30` ? `#d9a520` : `#c0392b`
                      }
                    })
                  })]
                }, e))
              })
            }), (0, q.jsx)(Q, {
              title: K(`Aujourd'hui`),
              children: (0, q.jsxs)(`dl`, {
                className: `kv`,
                children: [(0, q.jsx)(`dt`, {
                  children: K(`Barrière`)
                }), (0, q.jsxs)(`dd`, {
                  children: [(0, q.jsxs)(cv, {
                    kind: `ok`,
                    children: [t.gateToday.allow, ` `, K(`autorisée(s)`)]
                  }), ` `, (0, q.jsxs)(cv, {
                    kind: `warn`,
                    children: [t.gateToday.flag, ` `, K(`signalée(s)`)]
                  }), ` `, (0, q.jsxs)(cv, {
                    kind: `err`,
                    children: [t.gateToday.deny, ` `, K(`refusée(s)`)]
                  })]
                }), (0, q.jsx)(`dt`, {
                  children: K(`Relances ce mois-ci`)
                }), (0, q.jsx)(`dd`, {
                  children: t.remindersMonth
                }), (0, q.jsx)(`dt`, {
                  children: K(`Exceptions à traiter`)
                }), (0, q.jsx)(`dd`, {
                  children: t.openExceptions ? (0, q.jsx)(m_, {
                    to: `/club/exceptions`,
                    children: t.openExceptions
                  }) : 0
                }), (0, q.jsx)(`dt`, {
                  children: K(`Avoirs des membres`)
                }), (0, q.jsx)(`dd`, {
                  children: X(t.totals.creditMinor)
                }), (0, q.jsx)(`dt`, {
                  children: K(`Mis à jour`)
                }), (0, q.jsx)(`dd`, {
                  children: Z(t.generatedAt, !0)
                })]
              })
            })]
          }), (0, q.jsx)(Q, {
            title: K(`Membres les plus en retard`),
            actions: (0, q.jsx)(m_, {
              to: `/club/membres?filter=arrears`,
              children: K(`Voir tous les membres en retard`)
            }),
            flush: !0,
            children: (0, q.jsx)(mv, {
              rows: t.topDebtors,
              rowKey: e => e.id,
              empty: K(`Aucun membre en retard.`),
              onRow: t => e(`/club/membres/${t.id}`),
              cols: sb()
            })
          })]
        });
      }
    })]
  });
}
var sb = () => [[K(`Membre`), e => (0, q.jsxs)(q.Fragment, {
  children: [(0, q.jsx)(`strong`, {
    children: e.name
  }), (0, q.jsxs)(`div`, {
    className: `small muted`,
    children: [e.number, ` · `, e.plan ? K(e.plan) : `—`]
  })]
})], [K(`État`), e => (0, q.jsx)(lv, {
  map: nv,
  value: e.status
})], [K(`Solde dû`), e => e.balance_minor < 0 ? (0, q.jsxs)(`span`, {
  className: `muted`,
  children: [K(`avoir`), ` `, X(-e.balance_minor)]
}) : X(e.balance_minor), `right`], [K(`En retard`), e => e.overdue_minor ? (0, q.jsxs)(q.Fragment, {
  children: [(0, q.jsx)(`strong`, {
    children: X(e.overdue_minor)
  }), (0, q.jsx)(`div`, {
    className: `small muted`,
    children: rb(e.overdue_days)
  })]
}) : `—`, `right`], [K(`Dernière relance`), e => e.last_reminder_level ? (0, q.jsxs)(q.Fragment, {
  children: [(0, q.jsx)(cv, {
    kind: nb[e.last_reminder_level]?.[1],
    children: nb[e.last_reminder_level]?.[0]
  }), (0, q.jsx)(`div`, {
    className: `small muted`,
    children: Z(e.last_reminder_at)
  })]
}) : `—`], [K(`Référence de paiement`), e => (0, q.jsx)(`span`, {
  className: `code nb`,
  children: e.reference
})]];
function cb() {
  let e = _v(),
    t = eg(),
    n = $y(),
    [r] = b_(),
    [i, a] = (0, G.useState)({
      q: ``,
      filter: r.get(`filter`) ?? ``,
      sort: `amount`
    }),
    o = Object.entries(i).filter(([, e]) => e).map(([e, t]) => `${e}=${encodeURIComponent(t)}`).join(`&`),
    s = Y(`/api/club/members?${o}`),
    c = Y(`/api/club/dues`),
    [l, u] = (0, G.useState)({
      name: ``,
      email: ``,
      phone: ``,
      planId: ``
    });
  return (0, q.jsxs)(q.Fragment, {
    children: [(0, q.jsxs)(fv, {
      title: K(`Membres`),
      sub: K(`Chaque membre a un compte : cotisations et consommations au débit, encaissements confirmés au crédit.`),
      children: [(0, q.jsx)(`input`, {
        type: `text`,
        value: i.q,
        onChange: e => a({
          ...i,
          q: e.target.value
        }),
        placeholder: K(`Nom, numéro, référence, badge`),
        "aria-label": K(`Rechercher`),
        style: {
          width: 230
        }
      }), (0, q.jsxs)(`select`, {
        value: i.filter,
        onChange: e => a({
          ...i,
          filter: e.target.value
        }),
        "aria-label": K(`Filtre`),
        style: {
          width: `auto`
        },
        children: [(0, q.jsx)(`option`, {
          value: ``,
          children: K(`Tous les membres`)
        }), (0, q.jsx)(`option`, {
          value: `arrears`,
          children: K(`En retard`)
        })]
      }), (0, q.jsxs)(`select`, {
        value: i.sort,
        onChange: e => a({
          ...i,
          sort: e.target.value
        }),
        "aria-label": K(`Tri`),
        style: {
          width: `auto`
        },
        children: [(0, q.jsx)(`option`, {
          value: `amount`,
          children: K(`Par montant dû`)
        }), (0, q.jsx)(`option`, {
          value: `age`,
          children: K(`Par ancienneté du retard`)
        }), (0, q.jsx)(`option`, {
          value: ``,
          children: K(`Par numéro`)
        })]
      }), (0, q.jsx)(dv, {
        href: `/api/club/members?format=csv&${o}`
      })]
    }), (0, q.jsxs)(`div`, {
      className: `stack`,
      children: [(0, q.jsx)(Q, {
        title: K(`Comptes membres`),
        flush: !0,
        children: (0, q.jsx)(pv, {
          q: s,
          children: e => (0, q.jsx)(mv, {
            rows: e,
            rowKey: e => e.id,
            empty: K(`Aucun membre pour ces critères.`),
            onRow: e => t(`/club/membres/${e.id}`),
            cols: sb()
          })
        })
      }), eb.includes(n) && (0, q.jsxs)(Q, {
        title: K(`Nouveau membre`),
        children: [(0, q.jsxs)(`div`, {
          className: `grid g4`,
          children: [(0, q.jsx)($, {
            label: K(`Nom`),
            children: (0, q.jsx)(`input`, {
              type: `text`,
              value: l.name,
              onChange: e => u({
                ...l,
                name: e.target.value
              })
            })
          }), (0, q.jsx)($, {
            label: K(`Adresse e-mail`),
            children: (0, q.jsx)(`input`, {
              type: `email`,
              value: l.email,
              onChange: e => u({
                ...l,
                email: e.target.value
              })
            })
          }), (0, q.jsx)($, {
            label: K(`Téléphone`),
            children: (0, q.jsx)(`input`, {
              type: `tel`,
              value: l.phone,
              onChange: e => u({
                ...l,
                phone: e.target.value
              })
            })
          }), (0, q.jsx)($, {
            label: K(`Catégorie d'adhésion`),
            children: (0, q.jsxs)(`select`, {
              value: l.planId,
              onChange: e => u({
                ...l,
                planId: e.target.value
              }),
              children: [(0, q.jsx)(`option`, {
                value: ``,
                children: `—`
              }), c.data?.plans.filter(e => e.active).map(e => (0, q.jsxs)(`option`, {
                value: e.id,
                children: [K(e.name), ` · `, X(e.fee_minor), e.billing === `monthly` ? K(` / mois`) : K(` / an`)]
              }, e.id))]
            })
          })]
        }), (0, q.jsxs)(`div`, {
          className: `row`,
          style: {
            marginTop: 12
          },
          children: [(0, q.jsx)(`button`, {
            disabled: l.name.trim().length < 2,
            onClick: () => e.run(async () => {
              let n = await J(`POST`, `/api/club/members`, {
                ...l,
                planId: l.planId || null
              });
              e.toast(K(`Membre {0} créé.`, n.number)), t(`/club/membres/${n.id}`);
            }),
            children: K(`Créer le membre`)
          }), (0, q.jsx)(`span`, {
            className: `small muted`,
            children: K(`Le numéro, la référence de paiement et le badge sont attribués automatiquement.`)
          })]
        })]
      })]
    })]
  });
}
function lb() {
  let {
      id: e
    } = ng(),
    t = _v(),
    n = $y(),
    r = Y(`/api/club/members/${e}`),
    i = Y(`/api/club/dues`),
    [a, o] = (0, G.useState)(`dues`),
    [s, c] = (0, G.useState)({
      outlet: `bar`,
      label: ``,
      amount: ``
    }),
    [l, u] = (0, G.useState)(null),
    d = (n, i) => t.run(async () => {
      await J(`PATCH`, `/api/club/members/${e}`, n), await r.reload();
    }, i),
    f = () => t.run(async () => {
      await J(`POST`, `/api/club/members/${e}/charges`, {
        kind: `consumption`,
        outlet: s.outlet,
        label: s.label.trim() || iv[s.outlet],
        amountMinor: R_(s.amount)
      }), c({
        ...s,
        label: ``,
        amount: ``
      }), await r.reload();
    }, K(`Consommation imputée au compte.`)),
    p = async () => {
      let n = await t.ask({
        kind: `money`,
        title: K(`Espèces remises au bureau`),
        text: K(`L'encaissement est confirmé immédiatement et tracé à votre nom.`),
        label: K(`Montant reçu (Rs)`),
        confirm: K(`Continuer`)
      });
      if (!n) return;
      let i = await t.ask({
        title: K(`Reçu remis`),
        label: K(`Numéro du reçu ou remarque`),
        confirm: K(`Enregistrer`)
      });
      i && (await t.run(async () => {
        await J(`POST`, `/api/club/members/${e}/cash`, {
          amountMinor: Number(n),
          note: i,
          idempotencyKey: Qy()
        }), await r.reload();
      }, K(`Encaissement enregistré.`)));
    },
    m = async e => {
      let n = await t.ask({
        title: K(`Annuler {0}`, e.number),
        text: K(`Une écriture inverse est transmise à la comptabilité ; rien n'est effacé.`),
        label: K(`Motif`),
        confirm: K(`Annuler le dû`),
        danger: !0
      });
      n && (await t.run(async () => {
        await J(`POST`, `/api/club/charges/${e.id}/cancel`, {
          reason: n
        }), await r.reload();
      }, K(`Dû annulé.`)));
    },
    h = e => t.run(async () => {
      let n = await J(`POST`, `/api/club/payments/${e}/check`);
      t.toast(K(`Réponse du prestataire appliquée : {0}.`, W_[n.status]?.[0] ?? n.status)), await r.reload();
    }),
    g = () => t.run(async () => {
      u(await J(`POST`, `/api/club/members/${e}/statement`)), await r.reload();
    });
  return (0, q.jsx)(pv, {
    q: r,
    children: e => {
      let t = e.member;
      return (0, q.jsxs)(q.Fragment, {
        children: [(0, q.jsx)(fv, {
          title: t.name,
          sub: (0, q.jsxs)(q.Fragment, {
            children: [K(`Membre`), ` `, t.number, ` · `, t.plan ? `${K(t.plan.name)} (${X(t.plan.fee_minor)}${t.plan.billing === `monthly` ? K(` / mois`) : K(` / an`)})` : K(`sans catégorie`), ` · `, K(`depuis le`), ` `, Z(t.joined_at)]
          }),
          children: (0, q.jsx)(m_, {
            to: `/club/membres`,
            children: K(`← Tous les membres`)
          })
        }), (0, q.jsxs)(`div`, {
          className: `stack`,
          children: [(0, q.jsxs)(`div`, {
            className: `grid g4`,
            children: [(0, q.jsx)(uv, {
              label: K(`Solde dû`),
              value: X(e.account.dueMinor),
              hint: e.account.creditMinor ? K(`avoir : {0}`, X(e.account.creditMinor)) : K(`facturé {0} · payé {1}`, X(e.account.chargedMinor), X(e.account.paidMinor))
            }), (0, q.jsx)(uv, {
              label: K(`Dont en retard`),
              value: X(e.account.overdueMinor),
              kind: e.account.overdueMinor ? `warn` : ``,
              hint: e.account.overdueMinor ? K(`plus ancien : {0}`, rb(e.account.overdueDays)) : K(`rien en retard`)
            }), (0, q.jsx)(uv, {
              label: K(`À la barrière`),
              value: (0, q.jsx)(lv, {
                map: av,
                value: e.gate.decision
              }),
              hint: ib(e.gate)
            }), (0, q.jsx)(uv, {
              label: K(`Référence de paiement`),
              value: (0, q.jsx)(`span`, {
                className: `code nb`,
                style: {
                  fontSize: `1rem`
                },
                children: t.reference
              }),
              hint: K(`badge {0} · à indiquer sur tout virement`, t.badge)
            })]
          }), (0, q.jsx)(Q, {
            title: K(`Actions`),
            children: (0, q.jsxs)(`div`, {
              className: `stack`,
              children: [(0, q.jsxs)(`div`, {
                className: `row`,
                children: [(0, q.jsx)(`button`, {
                  onClick: g,
                  children: K(`Envoyer le relevé et le lien de paiement`)
                }), (0, q.jsx)(`a`, {
                  className: `btn secondary`,
                  href: F_(e.portalPath),
                  target: `_blank`,
                  rel: `noreferrer`,
                  children: K(`Ouvrir la page du membre`)
                }), tb.includes(n) && (0, q.jsx)(`button`, {
                  className: `secondary`,
                  onClick: p,
                  children: K(`Enregistrer des espèces`)
                }), eb.includes(n) && (0, q.jsxs)(q.Fragment, {
                  children: [(0, q.jsx)(`select`, {
                    value: t.status,
                    onChange: e => d({
                      status: e.target.value
                    }, K(`État du membre modifié.`)),
                    "aria-label": K(`État du membre`),
                    style: {
                      width: `auto`
                    },
                    children: Object.entries(nv).map(([e, [t]]) => (0, q.jsx)(`option`, {
                      value: e,
                      children: t
                    }, e))
                  }), (0, q.jsxs)(`select`, {
                    value: t.plan?.id ?? ``,
                    onChange: e => d({
                      planId: e.target.value || null
                    }, K(`Catégorie modifiée.`)),
                    "aria-label": K(`Catégorie d'adhésion`),
                    style: {
                      width: `auto`
                    },
                    children: [(0, q.jsx)(`option`, {
                      value: ``,
                      children: K(`sans catégorie`)
                    }), i.data?.plans.map(e => (0, q.jsx)(`option`, {
                      value: e.id,
                      children: K(e.name)
                    }, e.id))]
                  })]
                })]
              }), l && (0, q.jsxs)(`div`, {
                className: `grid g2`,
                children: [(0, q.jsxs)(`div`, {
                  className: `notice`,
                  children: [(0, q.jsx)(`strong`, {
                    children: K(`Message enregistré (démonstration : rien n'est réellement envoyé)`)
                  }), (0, q.jsx)(`p`, {
                    className: `small`,
                    style: {
                      marginTop: 6
                    },
                    children: l.message
                  })]
                }), (0, q.jsxs)(`div`, {
                  className: `stack`,
                  children: [(0, q.jsx)(xy, {
                    value: l.url
                  }), (0, q.jsx)(`div`, {
                    className: `small muted`,
                    style: {
                      textAlign: `center`
                    },
                    children: K(`Le membre peut aussi scanner ce code au secrétariat.`)
                  })]
                })]
              }), eb.includes(n) && t.status === `active` && (0, q.jsxs)(`div`, {
                className: `grid g4`,
                children: [(0, q.jsx)($, {
                  label: K(`Lieu`),
                  children: (0, q.jsx)(`select`, {
                    value: s.outlet,
                    onChange: e => c({
                      ...s,
                      outlet: e.target.value
                    }),
                    children: Object.entries(iv).map(([e, t]) => (0, q.jsx)(`option`, {
                      value: e,
                      children: t
                    }, e))
                  })
                }), (0, q.jsx)($, {
                  label: K(`Libellé`),
                  children: (0, q.jsx)(`input`, {
                    type: `text`,
                    value: s.label,
                    placeholder: iv[s.outlet],
                    onChange: e => c({
                      ...s,
                      label: e.target.value
                    })
                  })
                }), (0, q.jsx)($, {
                  label: K(`Montant (Rs)`),
                  children: (0, q.jsx)(`input`, {
                    type: `text`,
                    inputMode: `decimal`,
                    value: s.amount,
                    onChange: e => c({
                      ...s,
                      amount: e.target.value
                    })
                  })
                }), (0, q.jsx)(`div`, {
                  className: `row`,
                  style: {
                    alignItems: `flex-end`
                  },
                  children: (0, q.jsx)(`button`, {
                    className: `secondary`,
                    disabled: !(R_(s.amount) ?? 0),
                    onClick: f,
                    children: K(`Imputer au compte`)
                  })
                })]
              })]
            })
          }), (0, q.jsx)(`div`, {
            className: `tabs`,
            role: `tablist`,
            children: [[`dues`, K(`Dus`)], [`statement`, K(`Relevé`)], [`payments`, K(`Encaissements`)], [`reminders`, K(`Relances`)], [`gate`, K(`Barrière`)]].map(([e, t]) => (0, q.jsx)(`button`, {
              role: `tab`,
              "aria-selected": a === e,
              onClick: () => o(e),
              children: t
            }, e))
          }), a === `dues` && (0, q.jsx)(Q, {
            title: K(`Cotisations, consommations et frais`),
            flush: !0,
            children: (0, q.jsx)(mv, {
              rows: e.charges,
              rowKey: e => e.id,
              empty: K(`Aucun dû.`),
              cols: [[K(`Pièce`), e => (0, q.jsx)(`span`, {
                className: `code nb`,
                children: e.number
              })], [K(`Nature`), e => (0, q.jsxs)(q.Fragment, {
                children: [ov[e.kind], e.outlet && (0, q.jsx)(`div`, {
                  className: `small muted`,
                  children: iv[e.outlet]
                })]
              })], [K(`Libellé`), e => K(e.label)], [K(`Date d'échéance`), e => (0, q.jsxs)(q.Fragment, {
                children: [Z(e.due_date), e.overdue && (0, q.jsx)(`div`, {
                  children: (0, q.jsx)(cv, {
                    kind: `err`,
                    children: K(`en retard`)
                  })
                })]
              })], [K(`Montant`), e => X(e.amount_minor), `right`], [K(`Reste dû`), e => X(e.remaining_minor), `right`], [K(`État`), e => (0, q.jsxs)(q.Fragment, {
                children: [(0, q.jsx)(lv, {
                  map: sv,
                  value: e.status
                }), e.cancel_reason && (0, q.jsx)(`div`, {
                  className: `small muted`,
                  children: e.cancel_reason
                })]
              })], [``, e => tb.includes(n) && e.status !== `cancelled` ? (0, q.jsx)(`button`, {
                className: `sm danger`,
                onClick: () => m(e),
                children: K(`Annuler`)
              }) : null]]
            })
          }), a === `statement` && (0, q.jsx)(Q, {
            title: K(`Relevé de compte`),
            flush: !0,
            children: (0, q.jsx)(mv, {
              rows: e.statement,
              rowKey: e => `${e.at}${e.ref}`,
              empty: K(`Aucun mouvement.`),
              cols: [[K(`Date`), e => Z(e.at)], [K(`Pièce`), e => (0, q.jsx)(`span`, {
                className: `code nb`,
                children: e.ref
              })], [K(`Libellé`), e => K(e.label)], [K(`Débit`), e => e.debit ? X(e.debit) : ``, `right`], [K(`Crédit`), e => e.credit ? X(e.credit) : ``, `right`], [K(`Solde`), e => X(e.balance), `right`]]
            })
          }), a === `payments` && (0, q.jsx)(Q, {
            title: K(`Encaissements`),
            flush: !0,
            children: (0, q.jsx)(mv, {
              rows: e.payments,
              rowKey: e => e.id,
              empty: K(`Aucun encaissement.`),
              cols: [[K(`Date`), e => Z(e.created_at, !0)], [K(`Moyen`), e => rv[e.method]], [K(`Montant`), e => X(e.amount_minor), `right`], [K(`Paiement`), e => (0, q.jsxs)(q.Fragment, {
                children: [(0, q.jsx)(lv, {
                  map: W_,
                  value: e.status
                }), e.confirmed_via && (0, q.jsxs)(`div`, {
                  className: `small muted`,
                  children: [K(`par`), ` `, $_[e.confirmed_via] ?? e.confirmed_via]
                }), (e.verify_reason ?? e.failure_reason) && (0, q.jsx)(`div`, {
                  className: `small muted`,
                  children: K(e.verify_reason ?? e.failure_reason ?? ``)
                })]
              })], [K(`Règlement bancaire`), e => e.status === `confirmed` && e.method !== `cash` ? (0, q.jsx)(lv, {
                map: G_,
                value: e.settlement_status
              }) : `—`], [K(`Référence`), e => (0, q.jsx)(`span`, {
                className: `code nb`,
                children: e.provider_ref ?? `—`
              })], [``, e => e.method === `link` && (e.status === `pending` || e.status === `to_verify`) ? (0, q.jsx)(`button`, {
                className: `sm`,
                onClick: () => h(e.id),
                children: K(`Interroger le prestataire`)
              }) : null]]
            })
          }), a === `reminders` && (0, q.jsx)(Q, {
            title: K(`Relances et relevés envoyés`),
            flush: !0,
            children: (0, q.jsx)(mv, {
              rows: e.reminders,
              rowKey: e => e.id,
              empty: K(`Aucune relance.`),
              cols: [[K(`Envoyée`), e => Z(e.sent_at, !0)], [K(`Niveau`), e => (0, q.jsx)(cv, {
                kind: nb[e.level]?.[1],
                children: nb[e.level]?.[0]
              })], [K(`Canal`), e => e.channel === `email` ? `E-mail` : `SMS`], [K(`Montant dû`), e => X(e.amount_minor), `right`], [K(`Message`), e => (0, q.jsx)(`span`, {
                className: `small`,
                children: e.message
              })]]
            })
          }), a === `gate` && (0, q.jsx)(Q, {
            title: K(`Passages à la barrière`),
            flush: !0,
            children: (0, q.jsx)(mv, {
              rows: e.gateEvents,
              rowKey: e => e.id,
              empty: K(`Aucun passage enregistré.`),
              cols: [[K(`Date`), e => Z(e.at, !0)], [K(`Décision`), e => (0, q.jsx)(lv, {
                map: av,
                value: e.decision
              })], [K(`Motif`), e => ib(e)], [K(`Contrôle`), e => e.source === `reader` ? K(`lecteur`) : K(`accueil`)]]
            })
          })]
        })]
      });
    }
  });
}
function ub() {
  let e = _v(),
    t = $y(),
    {
      session: n
    } = xv(),
    r = Y(`/api/club/dues`),
    [i, a] = (0, G.useState)(n.today.slice(0, 4)),
    o = async () => {
      (await e.ask({
        kind: `confirm`,
        title: K(`Facturer la période {0} ?`, i),
        text: i.length === 4 ? K(`Adhésions annuelles : une cotisation par membre actif. Un membre déjà facturé pour cette période est ignoré.`) : K(`Adhésions mensuelles : une cotisation par membre actif. Un membre déjà facturé pour cette période est ignoré.`),
        confirm: K(`Facturer`)
      })) && (await e.run(async () => {
        let t = await J(`POST`, `/api/club/dues/run`, {
          period: i
        });
        e.toast(K(`{0} cotisation(s) facturée(s) pour {1}, {2} déjà facturée(s).`, t.created, X(t.amountMinor), t.skipped)), await r.reload();
      }));
    };
  return (0, q.jsxs)(q.Fragment, {
    children: [(0, q.jsx)(fv, {
      title: K(`Cotisations`),
      sub: K(`Catégories d'adhésion et facturation récurrente, annuelle ou mensuelle.`)
    }), (0, q.jsx)(pv, {
      q: r,
      children: e => (0, q.jsxs)(`div`, {
        className: `stack`,
        children: [tb.includes(t) && (0, q.jsx)(Q, {
          title: K(`Facturer une période`),
          children: (0, q.jsxs)(`div`, {
            className: `row`,
            children: [(0, q.jsx)($, {
              label: K(`Période (AAAA ou AAAA-MM)`),
              children: (0, q.jsx)(`input`, {
                type: `text`,
                value: i,
                onChange: e => a(e.target.value.trim()),
                style: {
                  width: 140
                }
              })
            }), (0, q.jsx)(`button`, {
              className: `secondary sm`,
              onClick: () => a(n.today.slice(0, 4)),
              children: K(`Année en cours`)
            }), (0, q.jsx)(`button`, {
              className: `secondary sm`,
              onClick: () => a(n.today.slice(0, 7)),
              children: K(`Mois en cours`)
            }), (0, q.jsx)(`button`, {
              disabled: !/^\d{4}(-(0[1-9]|1[0-2]))?$/.test(i),
              onClick: o,
              children: K(`Facturer`)
            })]
          })
        }), (0, q.jsx)(Q, {
          title: K(`Catégories d'adhésion`),
          flush: !0,
          children: (0, q.jsx)(mv, {
            rows: e.plans,
            rowKey: e => e.id,
            empty: K(`Aucune catégorie.`),
            cols: [[K(`Catégorie`), e => (0, q.jsxs)(q.Fragment, {
              children: [(0, q.jsx)(`strong`, {
                children: K(e.name)
              }), (0, q.jsx)(`div`, {
                className: `small muted`,
                children: e.code
              })]
            })], [K(`Rythme`), e => e.billing === `monthly` ? K(`Mensuel`) : K(`Annuel`)], [K(`Cotisation`), e => X(e.fee_minor), `right`], [K(`Membres actifs`), e => e.members, `right`]]
          })
        }), (0, q.jsx)(Q, {
          title: K(`Périodes facturées`),
          flush: !0,
          children: (0, q.jsx)(mv, {
            rows: e.periods,
            rowKey: e => e.period,
            empty: K(`Aucune cotisation facturée.`),
            cols: [[K(`Période`), e => (0, q.jsx)(`strong`, {
              children: e.period
            })], [K(`Facturée le`), e => Z(e.billed_at)], [K(`Cotisations`), e => e.count, `right`], [K(`Montant`), e => X(e.amount_minor), `right`], [K(`Encaissé`), e => X(e.collected_minor), `right`], [K(`Taux de recouvrement`), e => (0, q.jsxs)(`div`, {
              style: {
                minWidth: 120
              },
              children: [(0, q.jsx)(`div`, {
                className: `bar`,
                children: (0, q.jsx)(`i`, {
                  style: {
                    width: `${Math.round(e.collected_minor / Math.max(1, e.amount_minor) * 100)}%`
                  }
                })
              }), (0, q.jsxs)(`span`, {
                className: `small muted`,
                children: [Math.round(e.collected_minor / Math.max(1, e.amount_minor) * 100), ` %`]
              })]
            })]]
          })
        })]
      })
    })]
  });
}
function db() {
  let e = _v(),
    t = eg(),
    n = $y(),
    r = Y(`/api/club/reminders`);
  return (0, q.jsxs)(q.Fragment, {
    children: [(0, q.jsx)(fv, {
      title: K(`Relances`),
      sub: K(`Le moteur relance chaque membre en retard selon l'ancienneté de sa plus vieille dette. Une relance par niveau : relancer deux fois n'envoie rien de plus.`),
      children: tb.includes(n) && (0, q.jsx)(`button`, {
        onClick: () => e.run(async () => {
          let t = await J(`POST`, `/api/club/reminders/run`);
          e.toast(K(`{0} relance(s) envoyée(s) (niveaux 1 / 2 / 3 : {1} / {2} / {3}), {4} déjà faite(s).`, t.sent, t.byLevel[1] ?? 0, t.byLevel[2] ?? 0, t.byLevel[3] ?? 0, t.alreadySent)), await r.reload();
        }),
        children: K(`Lancer les relances`)
      })
    }), (0, q.jsxs)(`div`, {
      className: `stack`,
      children: [(0, q.jsx)(`div`, {
        className: `notice warn`,
        children: K(`Démonstration : aucun e-mail ni SMS n'est réellement envoyé. Chaque relance est enregistrée avec son texte, le lien vers la page du membre et sa référence de paiement.`)
      }), (0, q.jsx)(Q, {
        title: K(`Relances et relevés envoyés`),
        flush: !0,
        children: (0, q.jsx)(pv, {
          q: r,
          children: e => (0, q.jsx)(mv, {
            rows: e,
            rowKey: e => e.id,
            empty: K(`Aucune relance.`),
            onRow: e => t(`/club/membres/${e.member_id}`),
            cols: [[K(`Envoyée`), e => Z(e.sent_at, !0)], [K(`Membre`), e => (0, q.jsxs)(q.Fragment, {
              children: [(0, q.jsx)(`strong`, {
                children: e.member
              }), (0, q.jsx)(`div`, {
                className: `small muted`,
                children: e.member_number
              })]
            })], [K(`Niveau`), e => (0, q.jsx)(cv, {
              kind: nb[e.level]?.[1],
              children: nb[e.level]?.[0]
            })], [K(`Retard`), e => e.overdue_days ? rb(e.overdue_days) : `—`, `right`], [K(`Montant dû`), e => X(e.amount_minor), `right`], [K(`Canal`), e => e.channel === `email` ? `E-mail` : `SMS`], [K(`Par`), e => e.sent_by ?? `—`]]
          })
        })
      })]
    })]
  });
}
function fb() {
  let e = _v(),
    t = eg(),
    [n, r] = (0, G.useState)({
      status: ``,
      method: ``
    }),
    i = Object.entries(n).filter(([, e]) => e).map(([e, t]) => `${e}=${encodeURIComponent(t)}`).join(`&`),
    a = Y(`/api/club/payments${i ? `?${i}` : ``}`, 8e3),
    o = t => e.run(async () => {
      let n = await J(`POST`, `/api/club/payments/${t}/check`);
      e.toast(K(`Réponse du prestataire appliquée : {0}.`, W_[n.status]?.[0] ?? n.status)), await a.reload();
    });
  return (0, q.jsxs)(q.Fragment, {
    children: [(0, q.jsxs)(fv, {
      title: K(`Encaissements`),
      sub: K(`Paiements en ligne, virements identifiés sur le relevé, espèces au bureau. « Confirmé » et « réglé en banque » sont suivis séparément.`),
      children: [(0, q.jsxs)(`select`, {
        value: n.status,
        onChange: e => r({
          ...n,
          status: e.target.value
        }),
        "aria-label": K(`État`),
        style: {
          width: `auto`
        },
        children: [(0, q.jsx)(`option`, {
          value: ``,
          children: K(`Tous les états`)
        }), [`pending`, `to_verify`, `confirmed`, `failed`].map(e => (0, q.jsx)(`option`, {
          value: e,
          children: W_[e][0]
        }, e))]
      }), (0, q.jsxs)(`select`, {
        value: n.method,
        onChange: e => r({
          ...n,
          method: e.target.value
        }),
        "aria-label": K(`Moyen`),
        style: {
          width: `auto`
        },
        children: [(0, q.jsx)(`option`, {
          value: ``,
          children: K(`Tous les moyens`)
        }), Object.entries(rv).map(([e, t]) => (0, q.jsx)(`option`, {
          value: e,
          children: t
        }, e))]
      }), (0, q.jsx)(dv, {
        href: `/api/club/payments?format=csv${i ? `&${i}` : ``}`
      })]
    }), (0, q.jsx)(Q, {
      title: K(`Encaissements des membres`),
      flush: !0,
      children: (0, q.jsx)(pv, {
        q: a,
        children: e => (0, q.jsx)(mv, {
          rows: e,
          rowKey: e => e.id,
          empty: K(`Aucun encaissement pour ces critères.`),
          onRow: e => t(`/club/membres/${e.member_id}`),
          cols: [[K(`Date`), e => Z(e.created_at, !0)], [K(`Membre`), e => (0, q.jsxs)(q.Fragment, {
            children: [(0, q.jsx)(`strong`, {
              children: e.member
            }), (0, q.jsx)(`div`, {
              className: `small muted`,
              children: e.member_number
            })]
          })], [K(`Moyen`), e => rv[e.method]], [K(`Montant`), e => X(e.amount_minor), `right`], [K(`Paiement`), e => (0, q.jsxs)(q.Fragment, {
            children: [(0, q.jsx)(lv, {
              map: W_,
              value: e.status
            }), e.confirmed_via && (0, q.jsxs)(`div`, {
              className: `small muted`,
              children: [K(`par`), ` `, $_[e.confirmed_via] ?? e.confirmed_via]
            }), (e.verify_reason ?? e.failure_reason) && (0, q.jsx)(`div`, {
              className: `small muted`,
              children: K(e.verify_reason ?? e.failure_reason ?? ``)
            })]
          })], [K(`Règlement bancaire`), e => e.status === `confirmed` && e.method !== `cash` ? (0, q.jsx)(lv, {
            map: G_,
            value: e.settlement_status
          }) : `—`], [K(`Frais`), e => e.fee_actual_minor === null ? `—` : X(e.fee_actual_minor), `right`], [K(`Référence`), e => (0, q.jsx)(`span`, {
            className: `code nb`,
            children: e.provider_ref ?? e.reference
          })], [``, e => e.method === `link` && (e.status === `pending` || e.status === `to_verify`) ? (0, q.jsx)(`span`, {
            onClick: e => e.stopPropagation(),
            children: (0, q.jsx)(`button`, {
              className: `sm`,
              onClick: () => o(e.id),
              children: K(`Interroger le prestataire`)
            })
          }) : null]]
        })
      })
    })]
  });
}
function pb() {
  let e = _v(),
    {
      session: t
    } = xv(),
    n = Y(`/api/club/reconciliation`),
    r = Y(`/api/club/members`),
    [i, a] = (0, G.useState)(``),
    [o, s] = (0, G.useState)(``),
    [c, l] = (0, G.useState)({}),
    u = () => e.run(async () => {
      let e = await J(`GET`, `/api/club/statements/demo`);
      a(e.filename), s(e.content);
    }),
    d = async e => {
      e && (a(e.name), s(await e.text()));
    },
    f = () => e.run(async () => {
      let t = await J(`POST`, `/api/club/statements`, {
        filename: i || `releve.csv`,
        content: o
      });
      e.toast(K(`{0} ligne(s) rapprochée(s), {1} en exception, {2} déjà importée(s).`, t.matched, t.exceptions, t.skipped)), s(``), a(``), await n.reload(), await r.reload();
    }),
    p = async t => {
      let i = await e.ask({
        title: K(`Affecter ce virement`),
        text: K(`Le virement est enregistré comme encaissement du membre choisi. La décision est tracée dans le journal d'audit.`),
        label: K(`Justification (nom sur le virement, appel du membre...)`),
        confirm: K(`Affecter`)
      });
      i && (await e.run(async () => {
        await J(`POST`, `/api/club/bank-lines/${t}/assign`, {
          memberId: c[t],
          note: i
        }), await n.reload(), await r.reload();
      }, K(`Virement affecté au membre.`)));
    };
  return (0, q.jsxs)(q.Fragment, {
    children: [(0, q.jsx)(fv, {
      title: K(`Rapprochement bancaire`),
      sub: K(`Chaque virement est identifié par la référence structurée du membre ; les paiements en ligne par la référence du prestataire.`)
    }), (0, q.jsx)(pv, {
      q: n,
      children: e => {
        let n = e.lines.filter(e => e.match_status === `unmatched` && !e.member_id && e.gross_minor > 0);
        return (0, q.jsxs)(`div`, {
          className: `stack`,
          children: [(0, q.jsx)(Q, {
            title: K(`Importer un relevé`),
            children: (0, q.jsxs)(`div`, {
              className: `stack`,
              children: [(0, q.jsxs)(`div`, {
                className: `row`,
                children: [(0, q.jsx)(`input`, {
                  type: `file`,
                  accept: `.csv,text/csv`,
                  onChange: e => void d(e.target.files?.[0]),
                  "aria-label": K(`Fichier de relevé`),
                  style: {
                    width: `auto`
                  }
                }), t.demoMode && (0, q.jsx)(`button`, {
                  className: `secondary`,
                  onClick: u,
                  children: K(`Générer un relevé de démonstration (virements bien et mal référencés)`)
                })]
              }), (0, q.jsx)($, {
                label: K(`Contenu {0}`, i ? `· ${i}` : ``),
                hint: K(`Format de démonstration : date;reference;libelle;montant_brut;frais;montant_net. Le format réel dépend de la banque (à vérifier).`),
                children: (0, q.jsx)(`textarea`, {
                  className: `mono`,
                  value: o,
                  onChange: e => s(e.target.value),
                  rows: 6,
                  placeholder: `date;reference;libelle;montant_brut;frais;montant_net`
                })
              }), (0, q.jsx)(`div`, {
                children: (0, q.jsx)(`button`, {
                  disabled: o.trim().length < 10,
                  onClick: f,
                  children: K(`Importer et rapprocher`)
                })
              })]
            })
          }), (0, q.jsx)(Q, {
            title: K(`Virements à affecter ({0})`, n.length),
            flush: !0,
            children: (0, q.jsx)(mv, {
              rows: n,
              rowKey: e => e.id,
              empty: K(`Aucun virement en attente d'affectation.`),
              cols: [[K(`Date de valeur`), e => e.value_date], [K(`Libellé`), e => (0, q.jsxs)(q.Fragment, {
                children: [(0, q.jsx)(`span`, {
                  children: e.label
                }), (0, q.jsx)(`div`, {
                  className: `small muted code nb`,
                  children: e.reference
                })]
              })], [K(`Montant`), e => X(e.gross_minor), `right`], [K(`Membre`), e => (0, q.jsxs)(`select`, {
                value: c[e.id] ?? ``,
                onChange: t => l({
                  ...c,
                  [e.id]: t.target.value
                }),
                "aria-label": K(`Membre à qui affecter`),
                style: {
                  minWidth: 220
                },
                children: [(0, q.jsx)(`option`, {
                  value: ``,
                  children: K(`Choisir un membre`)
                }), r.data?.map(e => (0, q.jsxs)(`option`, {
                  value: e.id,
                  children: [e.number, ` · `, e.name, e.overdue_minor ? ` · ${X(e.overdue_minor)}` : ``]
                }, e.id))]
              })], [``, e => (0, q.jsx)(`button`, {
                className: `sm`,
                disabled: !c[e.id],
                onClick: () => p(e.id),
                children: K(`Affecter`)
              })]]
            })
          }), (0, q.jsx)(Q, {
            title: K(`Paiements en ligne confirmés, non réglés en banque ({0})`, e.unsettled.length),
            flush: !0,
            children: (0, q.jsx)(mv, {
              rows: e.unsettled,
              rowKey: e => e.id,
              empty: K(`Tous les paiements en ligne confirmés sont réglés.`),
              cols: [[K(`Confirmé`), e => Z(e.confirmed_at, !0)], [K(`Membre`), e => `${e.member_number} · ${e.member}`], [K(`Montant`), e => X(e.amount_minor), `right`], [K(`Référence attendue sur le relevé`), e => (0, q.jsx)(`span`, {
                className: `code nb`,
                children: e.provider_ref
              })]]
            })
          }), (0, q.jsx)(Q, {
            title: K(`Lignes de relevé`),
            flush: !0,
            children: (0, q.jsx)(mv, {
              rows: e.lines,
              rowKey: e => e.id,
              empty: K(`Aucun relevé importé.`),
              cols: [[K(`Date de valeur`), e => e.value_date], [K(`Libellé`), e => (0, q.jsxs)(q.Fragment, {
                children: [(0, q.jsx)(`span`, {
                  children: e.label
                }), (0, q.jsx)(`div`, {
                  className: `small muted code nb`,
                  children: e.reference
                })]
              })], [K(`Brut`), e => X(e.gross_minor), `right`], [K(`Frais`), e => X(e.fee_minor), `right`], [K(`Rapprochement`), e => (0, q.jsxs)(q.Fragment, {
                children: [(0, q.jsx)(lv, {
                  map: Y_,
                  value: e.match_status
                }), e.confirmed_via === `manual_assignment` && (0, q.jsx)(`div`, {
                  className: `small muted`,
                  children: K(`affecté à la main`)
                })]
              })], [K(`Membre`), e => e.member ? (0, q.jsxs)(m_, {
                to: `/club/membres/${e.member_id}`,
                children: [e.member_number, ` · `, e.member]
              }) : `—`]]
            })
          }), (0, q.jsx)(Q, {
            title: K(`Relevés importés`),
            flush: !0,
            children: (0, q.jsx)(mv, {
              rows: e.statements,
              rowKey: e => e.id,
              empty: K(`Aucun relevé importé.`),
              cols: [[K(`Importé`), e => Z(e.imported_at, !0)], [K(`Fichier`), e => e.filename], [K(`Par`), e => e.imported_by_name ?? `—`], [K(`Lignes`), e => e.line_count, `right`], [K(`Rapprochées`), e => e.matched_count, `right`], [K(`Déjà importées`), e => e.skipped_count, `right`]]
            })
          })]
        });
      }
    })]
  });
}
function mb() {
  let {
      session: e
    } = xv(),
    [t, n] = (0, G.useState)({
      from: `${e.today.slice(0, 7)}-01`,
      to: e.today
    }),
    r = `from=${t.from}&to=${t.to}`,
    i = Y(`/api/club/accounting?${r}`);
  return (0, q.jsxs)(q.Fragment, {
    children: [(0, q.jsxs)(fv, {
      title: K(`Export comptable`),
      sub: K(`Écritures de la période, équilibrées, à importer dans le logiciel comptable du club.`),
      children: [(0, q.jsx)(`input`, {
        type: `date`,
        value: t.from,
        max: t.to,
        onChange: e => n({
          ...t,
          from: e.target.value
        }),
        "aria-label": K(`Du`),
        style: {
          width: `auto`
        }
      }), (0, q.jsx)(`input`, {
        type: `date`,
        value: t.to,
        min: t.from,
        max: e.today,
        onChange: e => n({
          ...t,
          to: e.target.value
        }),
        "aria-label": K(`Au`),
        style: {
          width: `auto`
        }
      }), (0, q.jsx)(dv, {
        href: `/api/club/accounting?format=csv&${r}`
      })]
    }), (0, q.jsxs)(`div`, {
      className: `stack`,
      children: [(0, q.jsx)(`div`, {
        className: `notice warn`,
        children: K(`Le gabarit de colonnes, le plan comptable et les journaux sont des valeurs de démonstration. L'import automatique dans le logiciel comptable dépend de l'édition utilisée, de ses outils d'import et de la validation par la comptabilité du club : il est à évaluer, rien n'est garanti à ce stade.`)
      }), (0, q.jsx)(pv, {
        q: i,
        children: e => (0, q.jsxs)(q.Fragment, {
          children: [(0, q.jsxs)(`div`, {
            className: `grid g3`,
            children: [(0, q.jsx)(uv, {
              label: K(`Total débit`),
              value: X(e.totals.debit)
            }), (0, q.jsx)(uv, {
              label: K(`Total crédit`),
              value: X(e.totals.credit)
            }), (0, q.jsx)(uv, {
              label: K(`Équilibre`),
              value: e.totals.balanced ? (0, q.jsx)(cv, {
                kind: `ok`,
                children: K(`Équilibré`)
              }) : (0, q.jsx)(cv, {
                kind: `err`,
                children: K(`Déséquilibré`)
              }),
              hint: K(`{0} ligne(s)`, e.lines.length)
            })]
          }), (0, q.jsx)(Q, {
            title: K(`Écritures`),
            actions: (0, q.jsx)(m_, {
              to: `/club/erp`,
              children: K(`File de synchronisation comptable`)
            }),
            flush: !0,
            children: (0, q.jsx)(mv, {
              rows: e.lines.slice(0, 400),
              rowKey: e => `${e.piece}${e.account}${e.debit}${e.credit}${e.date}${e.label}`,
              empty: K(`Aucune écriture sur la période.`),
              cols: [[K(`Date`), e => e.date], [K(`Journal`), e => e.journal], [K(`Compte`), e => (0, q.jsx)(`span`, {
                className: `code nb`,
                children: e.account
              })], [K(`Compte tiers`), e => e.aux || `—`], [K(`Pièce`), e => (0, q.jsx)(`span`, {
                className: `small`,
                children: e.piece
              })], [K(`Libellé`), e => (0, q.jsx)(`span`, {
                className: `small`,
                children: e.label
              })], [K(`Débit`), e => e.debit ? X(e.debit) : ``, `right`], [K(`Crédit`), e => e.credit ? X(e.credit) : ``, `right`]]
            })
          })]
        })
      })]
    })]
  });
}
function hb() {
  let e = eg(),
    t = $y(),
    [n, r] = (0, G.useState)(!0),
    i = Y(`/api/club/gate/events${n ? `?today=1` : ``}`, 8e3),
    a = Y(t === `company_admin` ? `/api/club/gate/devices` : null);
  return (0, q.jsxs)(q.Fragment, {
    children: [(0, q.jsxs)(fv, {
      title: K(`Barrière d'accès`),
      sub: K(`Chaque passage est décidé sur l'état du compte au moment même : entrée autorisée, signalée à l'accueil, ou refusée.`),
      children: [(0, q.jsxs)(`div`, {
        className: `tabs`,
        style: {
          margin: 0
        },
        children: [(0, q.jsx)(`button`, {
          "aria-selected": n,
          onClick: () => r(!0),
          children: K(`Aujourd'hui`)
        }), (0, q.jsx)(`button`, {
          "aria-selected": !n,
          onClick: () => r(!1),
          children: K(`Historique`)
        })]
      }), (0, q.jsx)(m_, {
        to: `/club/accueil`,
        className: `btn secondary`,
        children: K(`Écran de l'accueil`)
      })]
    }), (0, q.jsxs)(`div`, {
      className: `stack`,
      children: [(0, q.jsx)(Q, {
        title: K(`Passages`),
        flush: !0,
        children: (0, q.jsx)(pv, {
          q: i,
          children: t => (0, q.jsx)(mv, {
            rows: t,
            rowKey: e => e.id,
            empty: K(`Aucun passage.`),
            onRow: t => t.member_id && e(`/club/membres/${t.member_id}`),
            cols: [[K(`Heure`), e => Z(e.at, !0)], [K(`Décision`), e => (0, q.jsx)(lv, {
              map: av,
              value: e.decision
            })], [K(`Membre`), e => e.member ? (0, q.jsxs)(q.Fragment, {
              children: [(0, q.jsx)(`strong`, {
                children: e.member
              }), (0, q.jsx)(`div`, {
                className: `small muted`,
                children: e.member_number
              })]
            }) : (0, q.jsxs)(`span`, {
              className: `muted`,
              children: [K(`inconnu`), ` (`, e.credential_hint, `)`]
            })], [K(`Motif`), e => ib(e)], [K(`Contrôle`), e => e.source === `reader` ? K(e.device ?? `lecteur`) : K(`accueil`)]]
          })
        })
      }), t === `company_admin` && (0, q.jsx)(pv, {
        q: a,
        children: e => (0, q.jsxs)(Q, {
          title: K(`Lecteurs enregistrés`),
          children: [(0, q.jsx)(`ul`, {
            className: `plain`,
            children: e.map(e => (0, q.jsxs)(`li`, {
              className: `row spread`,
              children: [(0, q.jsxs)(`span`, {
                children: [(0, q.jsx)(`strong`, {
                  children: K(e.name)
                }), ` `, (0, q.jsx)(`span`, {
                  className: `code nb`,
                  children: e.id
                })]
              }), (0, q.jsx)(cv, {
                kind: e.active ? `ok` : ``,
                children: e.active ? K(`Actif`) : K(`Désactivé`)
              })]
            }, e.id))
          }), (0, q.jsx)(`p`, {
            className: `small muted`,
            style: {
              marginTop: 10
            },
            children: K(`Le lecteur interroge le club par une demande signée (secret propre au lecteur, horodatage). Il ne reçoit ni nom ni montant : seulement « ouvrir » ou non et un message court. L'interface réelle dépend du fournisseur de la barrière (à vérifier).`)
          })]
        })
      })]
    })]
  });
}
function gb() {
  let e = _v(),
    {
      session: t,
      refresh: n
    } = xv(),
    [r, i] = (0, G.useState)(``),
    [a, o] = (0, G.useState)(null),
    s = Y(`/api/club/gate/events?today=1`, 6e3),
    c = t => e.run(async () => {
      o(await J(`POST`, `/api/club/gate/check`, {
        credential: t
      })), i(``), await s.reload();
    }),
    l = async () => {
      await J(`POST`, `/api/logout`), await n(), location.href = F_(`/`);
    },
    u = {
      allow: K(`ENTRÉE AUTORISÉE`),
      flag: K(`ENTRÉE SIGNALÉE`),
      deny: K(`ENTRÉE REFUSÉE`)
    };
  return (0, q.jsxs)(`div`, {
    className: `mobile stack`,
    children: [(0, q.jsxs)(`div`, {
      className: `mobile-head`,
      children: [(0, q.jsxs)(`div`, {
        className: `row spread`,
        children: [(0, q.jsx)(`h1`, {
          children: K(`Accueil du club`)
        }), (0, q.jsxs)(`div`, {
          className: `row`,
          children: [(0, q.jsx)(yv, {}), (0, q.jsx)(`button`, {
            className: `sm ghost`,
            onClick: l,
            children: K(`Changer de profil`)
          })]
        })]
      }), (0, q.jsxs)(`div`, {
        className: `muted`,
        children: [t.user?.companyName, ` · `, t.user?.name]
      })]
    }), (0, q.jsx)(`form`, {
      className: `card`,
      onSubmit: e => {
        e.preventDefault(), r.trim() && c(r.trim());
      },
      children: (0, q.jsxs)(`div`, {
        className: `body stack`,
        children: [(0, q.jsx)($, {
          label: K(`Badge, carte ou code du membre`),
          children: (0, q.jsx)(`input`, {
            type: `text`,
            value: r,
            onChange: e => i(e.target.value.toUpperCase()),
            autoFocus: !0,
            autoComplete: `off`
          })
        }), (0, q.jsx)(`button`, {
          className: `big`,
          disabled: !r.trim(),
          children: K(`Contrôler`)
        }), t.demoMode && (0, q.jsx)(`div`, {
          className: `chips`,
          children: [`B00001`, `B00008`, `B00010`, `B00014`, `B99999`].map(e => (0, q.jsx)(`button`, {
            type: `button`,
            className: `chip`,
            onClick: () => c(e),
            children: e
          }, e))
        })]
      })
    }), a && (0, q.jsx)(`div`, {
      className: `card`,
      children: (0, q.jsxs)(`div`, {
        className: `body stack`,
        children: [(0, q.jsxs)(`div`, {
          className: a.decision === `allow` ? `success` : a.decision === `flag` ? `notice warn` : `notice err`,
          style: {
            textAlign: `center`,
            padding: 18
          },
          children: [(0, q.jsx)(`div`, {
            style: {
              fontSize: `1.4rem`,
              fontWeight: 700
            },
            children: u[a.decision]
          }), (0, q.jsx)(`div`, {
            children: ib(a)
          })]
        }), a.member && (0, q.jsxs)(`dl`, {
          className: `kv`,
          children: [(0, q.jsx)(`dt`, {
            children: K(`Membre`)
          }), (0, q.jsxs)(`dd`, {
            children: [(0, q.jsx)(`strong`, {
              children: a.member.name
            }), ` · `, a.member.number]
          }), (0, q.jsx)(`dt`, {
            children: K(`État`)
          }), (0, q.jsx)(`dd`, {
            children: (0, q.jsx)(lv, {
              map: nv,
              value: a.member.status
            })
          }), a.overdueMinor > 0 && (0, q.jsxs)(q.Fragment, {
            children: [(0, q.jsx)(`dt`, {
              children: K(`En retard`)
            }), (0, q.jsxs)(`dd`, {
              children: [X(a.overdueMinor), ` · `, rb(a.overdueDays)]
            })]
          })]
        }), a.member && a.overdueMinor > 0 && (0, q.jsxs)(q.Fragment, {
          children: [(0, q.jsx)(`div`, {
            className: `small muted`,
            children: K(`Le membre peut régulariser tout de suite : il scanne ce code et paie en ligne sur son téléphone.`)
          }), (0, q.jsx)(xy, {
            value: I_(a.member.portalPath)
          })]
        })]
      })
    }), (0, q.jsxs)(`div`, {
      className: `card`,
      children: [(0, q.jsx)(`header`, {
        children: (0, q.jsx)(`h2`, {
          children: K(`Passages du jour`)
        })
      }), (0, q.jsx)(pv, {
        q: s,
        children: e => (0, q.jsxs)(`ul`, {
          className: `plain`,
          style: {
            padding: `0 16px`
          },
          children: [e.slice(0, 12).map(e => (0, q.jsxs)(`li`, {
            className: `row spread`,
            children: [(0, q.jsxs)(`span`, {
              children: [(0, q.jsx)(lv, {
                map: av,
                value: e.decision
              }), ` `, e.member ?? K(`inconnu`)]
            }), (0, q.jsx)(`span`, {
              className: `small muted`,
              children: Z(e.at, !0)
            })]
          }, e.id)), !e.length && (0, q.jsx)(`li`, {
            className: `muted`,
            children: K(`Aucun passage.`)
          })]
        })
      })]
    })]
  });
}
function _b() {
  let {
      token: e
    } = ng(),
    t = _v(),
    n = Y(`/api/public/member/${e}`, 3e3),
    [r] = (0, G.useState)(Qy),
    i = () => t.run(async () => {
      await J(`POST`, `/api/public/member/${e}/pay`, {
        idempotencyKey: r
      }), await n.reload();
    }),
    a = r => t.run(async () => {
      await J(`POST`, `/api/public/member/${e}/pay/demo`, {
        outcome: r
      }), await n.reload();
    });
  return (0, q.jsx)(`div`, {
    className: `mobile stack`,
    children: (0, q.jsx)(pv, {
      q: n,
      children: e => (0, q.jsxs)(q.Fragment, {
        children: [(0, q.jsxs)(`div`, {
          className: `mobile-head`,
          children: [(0, q.jsxs)(`div`, {
            className: `row spread`,
            children: [(0, q.jsx)(`h1`, {
              children: e.club
            }), (0, q.jsx)(yv, {})]
          }), (0, q.jsx)(`div`, {
            className: `muted`,
            children: K(`Bonjour {0} · membre {1}`, e.firstName, e.number)
          })]
        }), (0, q.jsx)(`div`, {
          className: `card`,
          children: (0, q.jsxs)(`div`, {
            className: `body stack`,
            children: [e.dueMinor > 0 ? (0, q.jsxs)(`div`, {
              className: `duebox`,
              children: [(0, q.jsx)(`div`, {
                className: `small`,
                children: K(`Montant dû sur votre compte`)
              }), (0, q.jsx)(`div`, {
                className: `amount`,
                children: X(e.dueMinor)
              }), e.overdueMinor > 0 && (0, q.jsx)(`div`, {
                className: `small`,
                children: K(`dont {0} en retard de {1} jour(s)`, X(e.overdueMinor), e.overdueDays)
              })]
            }) : (0, q.jsxs)(`div`, {
              className: `success`,
              children: [(0, q.jsx)(`div`, {
                className: `big`,
                children: K(`Compte à jour`)
              }), (0, q.jsx)(`div`, {
                children: e.creditMinor ? K(`Avoir : {0}`, X(e.creditMinor)) : K(`Merci, rien n'est dû.`)
              })]
            }), e.lastPayment?.status === `pending` && (0, q.jsxs)(q.Fragment, {
              children: [(0, q.jsx)(`div`, {
                className: `notice`,
                children: K(`Paiement de {0} en cours.`, X(e.lastPayment.amountMinor))
              }), e.demoMode && (0, q.jsxs)(q.Fragment, {
                children: [(0, q.jsx)(`div`, {
                  className: `notice warn`,
                  children: K(`Page de démonstration. En production, le membre est dirigé vers la page de paiement hébergée par le prestataire : aucune donnée de carte n'est saisie ni conservée par cette application.`)
                }), (0, q.jsx)(`button`, {
                  className: `big`,
                  onClick: () => a(`success`),
                  children: K(`Simuler un paiement réussi`)
                }), (0, q.jsx)(`button`, {
                  className: `big secondary`,
                  onClick: () => a(`failure`),
                  children: K(`Simuler un paiement refusé`)
                })]
              })]
            }), e.lastPayment?.status === `to_verify` && (0, q.jsx)(`div`, {
              className: `notice warn`,
              children: K(`Votre dernier paiement est en cours de vérification par le club.`)
            }), e.lastPayment?.status === `failed` && e.dueMinor > 0 && (0, q.jsx)(`div`, {
              className: `notice err`,
              children: K(`Votre dernier paiement n'a pas abouti. Vous pouvez réessayer.`)
            }), e.dueMinor > 0 && e.lastPayment?.status !== `pending` && e.lastPayment?.status !== `to_verify` && (0, q.jsx)(`button`, {
              className: `big`,
              onClick: i,
              children: K(`Payer {0} en ligne`, X(e.dueMinor))
            }), e.dueMinor > 0 && (0, q.jsxs)(`div`, {
              className: `small muted`,
              children: [K(`Par virement, indiquez toujours votre référence :`), ` `, (0, q.jsx)(`span`, {
                className: `code nb`,
                children: e.reference
              })]
            })]
          })
        }), e.open.length > 0 && (0, q.jsxs)(`div`, {
          className: `card`,
          children: [(0, q.jsx)(`header`, {
            children: (0, q.jsx)(`h2`, {
              children: K(`Ce qui reste à régler`)
            })
          }), (0, q.jsx)(`ul`, {
            className: `plain`,
            style: {
              padding: `0 16px`
            },
            children: e.open.map((e, t) => (0, q.jsxs)(`li`, {
              className: `row spread`,
              children: [(0, q.jsxs)(`span`, {
                children: [K(e.label), (0, q.jsxs)(`div`, {
                  className: `small muted`,
                  children: [K(`à régler avant le`), ` `, Z(e.dueDate), ` `, e.overdue && (0, q.jsx)(cv, {
                    kind: `err`,
                    children: K(`en retard`)
                  })]
                })]
              }), (0, q.jsx)(`strong`, {
                children: X(e.remainingMinor)
              })]
            }, t))
          })]
        })]
      })
    })
  });
}
function vb() {
  let {
    session: e
  } = xv();
  return e.demoMode ? (0, q.jsxs)(`div`, {
    className: `demo-banner noprint`,
    role: `note`,
    children: [(0, q.jsx)(`strong`, {
      children: K(`MODE DÉMONSTRATION`)
    }), ` `, K(`· données fictives, connecteurs simulés (PayStation, TPE, Juice, lien, banque, ERP, barrière). Aucun paiement réel.`), (0, q.jsx)(yb, {})]
  }) : null;
}
function yb() {
  let e = _v(),
    t = async () => {
      (await e.ask({
        kind: `confirm`,
        title: K(`Réinitialiser la démonstration ?`),
        text: K(`Les données fictives de départ sont rechargées. Tout ce qui a été fait dans ce navigateur est effacé.`),
        confirm: K(`Réinitialiser`),
        danger: !0
      })) && (await e.run(async () => {
        await J(`POST`, `/api/offline/reset`), location.hash = `#/`, location.reload();
      }));
    };
  return (0, q.jsxs)(`span`, {
    className: `offline-note`,
    children: [` `, (0, q.jsx)(`strong`, {
      children: K(`Démo hors ligne · les données restent dans ce navigateur`)
    }), ` `, (0, q.jsx)(`button`, {
      type: `button`,
      className: `sm secondary`,
      onClick: () => void t(),
      children: K(`Réinitialiser`)
    })]
  });
}

export { _b, cb, db, fb, gb, hb, lb, mb, ob, pb, sb, ub, vb, yb };
