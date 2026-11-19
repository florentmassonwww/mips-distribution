// GENERATED (step 1b, stage 2): v0.1.0 interface "shell" code extracted from reference/v0.1.0/app.js.
// Rewritten as readable TSX in the following commits.
/* eslint-disable */
import { Xy, Yy, Zy, qy } from "./admin.js";
import { Ay, Iy, My, Ny, Oy, Py } from "./centrale.js";
import { _b, cb, db, fb, gb, hb, lb, mb, ob, pb, ub, vb } from "./club.js";
import { uy } from "./field.js";
import { By, Gy, Hy, Uy, Vy, zy } from "./finance.js";
import { K } from "./i18n.js";
import { Dg, E_, G, Tg, eg, h_, m_, ng, p_, q, wg } from "./lib.js";
import { $, J, W_, X, Y, _v, bv, lv, pv, tv, vv, xv, yv } from "./shared.js";

var bb = [K(`Centrale`), [[`/centrale`, K(`Tableau de bord`)], [`/centrale/commandes`, K(`Commandes`)], [`/centrale/tournees`, K(`Tournées`)], [`/centrale/stocks`, K(`Stocks`)], [`/centrale/incidents`, K(`Incidents`)]]],
  xb = [K(`Finance`), [[`/finance`, K(`Journal des transactions`)], [`/finance/factures`, K(`Factures`)], [`/finance/rapprochement`, K(`Rapprochement`)], [`/finance/exceptions`, K(`Exceptions`)], [`/finance/cloture`, K(`Clôture quotidienne`)], [`/finance/erp`, `ERP`]]],
  Sb = [K(`Administration`), [[`/admin/utilisateurs`, K(`Utilisateurs`)], [`/admin/parametres`, K(`Paramètres`)], [`/admin/audit`, K(`Journal d'audit`)]]],
  Cb = {
    dispatcher: [bb],
    finance: [[K(`Suivi`), [[`/centrale`, K(`Tableau de bord`)], [`/centrale/commandes`, K(`Commandes`)], [`/centrale/tournees`, K(`Tournées`)]]], xb],
    company_admin: [bb, xb, Sb],
    platform_admin: [[K(`Plateforme`), [[`/plateforme`, K(`Entreprises`)], [`/plateforme/audit`, K(`Journal d'audit`)]]]]
  },
  wb = {
    agent: `/terrain`,
    dispatcher: `/centrale`,
    finance: `/finance`,
    company_admin: `/centrale`,
    platform_admin: `/plateforme`
  },
  Tb = [K(`Club`), [[`/club`, K(`Recouvrement`)], [`/club/membres`, K(`Membres`)], [`/club/cotisations`, K(`Cotisations`)], [`/club/relances`, K(`Relances`)], [`/club/barriere`, K(`Barrière`)]]],
  Eb = [K(`Comptabilité`), [[`/club/encaissements`, K(`Encaissements`)], [`/club/rapprochement`, K(`Rapprochement`)], [`/club/exceptions`, K(`Exceptions`)], [`/club/export`, K(`Export comptable`)], [`/club/erp`, K(`Synchronisation comptable`)]]],
  Db = {
    dispatcher: [Tb],
    finance: [Tb, Eb],
    company_admin: [Tb, Eb, Sb]
  },
  Ob = {
    agent: `/club/accueil`,
    dispatcher: `/club`,
    finance: `/club`,
    company_admin: `/club`
  },
  kb = (e, t) => (t === `club` ? Ob[e] : wb[e]) ?? `/`;
