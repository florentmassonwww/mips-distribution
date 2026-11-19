// GENERATED (step 1b, stage 2): v0.1.0 interface "finance" code extracted from reference/v0.1.0/app.js.
// Rewritten as readable TSX in the following commits.
/* eslint-disable */
import { Ry } from "./centrale.js";
import { K } from "./i18n.js";
import { G, eg, q } from "./lib.js";
import { $, $_, G_, H_, J, J_, Q, Q_, U_, W_, X, X_, Y, Y_, Z, _v, cv, dv, fv, lv, mv, pv, uv, xv } from "./shared.js";

function zy({
  domain: e
}) {
  let t = _v(),
    [n, r] = (0, G.useState)(`open`),
    i = Y(`/api/exceptions?domain=${e}&status=${n}`, 8e3),
    a = async (e, n) => {
      let r = await t.ask({
        title: K(n === `approved` ? `Valider` : `Rejeter`),
        text: Ry(e),
        label: K(`Décision et suite donnée`),
        confirm: K(n === `approved` ? `Valider` : `Rejeter`),
        danger: n === `rejected`
      });
      r && (await t.run(async () => {
        await J(`POST`, `/api/exceptions/${e.id}/resolve`, {
          resolution: n,
          note: r
        }), await i.reload();
      }, K(`Décision enregistrée dans le journal d'audit.`)));
    };
  return (0, q.jsxs)(q.Fragment, {
    children: [(0, q.jsxs)(fv, {
      title: K(e === `ops` ? `Incidents et ajustements` : `File d'exceptions`),
      sub: K(e === `ops` ? `Livraisons partielles, refus, retours et écarts de stock à valider.` : `Écarts de rapprochement, paiements à vérifier et erreurs ERP.`),
      children: [(0, q.jsxs)(`div`, {
        className: `tabs`,
        style: {
          margin: 0
        },
        children: [(0, q.jsx)(`button`, {
          "aria-selected": n === `open`,
          onClick: () => r(`open`),
          children: K(`Ouvertes`)
        }), (0, q.jsx)(`button`, {
          "aria-selected": n === `resolved`,
          onClick: () => r(`resolved`),
          children: K(`Traitées`)
        })]
      }), (0, q.jsx)(dv, {
        href: `/api/exceptions?domain=${e}&status=${n}&format=csv`
      })]
    }), (0, q.jsx)(Q, {
      title: K(n === `open` ? `À traiter` : `Traitées`),
      flush: !0,
      children: (0, q.jsx)(pv, {
        q: i,
        children: e => (0, q.jsx)(mv, {
          rows: e,
          rowKey: e => e.id,
          empty: K(n === `open` ? `Rien à traiter.` : `Aucune exception traitée.`),
          cols: [[K(`Créée`), e => Z(e.created_at, !0)], [K(`Type`), e => (0, q.jsx)(cv, {
            kind: `warn`,
            children: Q_[e.type] ?? e.type
          })], [K(`Description`), e => Ry(e)], n === `open` ? [``, e => e.type === `payment_to_verify` ? (0, q.jsx)(`span`, {
            className: `small muted`,
            children: K(`Se lève par l'interrogation du prestataire (Journal) ou par le relevé bancaire.`)
          }) : (0, q.jsxs)(`div`, {
            className: `row`,
            children: [(0, q.jsx)(`button`, {
              className: `sm`,
              onClick: () => a(e, `approved`),
              children: K(`Valider`)
            }), (0, q.jsx)(`button`, {
              className: `sm danger`,
              onClick: () => a(e, `rejected`),
              children: K(`Rejeter`)
            })]
          })] : [K(`Décision`), e => (0, q.jsxs)(q.Fragment, {
            children: [(0, q.jsx)(cv, {
              kind: e.resolution === `rejected` ? `err` : `ok`,
              children: {
                approved: K(`Validée`),
                rejected: K(`Rejetée`),
                auto: K(`Levée automatiquement`)
              }[e.resolution ?? ``] ?? e.resolution
            }), (0, q.jsxs)(`div`, {
              className: `small muted`,
              children: [e.resolution_note, ` · `, e.resolved_by_name ?? K(`système`), ` · `, Z(e.resolved_at, !0)]
            })]
          })]]
        })
      })
    })]
  });
}
function By() {
  let e = _v(),
    t = eg(),
    [n, r] = (0, G.useState)({
      status: ``,
      method: ``,
      settlement: ``,
      day: ``
    }),
    i = Object.entries(n).filter(([, e]) => e).map(([e, t]) => `${e}=${encodeURIComponent(t)}`).join(`&`),
    a = Y(`/api/finance/journal${i ? `?${i}` : ``}`, 8e3),
    o = t => e.run(async () => {
      let n = await J(`POST`, `/api/payments/${t.id}/check`);
      e.toast(K(`Réponse du prestataire appliquée : {0}.`, W_[n.status]?.[0] ?? n.status)), await a.reload();
    }),
    s = async t => {
      let n = await e.ask({
        kind: `money`,
        title: K(`Rembourser {0}`, t.invoice),
        text: K(`Solde remboursable : {0}. Le remboursement est demandé au prestataire.`, X(t.amount_minor - t.refunded_minor)),
        label: K(`Montant à rembourser (Rs)`),
        confirm: K(`Continuer`)
      });
      if (!n) return;
      let r = await e.ask({
        title: K(`Motif du remboursement`),
        confirm: K(`Rembourser`),
        danger: !0
      });
      r && (await e.run(async () => {
        await J(`POST`, `/api/finance/payments/${t.id}/refund`, {
          amountMinor: Number(n),
          reason: r
        }), await a.reload();
      }, K(`Remboursement enregistré.`)));
    },
    c = (e, t, i) => (0, q.jsxs)(`select`, {
      value: n[e],
      onChange: t => r({
        ...n,
        [e]: t.target.value
      }),
      "aria-label": t,
      style: {
        width: `auto`
      },
      children: [(0, q.jsx)(`option`, {
        value: ``,
        children: t
      }), i.map(([e, t]) => (0, q.jsx)(`option`, {
        value: e,
        children: t
      }, e))]
    });
  return (0, q.jsxs)(q.Fragment, {
    children: [(0, q.jsxs)(fv, {
      title: K(`Journal des transactions`),
      sub: K(`Une ligne par tentative de paiement. « Confirmé » (prestataire) et « réglé en banque » (relevé) sont suivis séparément.`),
      children: [c(`status`, K(`Tous les états`), Object.entries(W_).map(([e, [t]]) => [e, t])), c(`method`, K(`Tous les moyens`), Object.entries(X_)), c(`settlement`, K(`Règlement`), [[`unsettled`, K(`Confirmé, non réglé`)], [`settled`, K(`Réglé en banque`)]]), (0, q.jsx)(`input`, {
        type: `date`,
        value: n.day,
        onChange: e => r({
          ...n,
          day: e.target.value
        }),
        "aria-label": K(`Jour`),
        style: {
          width: `auto`
        }
      }), (0, q.jsx)(dv, {
        href: `/api/finance/journal?format=csv${i ? `&${i}` : ``}`
      })]
    }), (0, q.jsx)(Q, {
      title: K(`Transactions`),
      flush: !0,
      children: (0, q.jsx)(pv, {
        q: a,
        children: e => (0, q.jsx)(mv, {
          rows: e,
          rowKey: e => e.id,
          empty: K(`Aucune transaction pour ces critères.`),
          onRow: e => t(`/finance/chaine/${e.order_id}`),
          cols: [[K(`Créée`), e => Z(e.created_at, !0)], [K(`Facture`), e => (0, q.jsxs)(q.Fragment, {
            children: [(0, q.jsx)(`strong`, {
              children: e.invoice
            }), (0, q.jsx)(`div`, {
              className: `small muted`,
              children: e.customer
            })]
          })], [K(`Agent`), e => e.agent?.split(` (`)[0] ?? `—`], [K(`Moyen`), e => X_[e.method]], [K(`Montant`), e => (0, q.jsxs)(q.Fragment, {
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
            }), (e.failure_reason ?? e.verify_reason) && (0, q.jsx)(`div`, {
              className: `small muted`,
              children: K(e.failure_reason ?? e.verify_reason ?? ``)
            })]
          })], [K(`Règlement bancaire`), e => [`confirmed`, `refunded`].includes(e.status) ? (0, q.jsx)(lv, {
            map: G_,
            value: e.settlement_status
          }) : `—`], [K(`Frais`), e => e.fee_actual_minor === null ? e.status === `confirmed` ? (0, q.jsxs)(`span`, {
            className: `muted`,
            children: [X(e.fee_expected_minor), ` `, K(`att.`)]
          }) : `—` : X(e.fee_actual_minor), `right`], [K(`Référence`), e => (0, q.jsx)(`span`, {
            className: `code`,
            children: e.provider_ref ?? `—`
          })], [``, e => (0, q.jsxs)(`div`, {
            className: `row`,
            onClick: e => e.stopPropagation(),
            children: [(e.status === `pending` || e.status === `to_verify`) && (0, q.jsx)(`button`, {
              className: `sm`,
              onClick: () => o(e),
              children: K(`Interroger le prestataire`)
            }), e.status === `confirmed` && (0, q.jsx)(`button`, {
              className: `sm danger`,
              onClick: () => s(e),
              children: K(`Rembourser`)
            })]
          })]]
        })
      })
    })]
  });
}
function Vy() {
  let e = eg(),
    t = Y(`/api/finance/invoices`, 1e4);
  return (0, q.jsxs)(q.Fragment, {
    children: [(0, q.jsx)(fv, {
      title: K(`Factures`),
      sub: K(`De la facture à l'écriture ERP : ouvrez une ligne pour voir toute la chaîne.`),
      children: (0, q.jsx)(dv, {
        href: `/api/finance/invoices?format=csv`
      })
    }), (0, q.jsx)(pv, {
      q: t,
      children: t => {
        let n = e => t.reduce((t, n) => t + n[e], 0),
          r = t.reduce((e, t) => e + t.paid_minor - t.refunded_minor, 0);
        return (0, q.jsxs)(`div`, {
          className: `stack`,
          children: [(0, q.jsxs)(`div`, {
            className: `grid g4`,
            children: [(0, q.jsx)(uv, {
              label: K(`Facturé`),
              value: X(n(`amount_minor`)),
              hint: `${t.length} facture(s)`
            }), (0, q.jsx)(uv, {
              label: K(`Encaissé confirmé`),
              value: X(r)
            }), (0, q.jsx)(uv, {
              label: K(`Réglé en banque`),
              value: X(n(`settled_minor`)),
              hint: K(`confirmé non réglé : {0}`, X(r - n(`settled_minor`)))
            }), (0, q.jsx)(uv, {
              label: K(`Reste à encaisser`),
              value: X(n(`amount_minor`) - r)
            })]
          }), (0, q.jsx)(Q, {
            title: K(`Factures`),
            flush: !0,
            children: (0, q.jsx)(mv, {
              rows: t,
              rowKey: e => e.id,
              empty: K(`Aucune facture.`),
              onRow: t => e(`/finance/chaine/${t.order_id}`),
              cols: [[K(`Facture`), e => (0, q.jsxs)(q.Fragment, {
                children: [(0, q.jsx)(`strong`, {
                  children: e.number
                }), (0, q.jsx)(`div`, {
                  className: `small muted`,
                  children: e.order_number
                })]
              })], [K(`Émise`), e => Z(e.issued_at, !0)], [K(`Commerce`), e => e.customer], [K(`Tournée`), e => e.route ?? `—`], [K(`Montant`), e => X(e.amount_minor), `right`], [K(`Encaissé confirmé`), e => X(e.paid_minor - e.refunded_minor), `right`], [K(`Réglé en banque`), e => X(e.settled_minor), `right`], [K(`État`), e => (0, q.jsx)(lv, {
                map: U_,
                value: e.status
              })], [`ERP`, e => e.erp_status ? (0, q.jsx)(lv, {
                map: J_,
                value: e.erp_status
              }) : `—`]]
            })
          })]
        });
      }
    })]
  });
}
function Hy() {
  let e = _v(),
    {
      session: t
    } = xv(),
    n = Y(`/api/finance/reconciliation`),
    [r, i] = (0, G.useState)(``),
    [a, o] = (0, G.useState)(``),
    s = t => e.run(async () => {
      let e = await J(`GET`, `/api/finance/statements/demo${t ? `?anomalies=1` : ``}`);
      i(e.filename), o(e.content);
    }),
    c = async e => {
      e && (i(e.name), o(await e.text()));
    },
    l = () => e.run(async () => {
      let t = await J(`POST`, `/api/finance/statements`, {
        filename: r || `releve.csv`,
        content: a
      });
      e.toast(K(`{0} ligne(s) rapprochée(s), {1} en exception, {2} déjà importée(s).`, t.matched, t.exceptions, t.skipped)), o(``), i(``), await n.reload();
    });
  return (0, q.jsxs)(q.Fragment, {
    children: [(0, q.jsx)(fv, {
      title: K(`Rapprochement bancaire`),
      sub: K(`Import du relevé, rapprochement par référence et montant, contrôle des frais.`),
      children: (0, q.jsx)(dv, {
        href: `/api/finance/reconciliation?format=csv`
      })
    }), (0, q.jsx)(pv, {
      q: n,
      children: e => (0, q.jsxs)(`div`, {
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
                onChange: e => void c(e.target.files?.[0]),
                "aria-label": K(`Fichier de relevé`),
                style: {
                  width: `auto`
                }
              }), t.demoMode && (0, q.jsxs)(q.Fragment, {
                children: [(0, q.jsx)(`button`, {
                  className: `secondary`,
                  onClick: () => s(!1),
                  children: K(`Générer un relevé de démonstration`)
                }), (0, q.jsx)(`button`, {
                  className: `secondary`,
                  onClick: () => s(!0),
                  children: K(`… avec anomalies (frais, montant, crédit inconnu)`)
                })]
              })]
            }), (0, q.jsx)($, {
              label: K(`Contenu {0}`, r ? `· ${r}` : ``),
              hint: K(`Format de démonstration : date;reference;libelle;montant_brut;frais;montant_net. Le format réel dépend de la banque (à vérifier).`),
              children: (0, q.jsx)(`textarea`, {
                className: `mono`,
                value: a,
                onChange: e => o(e.target.value),
                rows: 6,
                placeholder: `date;reference;libelle;montant_brut;frais;montant_net`
              })
            }), (0, q.jsx)(`div`, {
              children: (0, q.jsx)(`button`, {
                disabled: a.trim().length < 10,
                onClick: l,
                children: K(`Importer et rapprocher`)
              })
            })]
          })
        }), (0, q.jsx)(Q, {
          title: K(`Confirmés par le prestataire, non réglés en banque ({0})`, e.unsettled.length),
          flush: !0,
          children: (0, q.jsx)(mv, {
            rows: e.unsettled,
            rowKey: e => e.id,
            empty: K(`Tous les paiements confirmés sont réglés.`),
            cols: [[K(`Confirmé`), e => Z(e.confirmed_at, !0)], [K(`Facture`), e => e.invoice], [K(`Moyen`), e => X_[e.method]], [K(`Montant`), e => X(e.amount_minor), `right`], [K(`Référence attendue sur le relevé`), e => (0, q.jsx)(`span`, {
              className: `code`,
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
            cols: [[K(`Date de valeur`), e => e.value_date], [K(`Référence`), e => (0, q.jsx)(`span`, {
              className: `code`,
              children: e.reference
            })], [K(`Libellé`), e => e.label], [K(`Brut`), e => X(e.gross_minor), `right`], [K(`Frais`), e => (0, q.jsxs)(q.Fragment, {
              children: [X(e.fee_minor), e.fee_expected_minor !== null && e.match_status === `matched` && e.fee_expected_minor !== e.fee_minor && (0, q.jsx)(`div`, {
                children: (0, q.jsxs)(cv, {
                  kind: `warn`,
                  children: [K(`attendu`), ` `, X(e.fee_expected_minor)]
                })
              })]
            }), `right`], [K(`Net crédité`), e => X(e.net_minor), `right`], [K(`Rapprochement`), e => (0, q.jsx)(lv, {
              map: Y_,
              value: e.match_status
            })], [K(`Facture`), e => e.invoice ?? `—`]]
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
      })
    })]
  });
}
function Uy() {
  let e = _v(),
    {
      session: t
    } = xv(),
    [n, r] = (0, G.useState)(t.today),
    i = Y(`/api/finance/close?day=${n}`),
    a = async () => {
      (await e.ask({
        kind: `confirm`,
        title: K(`Clôturer le {0} ?`, H_(n)),
        text: K(`La clôture fige les totaux de la journée. Elle ne peut pas être refaite.`),
        confirm: K(`Clôturer la journée`)
      })) && (await e.run(async () => {
        await J(`POST`, `/api/finance/close`, {
          day: n
        }), await i.reload();
      }, K(`Journée clôturée.`)));
    };
  return (0, q.jsxs)(q.Fragment, {
    children: [(0, q.jsxs)(fv, {
      title: K(`Clôture quotidienne`),
      sub: K(`Contrôle des encaissements du jour avant de figer les totaux.`),
      children: [(0, q.jsx)(`input`, {
        type: `date`,
        value: n,
        max: t.today,
        onChange: e => r(e.target.value),
        "aria-label": K(`Journée`),
        style: {
          width: `auto`
        }
      }), (0, q.jsx)(dv, {
        href: `/api/finance/close?format=csv`
      })]
    }), (0, q.jsx)(pv, {
      q: i,
      children: ({
        preview: e,
        closes: t
      }) => {
        let n = e.byMethod.reduce((e, t) => e + t.confirmed_minor - t.refunded_minor, 0),
          i = e.byMethod.reduce((e, t) => e + t.settled_minor, 0);
        return (0, q.jsxs)(`div`, {
          className: `stack`,
          children: [e.closed ? (0, q.jsxs)(`div`, {
            className: `notice ok`,
            children: [K(`Journée clôturée le`), ` `, Z(e.closed.closed_at, !0), ` `, K(`par`), ` `, e.closed.closed_by ?? `—`, `.`]
          }) : e.pending > 0 ? (0, q.jsxs)(`div`, {
            className: `notice err`,
            role: `alert`,
            children: [(0, q.jsx)(`strong`, {
              children: K(`Clôture bloquée :`)
            }), ` `, e.pending, ` `, K(`paiement(s) encore « en attente ». Interrogez le prestataire depuis le Journal pour connaître leur issue.`)]
          }) : (0, q.jsxs)(`div`, {
            className: `notice`,
            children: [K(`Journée ouverte.`), ` `, e.toVerify + e.openExceptions + e.erpPending > 0 ? K(`Des points restent à traiter ; ils seront consignés dans la clôture.`) : K(`Aucun point en suspens.`)]
          }), (0, q.jsxs)(`div`, {
            className: `grid g4`,
            children: [(0, q.jsx)(uv, {
              label: K(`Facturé`),
              value: X(e.invoiced),
              hint: K(`reste à encaisser : {0}`, X(e.outstanding))
            }), (0, q.jsx)(uv, {
              label: K(`Encaissé confirmé`),
              value: X(n),
              hint: K(`{0} tentative(s) échouée(s)`, e.failed)
            }), (0, q.jsx)(uv, {
              label: K(`Réglé en banque`),
              value: X(i),
              hint: K(`à recevoir : {0}`, X(n - i))
            }), (0, q.jsx)(uv, {
              label: K(`Points en suspens`),
              value: e.toVerify + e.openExceptions + e.erpPending,
              kind: e.toVerify + e.openExceptions + e.erpPending ? `warn` : ``,
              hint: K(`{0} à vérifier · {1} exception(s) · {2} écriture(s) ERP`, e.toVerify, e.openExceptions, e.erpPending)
            })]
          }), (0, q.jsx)(Q, {
            title: K(`Encaissements confirmés du {0}`, H_(e.day)),
            flush: !0,
            children: (0, q.jsx)(mv, {
              rows: e.byMethod,
              rowKey: e => e.method,
              empty: K(`Aucun encaissement confirmé ce jour.`),
              cols: [[K(`Moyen`), e => X_[e.method]], [K(`Nombre`), e => e.count, `right`], [K(`Confirmé`), e => X(e.confirmed_minor), `right`], [K(`Remboursé`), e => X(e.refunded_minor), `right`], [K(`Frais attendus`), e => X(e.fee_expected_minor), `right`], [K(`Réglé en banque`), e => X(e.settled_minor), `right`], [K(`Frais prélevés`), e => X(e.fee_actual_minor), `right`]]
            })
          }), !e.closed && (0, q.jsx)(`div`, {
            children: (0, q.jsx)(`button`, {
              disabled: e.pending > 0,
              onClick: a,
              children: K(`Clôturer la journée`)
            })
          }), (0, q.jsx)(Q, {
            title: K(`Journées clôturées`),
            flush: !0,
            children: (0, q.jsx)(mv, {
              rows: t,
              rowKey: e => e.day,
              empty: K(`Aucune journée clôturée.`),
              onRow: e => r(e.day),
              cols: [[K(`Journée`), e => H_(e.day)], [K(`Clôturée`), e => Z(e.closed_at, !0)], [K(`Par`), e => e.closed_by ?? `—`], [K(`Facturé`), e => X(e.totals.invoiced), `right`], [K(`Reste à encaisser`), e => X(e.totals.outstanding), `right`], [K(`À vérifier`), e => e.totals.toVerify, `right`], [K(`Exceptions`), e => e.totals.openExceptions, `right`]]
            })
          })]
        });
      }
    })]
  });
}
var Wy = {
  invoice: K(`Facture`),
  payment: K(`Encaissement`),
  settlement: K(`Règlement bancaire`),
  refund: K(`Remboursement`),
  member_charge: K(`Dû membre`),
  member_payment: K(`Encaissement membre`)
};
function Gy() {
  let e = _v(),
    t = Y(`/api/finance/erp`, 8e3),
    n = n => e.run(async () => {
      let r = await J(`POST`, `/api/finance/erp/sync`, n ? {
        ids: n
      } : {});
      e.toast(K(`{0} écriture(s) synchronisée(s), {1} en erreur.`, r.synced, r.failed), r.failed ? `err` : `ok`), await t.reload();
    });
  return (0, q.jsxs)(q.Fragment, {
    children: [(0, q.jsx)(fv, {
      title: K(`Synchronisation ERP`),
      sub: K(`Une écriture par facture, encaissement, règlement et remboursement. Les erreurs restent dans la file jusqu'à leur reprise.`),
      children: (0, q.jsx)(dv, {
        href: `/api/finance/erp?format=csv`
      })
    }), (0, q.jsx)(pv, {
      q: t,
      children: e => {
        let t = t => e.entries.filter(e => e.status === t).length;
        return (0, q.jsxs)(`div`, {
          className: `stack`,
          children: [e.settings.simulateFailure && (0, q.jsx)(`div`, {
            className: `notice warn`,
            children: K(`Panne ERP simulée (Administration › Paramètres) : chaque envoi échoue tant qu'elle est active.`)
          }), (0, q.jsxs)(`div`, {
            className: `grid g4`,
            children: [(0, q.jsx)(uv, {
              label: K(`Connecteur`),
              value: K(e.settings.system),
              hint: e.settings.autoSync ? K(`synchronisation automatique`) : K(`synchronisation manuelle`)
            }), (0, q.jsx)(uv, {
              label: K(`Synchronisées`),
              value: t(`synced`)
            }), (0, q.jsx)(uv, {
              label: K(`En attente`),
              value: t(`pending`),
              kind: t(`pending`) ? `info` : ``
            }), (0, q.jsx)(uv, {
              label: K(`En erreur`),
              value: t(`failed`),
              kind: t(`failed`) ? `warn` : ``
            })]
          }), (0, q.jsx)(`div`, {
            children: (0, q.jsx)(`button`, {
              disabled: t(`pending`) + t(`failed`) === 0,
              onClick: () => n(),
              children: K(`Synchroniser et reprendre les erreurs`)
            })
          }), (0, q.jsx)(Q, {
            title: K(`Écritures`),
            flush: !0,
            children: (0, q.jsx)(mv, {
              rows: e.entries,
              rowKey: e => e.id,
              empty: K(`Aucune écriture.`),
              cols: [[K(`Créée`), e => Z(e.created_at, !0)], [K(`Type`), e => Wy[e.kind] ?? e.kind], [K(`Libellé`), e => e.label], [K(`Montant`), e => X(e.amount_minor), `right`], [K(`État`), e => (0, q.jsxs)(q.Fragment, {
                children: [(0, q.jsx)(lv, {
                  map: J_,
                  value: e.status
                }), e.last_error && (0, q.jsx)(`div`, {
                  className: `small muted`,
                  children: K(e.last_error)
                })]
              })], [K(`Tentatives`), e => e.attempts, `right`], [K(`Référence ERP`), e => e.external_ref ? (0, q.jsx)(`span`, {
                className: `code`,
                children: e.external_ref
              }) : `—`], [``, e => e.status === `synced` ? null : (0, q.jsx)(`button`, {
                className: `sm secondary`,
                onClick: () => n([e.id]),
                children: e.status === `failed` ? K(`Reprendre`) : K(`Envoyer`)
              })]]
            })
          })]
        });
      }
    })]
  });
}

export { By, Gy, Hy, Uy, Vy, Wy, zy };
