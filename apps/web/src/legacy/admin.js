// GENERATED (step 1b, stage 2): v0.1.0 interface "admin" code extracted from reference/v0.1.0/app.js.
// Rewritten as readable TSX in the following commits.
/* eslint-disable */
import { K } from "./i18n.js";
import { G, q } from "./lib.js";
import { $, J, Q, R_, X, X_, Y, Z, _v, cv, dv, fv, mv, pv, tv, xv, z_ } from "./shared.js";

var Ky = [`company_admin`, `dispatcher`, `finance`, `agent`];
function qy() {
  let e = _v(),
    {
      session: t
    } = xv(),
    n = t.user?.vertical,
    r = Object.fromEntries(Ky.map(e => [e, tv(e, n)])),
    i = Y(`/api/admin/users`),
    [a, o] = (0, G.useState)({
      name: ``,
      email: ``,
      role: `agent`
    }),
    s = () => e.run(async () => {
      await J(`POST`, `/api/admin/users`, a), o({
        name: ``,
        email: ``,
        role: `agent`
      }), await i.reload();
    }, K(`Utilisateur créé.`)),
    c = (t, n, r) => e.run(async () => {
      await J(`PATCH`, `/api/admin/users/${t.id}`, n), await i.reload();
    }, r);
  return (0, q.jsxs)(q.Fragment, {
    children: [(0, q.jsx)(fv, {
      title: K(`Utilisateurs et rôles`),
      sub: K(`Les permissions sont appliquées par le serveur à chaque requête.`)
    }), (0, q.jsxs)(`div`, {
      className: `stack`,
      children: [(0, q.jsxs)(Q, {
        title: K(`Ajouter un utilisateur`),
        children: [(0, q.jsxs)(`div`, {
          className: `grid g4`,
          children: [(0, q.jsx)($, {
            label: K(`Nom`),
            children: (0, q.jsx)(`input`, {
              type: `text`,
              value: a.name,
              onChange: e => o({
                ...a,
                name: e.target.value
              })
            })
          }), (0, q.jsx)($, {
            label: K(`Adresse e-mail`),
            children: (0, q.jsx)(`input`, {
              type: `email`,
              value: a.email,
              onChange: e => o({
                ...a,
                email: e.target.value
              })
            })
          }), (0, q.jsx)($, {
            label: K(`Rôle`),
            children: (0, q.jsx)(`select`, {
              value: a.role,
              onChange: e => o({
                ...a,
                role: e.target.value
              }),
              children: Ky.map(e => (0, q.jsx)(`option`, {
                value: e,
                children: r[e]
              }, e))
            })
          }), (0, q.jsx)(`div`, {
            className: `row`,
            style: {
              alignItems: `flex-end`
            },
            children: (0, q.jsx)(`button`, {
              disabled: a.name.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(a.email),
              onClick: s,
              children: K(`Ajouter`)
            })
          })]
        }), (0, q.jsx)(`div`, {
          className: `small muted`,
          style: {
            marginTop: 10
          },
          children: K(`En démonstration, la connexion se fait par choix du profil. En production : authentification de l'entreprise (SSO) ou mot de passe à usage unique.`)
        })]
      }), (0, q.jsx)(Q, {
        title: K(`Utilisateurs`),
        flush: !0,
        children: (0, q.jsx)(pv, {
          q: i,
          children: e => (0, q.jsx)(mv, {
            rows: e,
            rowKey: e => e.id,
            empty: K(`Aucun utilisateur.`),
            cols: [[K(`Nom`), e => (0, q.jsx)(`strong`, {
              children: e.name
            })], [`E-mail`, e => e.email], [K(`Rôle`), e => e.id === t.user.id ? r[e.role] : (0, q.jsx)(`select`, {
              value: e.role,
              onChange: t => c(e, {
                role: t.target.value
              }, K(`Rôle modifié.`)),
              "aria-label": K(`Rôle de {0}`, e.name),
              style: {
                width: `auto`
              },
              children: Ky.map(e => (0, q.jsx)(`option`, {
                value: e,
                children: r[e]
              }, e))
            })], [K(`Accès`), e => (0, q.jsx)(cv, {
              kind: e.active ? `ok` : `err`,
              children: e.active ? K(`Actif`) : K(`Désactivé`)
            })], [``, e => e.id === t.user.id ? (0, q.jsx)(`span`, {
              className: `small muted`,
              children: K(`Vous`)
            }) : (0, q.jsx)(`button`, {
              className: `sm ${e.active ? `danger` : `secondary`}`,
              onClick: () => c(e, {
                active: !e.active
              }, e.active ? K(`Accès désactivé.`) : K(`Accès rétabli.`)),
              children: e.active ? K(`Désactiver`) : K(`Réactiver`)
            })]]
          })
        })
      }), n === `club` ? (0, q.jsx)(Q, {
        title: K(`Ce que chaque rôle peut faire`),
        children: (0, q.jsxs)(`dl`, {
          className: `kv`,
          children: [(0, q.jsx)(`dt`, {
            children: K(`Accueil et barrière`)
          }), (0, q.jsx)(`dd`, {
            children: K(`Contrôle des badges à l'entrée : décision, motif, code de paiement à présenter au membre. Aucun accès aux comptes.`)
          }), (0, q.jsx)(`dt`, {
            children: K(`Secrétariat`)
          }), (0, q.jsx)(`dd`, {
            children: K(`Membres, consommations imputées au compte, envoi des relevés, journal de la barrière. Pas d'encaissement ni de facturation.`)
          }), (0, q.jsx)(`dt`, {
            children: K(`Comptabilité`)
          }), (0, q.jsx)(`dd`, {
            children: K(`Cotisations, relances, encaissements, rapprochement des virements, exceptions, export comptable.`)
          }), (0, q.jsx)(`dt`, {
            children: K(`Direction du club`)
          }), (0, q.jsx)(`dd`, {
            children: K(`Tout ce qui précède, plus utilisateurs, paramètres et journal d'audit.`)
          })]
        })
      }) : (0, q.jsx)(Q, {
        title: K(`Ce que chaque rôle peut faire`),
        children: (0, q.jsxs)(`dl`, {
          className: `kv`,
          children: [(0, q.jsx)(`dt`, {
            children: K(`Agent terrain`)
          }), (0, q.jsx)(`dd`, {
            children: K(`Ses tournées uniquement : livraisons, ventes sur place, encaissements, reçus, bilan.`)
          }), (0, q.jsx)(`dt`, {
            children: K(`Centrale`)
          }), (0, q.jsx)(`dd`, {
            children: K(`Commandes, tournées, stocks, incidents terrain. Pas d'accès à la finance.`)
          }), (0, q.jsx)(`dt`, {
            children: K(`Finance`)
          }), (0, q.jsx)(`dd`, {
            children: K(`Journal, factures, rapprochement, exceptions, clôture, ERP, remboursements. Lecture seule sur les opérations.`)
          }), (0, q.jsx)(`dt`, {
            children: K(`Administrateur`)
          }), (0, q.jsx)(`dd`, {
            children: K(`Tout ce qui précède, plus utilisateurs, paramètres et journal d'audit.`)
          })]
        })
      })]
    })]
  });
}
var Jy = {
  onSite: K(`sur place`),
  remote: K(`à distance`),
  refund: K(`remboursement`),
  cancel: K(`annulation garantie`),
  statusQuery: K(`interrogation de statut`)
};
function Yy() {
  let e = _v(),
    t = Y(`/api/admin/settings`),
    n = Y(`/api/connectors`),
    r = xv().session.user?.vertical === `club`,
    [i, a] = (0, G.useState)(null);
  (0, G.useEffect)(() => {
    t.data && !i && a({
      reminders: z_(t.data.settings.club.reminders.minAmountMinor),
      gate: z_(t.data.settings.club.gate.minAmountMinor)
    });
  }, [t.data, i]);
  let o = (e, t) => c(n => {
      if (!n) return n;
      let r = Math.max(0, Math.trunc(Number(t) || 0)),
        i = n.club;
      if (e === `dueDays`) return {
        ...n,
        club: {
          ...i,
          dueDays: r
        }
      };
      if (e === `flagAfterDays` || e === `denyAfterDays`) return {
        ...n,
        club: {
          ...i,
          gate: {
            ...i.gate,
            [e]: r
          }
        }
      };
      let a = [...i.reminders.levels];
      return a[e] = r, {
        ...n,
        club: {
          ...i,
          reminders: {
            ...i.reminders,
            levels: a
          }
        }
      };
    }),
    [s, c] = (0, G.useState)(null);
  (0, G.useEffect)(() => {
    t.data && !s && c(t.data.settings);
  }, [t.data, s]);
  let l = () => e.run(async () => {
      let e = s && i ? {
        dueDays: s.club.dueDays,
        reminders: {
          levels: s.club.reminders.levels,
          minAmountMinor: R_(i.reminders) ?? 0
        },
        gate: {
          ...s.club.gate,
          minAmountMinor: R_(i.gate) ?? 0
        }
      } : void 0;
      await J(`PUT`, `/api/admin/settings`, {
        payments: s.payments,
        erp: s.erp,
        ...(r ? {
          club: e
        } : {})
      }), await t.reload();
    }, K(`Paramètres enregistrés.`)),
    u = (e, t) => c(n => n && {
      ...n,
      payments: {
        ...n.payments,
        methods: {
          ...n.payments.methods,
          [e]: {
            ...n.payments.methods[e],
            ...t
          }
        }
      }
    });
  return (0, q.jsxs)(q.Fragment, {
    children: [(0, q.jsx)(fv, {
      title: K(`Paramètres`),
      sub: K(`Moyens de paiement, compte de règlement et ERP de l'entreprise.`)
    }), (0, q.jsx)(pv, {
      q: t,
      children: e => s ? (0, q.jsxs)(`div`, {
        className: `stack`,
        children: [(0, q.jsx)(Q, {
          title: K(`Abonnement (démonstration)`),
          children: (0, q.jsxs)(`dl`, {
            className: `kv`,
            children: [(0, q.jsx)(`dt`, {
              children: K(`Entreprise`)
            }), (0, q.jsxs)(`dd`, {
              children: [e.subscription.name, ` `, K(`· devise`), ` `, e.subscription.currency]
            }), (0, q.jsx)(`dt`, {
              children: K(`Formule`)
            }), (0, q.jsxs)(`dd`, {
              children: [(0, q.jsx)(cv, {
                kind: `info`,
                children: K(e.subscription.plan)
              }), ` `, K(`· état :`), ` `, K(e.subscription.subscription_status), ` `, K(`· échéance :`), ` `, Z(e.subscription.subscription_renews_at)]
            }), (0, q.jsx)(`dt`, {
              children: K(`Facturation`)
            }), (0, q.jsx)(`dd`, {
              className: `muted`,
              children: K(`Fictive : aucun prix ni prélèvement n'est défini. La formule se modifie depuis l'espace plateforme.`)
            })]
          })
        }), (0, q.jsx)(Q, {
          title: K(`Moyens de paiement`),
          flush: !0,
          children: (0, q.jsx)(`div`, {
            className: `table-wrap`,
            children: (0, q.jsxs)(`table`, {
              children: [(0, q.jsx)(`thead`, {
                children: (0, q.jsxs)(`tr`, {
                  children: [(0, q.jsx)(`th`, {
                    children: K(`Moyen`)
                  }), (0, q.jsx)(`th`, {
                    children: K(`Activé`)
                  }), (0, q.jsx)(`th`, {
                    children: K(`Frais attendus (points de base)`)
                  }), (0, q.jsx)(`th`, {
                    children: K(`Identifiant marchand`)
                  }), (0, q.jsx)(`th`, {
                    children: K(`Connecteur`)
                  })]
                })
              }), (0, q.jsx)(`tbody`, {
                children: Object.entries(s.payments.methods).filter(([e]) => !r || e === `link`).map(([e, t]) => {
                  let r = n.data?.payments.find(t => t.method === e);
                  return (0, q.jsxs)(`tr`, {
                    children: [(0, q.jsx)(`td`, {
                      children: (0, q.jsx)(`strong`, {
                        children: X_[e]
                      })
                    }), (0, q.jsx)(`td`, {
                      children: (0, q.jsx)(`input`, {
                        type: `checkbox`,
                        checked: t.enabled,
                        onChange: t => u(e, {
                          enabled: t.target.checked
                        }),
                        "aria-label": K(`Activer {0}`, X_[e]),
                        style: {
                          width: 20,
                          height: 20
                        }
                      })
                    }), (0, q.jsxs)(`td`, {
                      children: [(0, q.jsx)(`input`, {
                        type: `number`,
                        min: 0,
                        max: 1e3,
                        value: t.feeBps,
                        onChange: t => u(e, {
                          feeBps: Math.trunc(Number(t.target.value) || 0)
                        }),
                        "aria-label": K(`Frais {0}`, X_[e]),
                        style: {
                          width: 110
                        }
                      }), ` `, (0, q.jsxs)(`span`, {
                        className: `small muted`,
                        children: [`= `, (t.feeBps / 100).toFixed(2), ` %`]
                      })]
                    }), (0, q.jsx)(`td`, {
                      children: (0, q.jsx)(`input`, {
                        type: `text`,
                        value: t.merchantRef,
                        onChange: t => u(e, {
                          merchantRef: t.target.value
                        }),
                        "aria-label": K(`Identifiant marchand {0}`, X_[e])
                      })
                    }), (0, q.jsx)(`td`, {
                      children: r && (0, q.jsxs)(q.Fragment, {
                        children: [(0, q.jsx)(cv, {
                          kind: `warn`,
                          children: r.demo ? K(`Simulé`) : K(`Réel`)
                        }), (0, q.jsx)(`div`, {
                          className: `small muted`,
                          children: Object.entries(r.capabilities ?? {}).filter(([, e]) => e).map(([e]) => Jy[e]).join(` · `)
                        })]
                      })
                    })]
                  }, e);
                })
              })]
            })
          })
        }), (0, q.jsx)(Q, {
          title: K(`Règlement et délais`),
          children: (0, q.jsxs)(`div`, {
            className: `grid g2`,
            children: [(0, q.jsx)($, {
              label: K(`Compte de règlement (libellé)`),
              hint: K(`Le règlement effectif sur ce compte dépend du circuit validé avec chaque prestataire : aucune garantie n'est donnée par l'application.`),
              children: (0, q.jsx)(`input`, {
                type: `text`,
                value: s.payments.settlementAccountLabel,
                onChange: e => c({
                  ...s,
                  payments: {
                    ...s.payments,
                    settlementAccountLabel: e.target.value
                  }
                })
              })
            }), (0, q.jsx)($, {
              label: K(`Durée de validité d'une tentative (minutes)`),
              hint: K(`Passé ce délai sans réponse du prestataire, la tentative passe « à vérifier », jamais « échouée ».`),
              children: (0, q.jsx)(`input`, {
                type: `number`,
                min: 1,
                max: 60,
                value: s.payments.attemptMinutes,
                onChange: e => c({
                  ...s,
                  payments: {
                    ...s.payments,
                    attemptMinutes: Math.trunc(Number(e.target.value) || 1)
                  }
                })
              })
            })]
          })
        }), r && i && (0, q.jsx)(Q, {
          title: K(`Club : échéances, relances et barrière`),
          children: (0, q.jsxs)(`div`, {
            className: `stack`,
            children: [(0, q.jsxs)(`div`, {
              className: `grid g4`,
              children: [(0, q.jsx)($, {
                label: K(`Préfixe des références`),
                hint: K(`Fixé à la création du club : les références déjà diffusées aux membres doivent rester valables.`),
                children: (0, q.jsx)(`input`, {
                  type: `text`,
                  value: s.club.refPrefix,
                  disabled: !0
                })
              }), (0, q.jsx)($, {
                label: K(`Délai de paiement (jours)`),
                children: (0, q.jsx)(`input`, {
                  type: `number`,
                  min: 0,
                  max: 120,
                  value: s.club.dueDays,
                  onChange: e => o(`dueDays`, e.target.value)
                })
              }), (0, q.jsx)($, {
                label: K(`Montant dû minimal pour relancer (Rs)`),
                children: (0, q.jsx)(`input`, {
                  type: `text`,
                  inputMode: `decimal`,
                  value: i.reminders,
                  onChange: e => a({
                    ...i,
                    reminders: e.target.value
                  })
                })
              }), (0, q.jsx)(`div`, {}), [0, 1, 2].map(e => (0, q.jsx)($, {
                label: K(`Relance de niveau {0} après (jours de retard)`, e + 1),
                children: (0, q.jsx)(`input`, {
                  type: `number`,
                  min: 1,
                  max: 365,
                  value: s.club.reminders.levels[e],
                  onChange: t => o(e, t.target.value)
                })
              }, e)), (0, q.jsx)(`div`, {}), (0, q.jsx)($, {
                label: K(`Barrière : signaler au-delà de (jours)`),
                children: (0, q.jsx)(`input`, {
                  type: `number`,
                  min: 0,
                  max: 365,
                  value: s.club.gate.flagAfterDays,
                  onChange: e => o(`flagAfterDays`, e.target.value)
                })
              }), (0, q.jsx)($, {
                label: K(`Barrière : refuser au-delà de (jours)`),
                hint: K(`0 : la barrière ne refuse jamais pour une dette, elle signale seulement.`),
                children: (0, q.jsx)(`input`, {
                  type: `number`,
                  min: 0,
                  max: 365,
                  value: s.club.gate.denyAfterDays,
                  onChange: e => o(`denyAfterDays`, e.target.value)
                })
              }), (0, q.jsx)($, {
                label: K(`Barrière : montant en retard minimal (Rs)`),
                children: (0, q.jsx)(`input`, {
                  type: `text`,
                  inputMode: `decimal`,
                  value: i.gate,
                  onChange: e => a({
                    ...i,
                    gate: e.target.value
                  })
                })
              })]
            }), (0, q.jsx)(`div`, {
              className: `small muted`,
              children: K(`Un membre suspendu ou résilié, ou un badge inconnu, est toujours refusé. Les comptes de l'export comptable sont des valeurs de démonstration, à remplacer par le plan comptable du club.`)
            })]
          })
        }), (0, q.jsx)(Q, {
          title: `ERP`,
          children: (0, q.jsxs)(`div`, {
            className: `stack`,
            children: [(0, q.jsxs)(`div`, {
              className: `grid g3`,
              children: [(0, q.jsx)($, {
                label: K(`Système`),
                children: (0, q.jsx)(`input`, {
                  type: `text`,
                  value: s.erp.system,
                  onChange: e => c({
                    ...s,
                    erp: {
                      ...s.erp,
                      system: e.target.value
                    }
                  })
                })
              }), (0, q.jsx)($, {
                label: K(`Adresse de l'interface`),
                children: (0, q.jsx)(`input`, {
                  type: `text`,
                  value: s.erp.endpoint,
                  onChange: e => c({
                    ...s,
                    erp: {
                      ...s.erp,
                      endpoint: e.target.value
                    }
                  })
                })
              }), (0, q.jsx)($, {
                label: K(`Référence du secret`),
                hint: K(`Nom de la variable d'environnement qui porte la clé. La clé elle-même n'est jamais saisie ni stockée ici.`),
                children: (0, q.jsx)(`input`, {
                  type: `text`,
                  value: s.erp.secretRef,
                  onChange: e => c({
                    ...s,
                    erp: {
                      ...s.erp,
                      secretRef: e.target.value.toUpperCase()
                    }
                  })
                })
              })]
            }), (0, q.jsxs)(`label`, {
              className: `check`,
              children: [(0, q.jsx)(`input`, {
                type: `checkbox`,
                checked: s.erp.autoSync,
                onChange: e => c({
                  ...s,
                  erp: {
                    ...s.erp,
                    autoSync: e.target.checked
                  }
                })
              }), (0, q.jsx)(`span`, {
                children: K(`Synchroniser automatiquement après chaque événement`)
              })]
            }), (0, q.jsxs)(`label`, {
              className: `check`,
              children: [(0, q.jsx)(`input`, {
                type: `checkbox`,
                checked: s.erp.simulateFailure,
                onChange: e => c({
                  ...s,
                  erp: {
                    ...s.erp,
                    simulateFailure: e.target.checked
                  }
                })
              }), (0, q.jsx)(`span`, {
                children: K(`Démonstration : simuler une panne de l'ERP (les écritures passent « en erreur » et attendent leur reprise)`)
              })]
            })]
          })
        }), (0, q.jsx)(`div`, {
          children: (0, q.jsx)(`button`, {
            onClick: l,
            children: K(`Enregistrer les paramètres`)
          })
        }), (0, q.jsx)(pv, {
          q: n,
          children: e => (0, q.jsxs)(Q, {
            title: K(`Connecteurs : capacités à vérifier auprès de chaque prestataire`),
            children: [(0, q.jsx)(`div`, {
              className: `notice warn`,
              style: {
                marginBottom: 12
              },
              children: K(`Tous les connecteurs sont des simulateurs. Aucune API réelle, certification ou garantie de règlement n'est supposée.`)
            }), (0, q.jsx)(`div`, {
              className: `grid g2`,
              children: [...e.payments.filter(e => !r || e.method === `link`), e.bank, e.erp, ...(r ? [e.access] : [])].map(e => (0, q.jsxs)(`div`, {
                children: [(0, q.jsx)(`h3`, {
                  children: K(e.label)
                }), (0, q.jsx)(`ul`, {
                  className: `small`,
                  style: {
                    margin: 0,
                    paddingLeft: 18
                  },
                  children: e.toVerify.map(e => (0, q.jsx)(`li`, {
                    children: K(e)
                  }, e))
                })]
              }, e.label))
            })]
          })
        })]
      }) : null
    })]
  });
}
function Xy({
  scope: e
}) {
  let t = xv().session.user?.vertical,
    n = Y(`/api/${e}/audit`),
    [r, i] = (0, G.useState)(``);
  return (0, q.jsxs)(q.Fragment, {
    children: [(0, q.jsxs)(fv, {
      title: K(`Journal d'audit`),
      sub: K(e === `platform` ? `Actions d'administration : entreprises, utilisateurs, paramètres.` : `Qui a fait quoi, et quand. Le journal n'est ni modifiable ni supprimable depuis l'application.`),
      children: [(0, q.jsx)(`input`, {
        type: `text`,
        value: r,
        onChange: e => i(e.target.value),
        placeholder: K(`Filtrer (action, acteur, objet)`),
        "aria-label": K(`Filtrer`),
        style: {
          width: 260
        }
      }), (0, q.jsx)(dv, {
        href: `/api/${e}/audit?format=csv`
      })]
    }), (0, q.jsx)(Q, {
      title: K(`500 dernières entrées`),
      flush: !0,
      children: (0, q.jsx)(pv, {
        q: n,
        children: n => (0, q.jsx)(mv, {
          rows: n.filter(e => !r || JSON.stringify(e).toLowerCase().includes(r.toLowerCase())),
          rowKey: e => e.id,
          empty: K(`Aucune entrée.`),
          cols: [[K(`Date`), e => (0, q.jsx)(`span`, {
            className: `nowrap`,
            children: Z(e.at, !0)
          })], ...(e === `platform` ? [[K(`Entreprise`), e => e.company ?? `—`]] : []), [K(`Acteur`), e => (0, q.jsxs)(q.Fragment, {
            children: [e.actor, (0, q.jsx)(`div`, {
              className: `small muted`,
              children: tv(e.actor_role, t)
            })]
          })], [K(`Action`), e => (0, q.jsx)(`span`, {
            className: `code`,
            children: e.action
          })], [K(`Détails`), e => (0, q.jsx)(`span`, {
            className: `small`,
            children: Object.entries(e.details).map(([e, t]) => `${e.replace(/Minor$/, ``)} : ${typeof t == `number` && e.endsWith(`Minor`) ? X(t) : typeof t == `object` ? JSON.stringify(t) : String(t)}`).join(` · `)
          })]]
        })
      })
    })]
  });
}
function Zy() {
  let e = _v(),
    t = Y(`/api/platform/companies`),
    [n, r] = (0, G.useState)({
      name: ``,
      slug: ``,
      adminName: ``,
      adminEmail: ``,
      vertical: `distribution`
    }),
    i = () => e.run(async () => {
      await J(`POST`, `/api/platform/companies`, n), r({
        name: ``,
        slug: ``,
        adminName: ``,
        adminEmail: ``,
        vertical: `distribution`
      }), await t.reload();
    }, K(`Entreprise créée avec son administrateur.`)),
    a = (n, r, i) => e.run(async () => {
      await J(`PATCH`, `/api/platform/companies/${n.id}`, r), await t.reload();
    }, i);
  return (0, q.jsxs)(q.Fragment, {
    children: [(0, q.jsx)(fv, {
      title: K(`Entreprises`),
      sub: K(`Chaque entreprise a ses données, ses utilisateurs et ses paramètres. La plateforme n'accède pas aux données opérationnelles.`),
      children: (0, q.jsx)(`button`, {
        className: `danger`,
        onClick: async () => {
          (await e.ask({
            kind: `confirm`,
            title: K(`Réinitialiser la démonstration ?`),
            text: K(`Toutes les données sont effacées et le jeu de données fictif est rechargé.`),
            danger: !0,
            confirm: K(`Réinitialiser`)
          })) && (await e.run(async () => {
            await J(`POST`, `/api/demo/reset`), await t.reload();
          }, K(`Données de démonstration rechargées.`)));
        },
        children: K(`Réinitialiser la démonstration`)
      })
    }), (0, q.jsxs)(`div`, {
      className: `stack`,
      children: [(0, q.jsx)(Q, {
        title: K(`Entreprises et abonnements (démonstration)`),
        flush: !0,
        children: (0, q.jsx)(pv, {
          q: t,
          children: e => (0, q.jsx)(mv, {
            rows: e,
            rowKey: e => e.id,
            empty: K(`Aucune entreprise.`),
            cols: [[K(`Entreprise`), e => (0, q.jsxs)(q.Fragment, {
              children: [(0, q.jsx)(`strong`, {
                children: e.name
              }), (0, q.jsxs)(`div`, {
                className: `small muted`,
                children: [e.slug, ` · `, e.vertical === `club` ? K(`Club de sport`) : K(`Distribution`)]
              })]
            })], [K(`Accès`), e => (0, q.jsx)(cv, {
              kind: e.status === `active` ? `ok` : `err`,
              children: e.status === `active` ? K(`Actif`) : K(`Suspendu`)
            })], [K(`Formule`), e => (0, q.jsx)(`select`, {
              value: e.plan,
              onChange: t => a(e, {
                plan: t.target.value
              }, K(`Formule modifiée.`)),
              "aria-label": K(`Formule de {0}`, e.name),
              style: {
                width: `auto`
              },
              children: [`pilote`, `standard`, `entreprise`].map(e => (0, q.jsx)(`option`, {
                value: e,
                children: K(e)
              }, e))
            })], [K(`Abonnement`), e => (0, q.jsx)(`select`, {
              value: e.subscription_status,
              onChange: t => a(e, {
                subscriptionStatus: t.target.value
              }, K(`Abonnement modifié.`)),
              "aria-label": K(`Abonnement de {0}`, e.name),
              style: {
                width: `auto`
              },
              children: [`essai`, `actif`, `impayé`, `résilié`].map(e => (0, q.jsx)(`option`, {
                value: e,
                children: K(e)
              }, e))
            })], [K(`Échéance`), e => Z(e.subscription_renews_at)], [K(`Utilisateurs`), e => K(`{0} (dont {1} agent(s))`, e.users, e.agents), `right`], [``, e => (0, q.jsx)(`button`, {
              className: `sm ${e.status === `active` ? `danger` : `secondary`}`,
              onClick: () => a(e, {
                status: e.status === `active` ? `suspended` : `active`
              }, e.status === `active` ? K(`Accès suspendu.`) : K(`Accès rétabli.`)),
              children: e.status === `active` ? K(`Suspendre`) : K(`Rétablir`)
            })]]
          })
        })
      }), (0, q.jsxs)(Q, {
        title: K(`Nouvelle entreprise`),
        children: [(0, q.jsxs)(`div`, {
          className: `grid g4`,
          children: [(0, q.jsx)($, {
            label: K(`Raison sociale`),
            children: (0, q.jsx)(`input`, {
              type: `text`,
              value: n.name,
              onChange: e => r({
                ...n,
                name: e.target.value
              })
            })
          }), (0, q.jsx)($, {
            label: K(`Identifiant (minuscules, chiffres, tirets)`),
            children: (0, q.jsx)(`input`, {
              type: `text`,
              value: n.slug,
              onChange: e => r({
                ...n,
                slug: e.target.value.toLowerCase()
              })
            })
          }), (0, q.jsx)($, {
            label: K(`Nom de l'administrateur`),
            children: (0, q.jsx)(`input`, {
              type: `text`,
              value: n.adminName,
              onChange: e => r({
                ...n,
                adminName: e.target.value
              })
            })
          }), (0, q.jsx)($, {
            label: K(`E-mail de l'administrateur`),
            children: (0, q.jsx)(`input`, {
              type: `email`,
              value: n.adminEmail,
              onChange: e => r({
                ...n,
                adminEmail: e.target.value
              })
            })
          }), (0, q.jsx)($, {
            label: K(`Métier`),
            children: (0, q.jsxs)(`select`, {
              value: n.vertical,
              onChange: e => r({
                ...n,
                vertical: e.target.value
              }),
              children: [(0, q.jsx)(`option`, {
                value: `distribution`,
                children: K(`Distribution`)
              }), (0, q.jsx)(`option`, {
                value: `club`,
                children: K(`Club de sport`)
              })]
            })
          })]
        }), (0, q.jsx)(`div`, {
          style: {
            marginTop: 12
          },
          children: (0, q.jsx)(`button`, {
            disabled: n.name.trim().length < 2 || !/^[a-z0-9-]{2,30}$/.test(n.slug) || n.adminName.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(n.adminEmail),
            onClick: i,
            children: K(`Créer l'entreprise`)
          })
        })]
      })]
    })]
  });
}
var Qy = () => `${Date.now().toString(36)}-${crypto.getRandomValues(new Uint32Array(4)).join(``)}`,
  $y = () => xv().session.user?.role ?? ``,
  eb = [`company_admin`, `dispatcher`],
  tb = [`company_admin`, `finance`],
  nb = {
    0: [K(`Relevé envoyé`), `info`],
    1: [K(`Rappel`), `info`],
    2: [K(`Second rappel`), `warn`],
    3: [K(`Dernier rappel`), `err`]
  },
  rb = e => K(`{0} j`, e),
  ib = e => {
    let t = e.overdueMinor ?? e.overdue_minor ?? 0,
      n = e.overdueDays ?? e.overdue_days ?? 0;
    return e.decision === `flag` ? K(`Signalée : {0} en retard de {1} jour(s).`, X(t), n) : e.decision === `deny` && t > 0 && e.reason.startsWith(`Retard`) ? K(`Refusée : {0} en retard de {1} jour(s), à régulariser avant l'entrée.`, X(t), n) : K(e.reason);
  },
  ab = [[`current`, K(`Non échu`)], [`d1_30`, K(`1 à 30 j`)], [`d31_60`, K(`31 à 60 j`)], [`d61_90`, K(`61 à 90 j`)], [`d90`, K(`Plus de 90 j`)]];

export { $y, Jy, Ky, Qy, Xy, Yy, Zy, ab, eb, ib, nb, qy, rb, tb };