function Ab({
  roles: e,
  children: t,
  vertical: n
}) {
  let {
      session: r
    } = xv(),
    i = r.user;
  return i ? !e.includes(i.role) || n && i.vertical !== n ? (0, q.jsxs)(`div`, {
    className: `mobile`,
    children: [(0, q.jsxs)(`div`, {
      className: `notice err`,
      role: `alert`,
      children: [K(`Cet espace n'est pas accessible avec votre profil (`), tv(i.role, i.vertical), `).`]
    }), (0, q.jsx)(`p`, {
      style: {
        marginTop: 12
      },
      children: (0, q.jsx)(m_, {
        to: kb(i.role, i.vertical),
        children: K(`Retour à mon espace`)
      })
    })]
  }) : (0, q.jsx)(q.Fragment, {
    children: t
  }) : (0, q.jsx)(wg, {
    to: `/`,
    replace: !0
  });
}
function jb({
  roles: e,
  children: t,
  vertical: n
}) {
  let {
      session: r,
      refresh: i
    } = xv(),
    a = eg(),
    o = r.user,
    s = o?.vertical === `club`;
  return (0, q.jsx)(Ab, {
    roles: e,
    vertical: n,
    children: o && (0, q.jsxs)(`div`, {
      className: `shell`,
      children: [(0, q.jsxs)(`aside`, {
        className: `side noprint`,
        children: [(0, q.jsxs)(`div`, {
          className: `brand`,
          children: [s ? `MIPS ClubOS` : `MIPS Distribution`, (0, q.jsx)(`small`, {
            children: o.companyName ?? K(`Plateforme SaaS`)
          })]
        }), (0, q.jsx)(`nav`, {
          "aria-label": K(`Navigation principale`),
          children: ((s ? Db : Cb)[o.role] ?? []).map(([e, t]) => (0, q.jsxs)(`div`, {
            className: `group`,
            children: [(0, q.jsx)(`span`, {
              children: e
            }), t.map(([e, t]) => (0, q.jsx)(h_, {
              to: e,
              end: [`/centrale`, `/finance`, `/plateforme`, `/club`].includes(e),
              children: t
            }, e))]
          }, e))
        }), (0, q.jsxs)(`div`, {
          className: `who`,
          children: [(0, q.jsxs)(`div`, {
            children: [o.name, (0, q.jsx)(`br`, {}), tv(o.role, o.vertical)]
          }), (0, q.jsx)(`button`, {
            className: `sm ghost`,
            onClick: async () => {
              await J(`POST`, `/api/logout`), await i(), a(`/`);
            },
            children: K(`Changer de profil`)
          }), ` `, (0, q.jsx)(yv, {})]
        })]
      }), (0, q.jsx)(`main`, {
        className: `main`,
        children: t
      })]
    })
  });
}
function Mb() {
  let {
      session: e,
      refresh: t
    } = xv(),
    n = eg(),
    r = _v(),
    i = Y(e.demoMode ? `/api/demo/users` : null),
    a = e => r.run(async () => {
      await J(`POST`, `/api/demo/login`, {
        userId: e.id
      }), await t(), n(kb(e.role, e.company_vertical));
    });
  return e.demoMode ? (0, q.jsxs)(`div`, {
    className: `mobile stack`,
    style: {
      maxWidth: 820
    },
    children: [(0, q.jsxs)(`div`, {
      className: `mobile-head`,
      children: [(0, q.jsxs)(`div`, {
        className: `row spread`,
        children: [(0, q.jsx)(`h1`, {
          children: `MIPS Distribution`
        }), (0, q.jsx)(yv, {})]
      }), (0, q.jsxs)(`div`, {
        className: `muted`,
        children: [K(`Distribution B2B, vente sur la route et paiement à la livraison ; clubs de sport, comptes membres et recouvrement.`), ` · v`, e.version]
      })]
    }), e.user && (0, q.jsxs)(`div`, {
      className: `notice`,
      children: [K(`Connecté :`), ` `, e.user.name, `. `, (0, q.jsx)(m_, {
        to: kb(e.user.role, e.user.vertical),
        children: K(`Reprendre mon espace →`)
      })]
    }), (0, q.jsx)(`h2`, {
      children: K(`Connexion de démonstration : choisissez un profil`)
    }), (0, q.jsx)(pv, {
      q: i,
      children: e => {
        let t = [...new Map(e.filter(e => e.company_id).map(e => [e.company_id, e])).values()];
        return (0, q.jsxs)(q.Fragment, {
          children: [t.map(t => (0, q.jsxs)(`section`, {
            className: `card`,
            children: [(0, q.jsxs)(`header`, {
              children: [(0, q.jsx)(`h2`, {
                children: t.company_name
              }), (0, q.jsxs)(`span`, {
                className: `row`,
                children: [(0, q.jsx)(`span`, {
                  className: `badge info`,
                  children: t.company_vertical === `club` ? K(`Club de sport`) : K(`Distribution`)
                }), t.company_status !== `active` && (0, q.jsx)(`span`, {
                  className: `badge err`,
                  children: K(`Accès suspendu`)
                })]
              })]
            }), (0, q.jsx)(`div`, {
              className: `body row`,
              children: e.filter(e => e.company_id === t.company_id).map(e => (0, q.jsxs)(`button`, {
                className: e.role === `agent` ? `` : `secondary`,
                onClick: () => a(e),
                children: [e.name.split(` (`)[0], ` · `, tv(e.role, e.company_vertical)]
              }, e.id))
            })]
          }, t.company_id)), (0, q.jsxs)(`section`, {
            className: `card`,
            children: [(0, q.jsx)(`header`, {
              children: (0, q.jsx)(`h2`, {
                children: K(`Plateforme SaaS`)
              })
            }), (0, q.jsx)(`div`, {
              className: `body row`,
              children: e.filter(e => !e.company_id).map(e => (0, q.jsx)(`button`, {
                className: `secondary`,
                onClick: () => a(e),
                children: tv(e.role)
              }, e.id))
            })]
          })]
        });
      }
    }), (0, q.jsxs)(`section`, {
      className: `card`,
      children: [(0, q.jsx)(`header`, {
        children: (0, q.jsx)(`h2`, {
          children: K(`Parcours de démonstration (10 minutes)`)
        })
      }), (0, q.jsx)(`div`, {
        className: `body`,
        children: (0, q.jsxs)(`ol`, {
          style: {
            margin: 0,
            paddingLeft: 20
          },
          className: `stack`,
          children: [(0, q.jsxs)(`li`, {
            children: [(0, q.jsx)(`strong`, {
              children: K(`Agent · Ravi`)
            }), ` `, K(`: démarrer « Nord - Grand-Baie », livrer la première commande, encaisser avec PayStation et jouer « Paiement réussi » dans le simulateur.`)]
          }), (0, q.jsx)(`li`, {
            children: K(`Livrer partiellement la deuxième commande (motif obligatoire), encaisser par carte et jouer « Paiement refusé », puis réessayer avec Juice.`)
          }), (0, q.jsx)(`li`, {
            children: K(`Activer « Simuler hors ligne », faire une vente sur place, puis rétablir le réseau : l'action est synchronisée une seule fois.`)
          }), (0, q.jsxs)(`li`, {
            children: [(0, q.jsx)(`strong`, {
              children: K(`Centrale · Kevin`)
            }), ` `, K(`: le tableau de bord s'actualise seul ; valider l'incident de livraison partielle ; préparer et charger « Centre - Curepipe ».`)]
          }), (0, q.jsxs)(`li`, {
            children: [(0, q.jsx)(`strong`, {
              children: K(`Finance · Sophie`)
            }), ` `, K(`: Rapprochement › générer un relevé avec anomalies et l'importer ; traiter les exceptions ; clôturer la journée ; voir les écritures ERP.`)]
          }), (0, q.jsxs)(`li`, {
            children: [(0, q.jsx)(`strong`, {
              children: K(`Administrateur · Anjali`)
            }), ` `, K(`: Paramètres › simuler une panne ERP, refaire une vente, puis reprendre les écritures en erreur depuis Finance › ERP.`)]
          }), (0, q.jsx)(`li`, {
            children: K(`Se connecter sur « Grossiste Démo Océan » : aucune donnée de la première entreprise n'y apparaît.`)
          })]
        })
      })]
    }), (0, q.jsxs)(`section`, {
      className: `card`,
      children: [(0, q.jsx)(`header`, {
        children: (0, q.jsx)(`h2`, {
          children: K(`Parcours club de sport (8 minutes)`)
        })
      }), (0, q.jsx)(`div`, {
        className: `body`,
        children: (0, q.jsxs)(`ol`, {
          style: {
            margin: 0,
            paddingLeft: 20
          },
          className: `stack`,
          children: [(0, q.jsxs)(`li`, {
            children: [(0, q.jsx)(`strong`, {
              children: K(`Comptabilité · Mélanie`)
            }), ` `, K(`: Recouvrement › qui doit quoi et depuis quand ; ouvrir Yannick Ramsamy, voir son relevé et ses relances.`)]
          }), (0, q.jsx)(`li`, {
            children: K(`« Envoyer le relevé et le lien de paiement », puis « Ouvrir la page du membre » : payer en ligne et jouer « Paiement réussi ». Le solde tombe à zéro.`)
          }), (0, q.jsx)(`li`, {
            children: K(`Rapprochement › générer le relevé de démonstration et l'importer : les virements bien référencés sont affectés seuls ; affecter à la main le virement sans référence.`)
          }), (0, q.jsx)(`li`, {
            children: K(`Relances › lancer les relances : un second lancement n'envoie rien de plus. Export comptable : écritures équilibrées, prêtes pour la comptabilité.`)
          }), (0, q.jsxs)(`li`, {
            children: [(0, q.jsx)(`strong`, {
              children: K(`Accueil · Jean-Luc`)
            }), ` `, K(`: contrôler les badges B00001 (à jour), B00008 (en retard : entrée signalée, code de paiement), B00014 (suspendu).`)]
          }), (0, q.jsxs)(`li`, {
            children: [(0, q.jsx)(`strong`, {
              children: K(`Direction · Véronique`)
            }), ` `, K(`: Paramètres › refuser l'entrée au-delà de 90 jours de retard, puis recontrôler B00008.`)]
          })]
        })
      })]
    })]
  }) : (0, q.jsxs)(`div`, {
    className: `mobile stack`,
    children: [(0, q.jsx)(`h1`, {
      children: `MIPS Distribution`
    }), (0, q.jsx)(`div`, {
      className: `notice`,
      children: K(`La connexion passe par l'authentification de l'entreprise, à raccorder avant la mise en production.`)
    })]
  });
}
function Nb() {
  let {
      token: e
    } = ng(),
    t = _v(),
    n = Y(`/api/public/pay/${e}`, 3e3),
    r = r => t.run(async () => {
      await J(`POST`, `/api/public/pay/${e}/demo`, {
        outcome: r
      }), await n.reload();
    });
  return (0, q.jsxs)(`div`, {
    className: `mobile stack`,
    children: [(0, q.jsxs)(`div`, {
      className: `mobile-head`,
      children: [(0, q.jsxs)(`div`, {
        className: `row spread`,
        children: [(0, q.jsx)(`h1`, {
          children: K(`Paiement`)
        }), (0, q.jsx)(yv, {})]
      }), (0, q.jsx)(`div`, {
        className: `muted`,
        children: K(`Lien sécurisé à usage unique`)
      })]
    }), (0, q.jsx)(pv, {
      q: n,
      children: e => (0, q.jsx)(`div`, {
        className: `card`,
        children: (0, q.jsxs)(`div`, {
          className: `body stack`,
          children: [(0, q.jsxs)(`div`, {
            className: `row spread`,
            children: [(0, q.jsx)(`strong`, {
              children: e.company
            }), (0, q.jsx)(lv, {
              map: W_,
              value: e.status
            })]
          }), (0, q.jsxs)(`div`, {
            className: `duebox`,
            children: [(0, q.jsxs)(`div`, {
              className: `small`,
              children: [K(`Facture`), ` `, e.invoice]
            }), (0, q.jsx)(`div`, {
              className: `amount`,
              children: X(e.amount_minor)
            })]
          }), e.status === `pending` && e.demoMode && (0, q.jsxs)(q.Fragment, {
            children: [(0, q.jsx)(`div`, {
              className: `notice warn`,
              children: K(`Page de démonstration. En production, le client est dirigé vers la page de paiement hébergée par le prestataire : aucune donnée de carte n'est saisie ni conservée par cette application.`)
            }), (0, q.jsx)(`button`, {
              className: `big`,
              onClick: () => r(`success`),
              children: K(`Simuler un paiement réussi`)
            }), (0, q.jsx)(`button`, {
              className: `big secondary`,
              onClick: () => r(`failure`),
              children: K(`Simuler un paiement refusé`)
            })]
          }), e.status === `confirmed` && (0, q.jsxs)(`div`, {
            className: `success`,
            children: [(0, q.jsx)(`div`, {
              className: `big`,
              children: K(`Paiement confirmé`)
            }), (0, q.jsx)(`div`, {
              children: K(`Merci. Le distributeur a reçu la confirmation.`)
            })]
          }), e.status === `failed` && (0, q.jsx)(`div`, {
            className: `notice err`,
            children: K(`Ce paiement n'a pas abouti. Demandez un nouveau lien au distributeur.`)
          }), e.status === `to_verify` && (0, q.jsx)(`div`, {
            className: `notice warn`,
            children: K(`Ce paiement est en cours de vérification par le distributeur.`)
          })]
        })
      })
    })]
  });
}
var Pb = [`company_admin`, `dispatcher`],
  Fb = [`company_admin`, `dispatcher`, `finance`],
  Ib = [`company_admin`, `finance`];
function Lb({
  onOk: e
}) {
  let t = _v(),
    [n, r] = (0, G.useState)(``);
  return (0, q.jsxs)(`div`, {
    className: `mobile stack`,
    children: [(0, q.jsxs)(`div`, {
      className: `mobile-head`,
      children: [(0, q.jsxs)(`div`, {
        className: `row spread`,
        children: [(0, q.jsx)(`h1`, {
          children: `MIPS Distribution`
        }), (0, q.jsx)(yv, {})]
      }), (0, q.jsx)(`div`, {
        className: `muted`,
        children: K(`Démonstration à accès réservé`)
      })]
    }), (0, q.jsx)(`form`, {
      className: `card`,
      onSubmit: r => {
        r.preventDefault(), t.run(async () => {
          await J(`POST`, `/api/gate`, {
            code: n
          }), e();
        });
      },
      children: (0, q.jsxs)(`div`, {
        className: `body stack`,
        children: [(0, q.jsx)($, {
          label: K(`Code d'accès`),
          children: (0, q.jsx)(`input`, {
            type: `password`,
            value: n,
            onChange: e => r(e.target.value),
            autoFocus: !0,
            autoComplete: `off`
          })
        }), (0, q.jsx)(`button`, {
          className: `big`,
          disabled: !n,
          children: K(`Entrer`)
        })]
      })
    })]
  });
}
function Rb() {
  let e = Y(`/api/session`);
  return e.error?.code === `gate` ? (0, q.jsx)(Lb, {
    onOk: e.reload
  }) : (0, q.jsx)(pv, {
    q: e,
    children: t => (0, q.jsxs)(bv.Provider, {
      value: {
        session: t,
        refresh: e.reload
      },
      children: [(0, q.jsx)(vb, {}), (0, q.jsxs)(Dg, {
        children: [(0, q.jsx)(Tg, {
          path: `/`,
          element: (0, q.jsx)(Mb, {})
        }), (0, q.jsx)(Tg, {
          path: `/payer/:token`,
          element: (0, q.jsx)(Nb, {})
        }), (0, q.jsx)(Tg, {
          path: `/membre/:token`,
          element: (0, q.jsx)(_b, {})
        }), (0, q.jsx)(Tg, {
          path: `/club/accueil`,
          element: (0, q.jsx)(Ab, {
            roles: [`agent`, `dispatcher`, `company_admin`],
            vertical: `club`,
            children: (0, q.jsx)(gb, {})
          })
        }), (0, q.jsx)(Tg, {
          path: `/club/*`,
          element: (0, q.jsx)(jb, {
            roles: Fb,
            vertical: `club`,
            children: (0, q.jsxs)(Dg, {
              children: [(0, q.jsx)(Tg, {
                index: !0,
                element: (0, q.jsx)(ob, {})
              }), (0, q.jsx)(Tg, {
                path: `membres`,
                element: (0, q.jsx)(cb, {})
              }), (0, q.jsx)(Tg, {
                path: `membres/:id`,
                element: (0, q.jsx)(lb, {})
              }), (0, q.jsx)(Tg, {
                path: `cotisations`,
                element: (0, q.jsx)(ub, {})
              }), (0, q.jsx)(Tg, {
                path: `relances`,
                element: (0, q.jsx)(db, {})
              }), (0, q.jsx)(Tg, {
                path: `barriere`,
                element: (0, q.jsx)(hb, {})
              }), (0, q.jsx)(Tg, {
                path: `encaissements`,
                element: (0, q.jsx)(Ab, {
                  roles: Ib,
                  children: (0, q.jsx)(fb, {})
                })
              }), (0, q.jsx)(Tg, {
                path: `rapprochement`,
                element: (0, q.jsx)(Ab, {
                  roles: Ib,
                  children: (0, q.jsx)(pb, {})
                })
              }), (0, q.jsx)(Tg, {
                path: `exceptions`,
                element: (0, q.jsx)(Ab, {
                  roles: Ib,
                  children: (0, q.jsx)(zy, {
                    domain: `finance`
                  })
                })
              }), (0, q.jsx)(Tg, {
                path: `export`,
                element: (0, q.jsx)(Ab, {
                  roles: Ib,
                  children: (0, q.jsx)(mb, {})
                })
              }), (0, q.jsx)(Tg, {
                path: `erp`,
                element: (0, q.jsx)(Ab, {
                  roles: Ib,
                  children: (0, q.jsx)(Gy, {})
                })
              })]
            })
          })
        }), (0, q.jsx)(Tg, {
          path: `/terrain`,
          element: (0, q.jsx)(Ab, {
            roles: [`agent`],
            vertical: `distribution`,
            children: (0, q.jsx)(uy, {})
          })
        }), (0, q.jsx)(Tg, {
          path: `/centrale/*`,
          element: (0, q.jsx)(jb, {
            roles: Fb,
            vertical: `distribution`,
            children: (0, q.jsxs)(Dg, {
              children: [(0, q.jsx)(Tg, {
                index: !0,
                element: (0, q.jsx)(Oy, {})
              }), (0, q.jsx)(Tg, {
                path: `commandes`,
                element: (0, q.jsx)(Ay, {})
              }), (0, q.jsx)(Tg, {
                path: `commandes/:id`,
                element: (0, q.jsx)(My, {
                  back: `/centrale/commandes`
                })
              }), (0, q.jsx)(Tg, {
                path: `tournees`,
                element: (0, q.jsx)(Ny, {})
              }), (0, q.jsx)(Tg, {
                path: `tournees/:id`,
                element: (0, q.jsx)(Py, {})
              }), (0, q.jsx)(Tg, {
                path: `stocks`,
                element: (0, q.jsx)(Ab, {
                  roles: Pb,
                  children: (0, q.jsx)(Iy, {})
                })
              }), (0, q.jsx)(Tg, {
                path: `incidents`,
                element: (0, q.jsx)(Ab, {
                  roles: Pb,
                  children: (0, q.jsx)(zy, {
                    domain: `ops`
                  })
                })
              })]
            })
          })
        }), (0, q.jsx)(Tg, {
          path: `/finance/*`,
          element: (0, q.jsx)(jb, {
            roles: Ib,
            vertical: `distribution`,
            children: (0, q.jsxs)(Dg, {
              children: [(0, q.jsx)(Tg, {
                index: !0,
                element: (0, q.jsx)(By, {})
              }), (0, q.jsx)(Tg, {
                path: `factures`,
                element: (0, q.jsx)(Vy, {})
              }), (0, q.jsx)(Tg, {
                path: `chaine/:id`,
                element: (0, q.jsx)(My, {
                  back: `/finance/factures`
                })
              }), (0, q.jsx)(Tg, {
                path: `rapprochement`,
                element: (0, q.jsx)(Hy, {})
              }), (0, q.jsx)(Tg, {
                path: `exceptions`,
                element: (0, q.jsx)(zy, {
                  domain: `finance`
                })
              }), (0, q.jsx)(Tg, {
                path: `cloture`,
                element: (0, q.jsx)(Uy, {})
              }), (0, q.jsx)(Tg, {
                path: `erp`,
                element: (0, q.jsx)(Gy, {})
              })]
            })
          })
        }), (0, q.jsx)(Tg, {
          path: `/admin/*`,
          element: (0, q.jsx)(jb, {
            roles: [`company_admin`],
            children: (0, q.jsxs)(Dg, {
              children: [(0, q.jsx)(Tg, {
                path: `utilisateurs`,
                element: (0, q.jsx)(qy, {})
              }), (0, q.jsx)(Tg, {
                path: `parametres`,
                element: (0, q.jsx)(Yy, {})
              }), (0, q.jsx)(Tg, {
                path: `audit`,
                element: (0, q.jsx)(Xy, {
                  scope: `admin`
                })
              })]
            })
          })
        }), (0, q.jsx)(Tg, {
          path: `/plateforme/*`,
          element: (0, q.jsx)(jb, {
            roles: [`platform_admin`],
            children: (0, q.jsxs)(Dg, {
              children: [(0, q.jsx)(Tg, {
                index: !0,
                element: (0, q.jsx)(Zy, {})
              }), (0, q.jsx)(Tg, {
                path: `audit`,
                element: (0, q.jsx)(Xy, {
                  scope: `platform`
                })
              })]
            })
          })
        }), (0, q.jsx)(Tg, {
          path: `*`,
          element: (0, q.jsxs)(`div`, {
            className: `mobile`,
            children: [(0, q.jsx)(`div`, {
              className: `notice`,
              children: K(`Page introuvable.`)
            }), (0, q.jsx)(`p`, {
              style: {
                marginTop: 12
              },
              children: (0, q.jsx)(m_, {
                to: `/`,
                children: K(`Retour à l'accueil`)
              })
            })]
          })
        })]
      })]
    })
  });
}
var zb = p_;
(0, E_.createRoot)(document.getElementById(`root`)).render((0, q.jsx)(G.StrictMode, {
  children: (0, q.jsx)(zb, {
    children: (0, q.jsx)(vv, {
      children: (0, q.jsx)(Rb, {})
    })
  })
}));

export { Ab, Cb, Db, Eb, Fb, Ib, Lb, Mb, Nb, Ob, Pb, Rb, Sb, Tb, bb, jb, kb, wb, xb, zb };
