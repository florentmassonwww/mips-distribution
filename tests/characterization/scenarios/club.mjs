// Club module (carried over from v0.1.0): members, charges, dues, reminders, member payments,
// bank reconciliation, accounting export, member portal and gate access.

async function members(api, label = "members", opts) {
  const r = await api.get("/api/club/members", { label, ...opts });
  return r.data;
}

export const club = [
  {
    name: "club-dashboard-and-members",
    description: "Club dashboard, member list with search, filters, sort and CSV export, member detail.",
    async run(api) {
      await api.login("u_cs_admin");
      await api.get("/api/club/dashboard");
      const list = await members(api);
      await api.get("/api/club/members?q=00003", { label: "search by number" });
      await api.get("/api/club/members?filter=arrears", { label: "filter arrears" });
      await api.get("/api/club/members?sort=balance", { label: "sort by balance" });
      await api.get("/api/club/members?format=csv", { label: "members CSV" });
      const debtor = list.find((m) => m.overdue_minor > 0);
      await api.get(`/api/club/members/${debtor.id}`, { label: "member detail" });
      await api.get("/api/club/members/mbr_inconnu", { label: "unknown member" });
    },
  },
  {
    name: "club-member-create-update",
    description: "Secretariat creates a member (reference and badge generated), updates plan and status; invalid inputs refused; finance cannot create.",
    async run(api) {
      await api.login("u_cs_secretariat");
      const dues = await api.get("/api/club/dues", { label: "plans", record: false });
      const plan = dues.data.plans[0];
      const c = await api.post("/api/club/members", { name: "Nouveau Membre (démo)", email: "nouveau@membres.exemple.invalid", phone: "+230 5900 9999", planId: plan.id }, { label: "create member" });
      await api.post("/api/club/members", { name: "Badge Fixe (démo)", planId: null, badge: "B99999" }, { label: "create member with badge" });
      await api.post("/api/club/members", { name: "Badge Doublon (démo)", planId: null, badge: "B99999" }, { label: "duplicate badge" });
      await api.post("/api/club/members", { name: "X", planId: null }, { label: "name too short" });
      await api.patch(`/api/club/members/${c.data.id}`, { status: "suspended", phone: "+230 5900 0000" }, { label: "suspend and change phone" });
      await api.patch(`/api/club/members/${c.data.id}`, { planId: dues.data.plans[1].id }, { label: "change plan" });
      await api.get(`/api/club/members/${c.data.id}`, { label: "member after update" });
      await api.login("u_cs_compta");
      await api.post("/api/club/members", { name: "Par la comptabilité", planId: null }, { label: "finance cannot create members" });
    },
  },
  {
    name: "club-charges",
    description: "Consumption and fee charges per outlet; finance cancels a charge with a reason; balances follow.",
    async run(api) {
      await api.login("u_cs_secretariat");
      const m = (await members(api, "members", { record: false })).find((x) => x.status === "active" && x.balance_minor === 0);
      const ch = await api.post(`/api/club/members/${m.id}/charges`, { kind: "consumption", outlet: "bar", label: "Consommations bar (démo)", amountMinor: 45000 }, { label: "bar consumption" });
      await api.post(`/api/club/members/${m.id}/charges`, { kind: "fee", outlet: "tennis", label: "Location court (démo)", amountMinor: 30000 }, { label: "court fee" });
      await api.post(`/api/club/members/${m.id}/charges`, { kind: "dues", outlet: "bar", label: "Interdit", amountMinor: 100 }, { label: "dues cannot be charged by hand" });
      await api.post(`/api/club/members/${m.id}/charges`, { kind: "consumption", outlet: "piscine", label: "Inconnu", amountMinor: 100 }, { label: "unknown outlet" });
      await api.post(`/api/club/charges/${ch.data.id ?? ch.data.charge?.id}/cancel`, { reason: "Erreur" }, { label: "secretariat cannot cancel" });
      await api.login("u_cs_compta");
      await api.post(`/api/club/charges/${ch.data.id ?? ch.data.charge?.id}/cancel`, { reason: "Erreur de saisie (démo)" }, { label: "finance cancels" });
      await api.post(`/api/club/charges/${ch.data.id ?? ch.data.charge?.id}/cancel`, { reason: "Encore (démo)" }, { label: "cancel twice" });
      await api.get(`/api/club/members/${m.id}`, { label: "member balance after charges" });
    },
  },
  {
    name: "club-cash-payment",
    description: "Cash payment at the desk by finance: idempotent on its key, allocated to the oldest charges.",
    async run(api) {
      await api.login("u_cs_compta");
      const m = (await members(api, "members", { record: false })).find((x) => x.balance_minor > 0 && x.status === "active");
      await api.post(`/api/club/members/${m.id}/cash`, { amountMinor: 20000, note: "Espèces au guichet (démo)", idempotencyKey: "key-club-cash-0001" }, { label: "cash payment" });
      await api.post(`/api/club/members/${m.id}/cash`, { amountMinor: 20000, note: "Espèces au guichet (démo)", idempotencyKey: "key-club-cash-0001" }, { label: "same key replayed" });
      await api.post(`/api/club/members/${m.id}/cash`, { amountMinor: 0, idempotencyKey: "key-club-cash-0002" }, { label: "zero refused" });
      await api.get(`/api/club/members/${m.id}`, { label: "member after cash" });
      await api.get("/api/club/payments", { label: "member payments" });
      await api.get("/api/club/payments?method=cash&format=csv", { label: "member payments CSV" });
    },
  },
  {
    name: "club-dues-and-reminders",
    description: "Monthly dues run for a period (twice refused or idempotent), reminder run by level and threshold.",
    async run(api) {
      await api.login("u_cs_compta");
      await api.post("/api/club/dues/run", { period: "2026-11" }, { label: "bill November dues" });
      await api.post("/api/club/dues/run", { period: "2026-11" }, { label: "bill November again" });
      await api.post("/api/club/dues/run", { period: "novembre" }, { label: "invalid period" });
      await api.get("/api/club/dues", { label: "dues after run" });
      await api.post("/api/club/reminders/run", {}, { label: "run reminders" });
      await api.post("/api/club/reminders/run", {}, { label: "run reminders again" });
      await api.get("/api/club/reminders", { label: "reminders" });
    },
  },
  {
    name: "club-member-portal-and-online-payment",
    description: "Statement sent to a member, public member page by token, online payment pending then confirmed by notification, status check.",
    async run(api) {
      await api.login("u_cs_compta");
      const m = (await members(api, "members", { record: false })).find((x) => x.balance_minor > 0 && x.status === "active");
      const st = await api.post(`/api/club/members/${m.id}/statement`, {}, { label: "send statement" });
      const url = JSON.stringify(st.data).match(/membre\/([A-Za-z0-9_-]{16,})/);
      api.must(url, "the statement carries the member link");
      const token = url[1];
      await api.logout();
      await api.get(`/api/public/member/${token}`, { label: "public member page" });
      await api.post(`/api/public/member/${token}/pay`, { idempotencyKey: "key-member-online-01" }, { label: "start online payment" });
      await api.post(`/api/public/member/${token}/pay`, { idempotencyKey: "key-member-online-01" }, { label: "same key replayed" });
      await api.post(`/api/public/member/${token}/pay/demo`, { outcome: "success" }, { label: "member pays" });
      await api.get(`/api/public/member/${token}`, { label: "page after payment" });
      await api.get("/api/public/member/jeton-inconnu-0000", { label: "unknown token" });
      await api.login("u_cs_compta");
      const pays = await api.get("/api/club/payments?method=link", { label: "online payments" });
      await api.post(`/api/club/payments/${pays.data[0].id}/check`, {}, { label: "status check" });
    },
  },
  {
    name: "club-statement-reconciliation",
    description: "Club bank statement import: transfers matched by member reference, online payments settled, unmatched line assigned by hand with a note.",
    async run(api) {
      await api.login("u_cs_compta");
      const st = await api.get("/api/club/statements/demo", { label: "demo statement" });
      await api.post("/api/club/statements", { filename: st.data.filename, content: st.data.content }, { label: "import" });
      const rec = await api.get("/api/club/reconciliation");
      const line = JSON.stringify(rec.data).match(/"id":"(bl_[0-9a-f]{20})"[^}]*"match_status":"unmatched"/) ?? JSON.stringify(rec.data).match(/"id":"(bl_[0-9a-f]{20})"/);
      const m = (await members(api, "members", { record: false })).find((x) => x.balance_minor > 0);
      if (line) {
        await api.post(`/api/club/bank-lines/${line[1]}/assign`, { memberId: m.id, note: "x" }, { label: "note too short" });
        await api.post(`/api/club/bank-lines/${line[1]}/assign`, { memberId: m.id, note: "Virement identifié par téléphone (démo)" }, { label: "assign line to member" });
        await api.post(`/api/club/bank-lines/${line[1]}/assign`, { memberId: m.id, note: "Deuxième fois (démo)" }, { label: "assign twice" });
      }
      await api.post("/api/club/statements", { filename: st.data.filename, content: st.data.content }, { label: "import again" });
      await api.get("/api/club/reconciliation", { label: "reconciliation after" });
      await api.get("/api/club/payments?status=confirmed", { label: "payments after" });
    },
  },
  {
    name: "club-accounting-export",
    description: "Accounting export (balanced journal lines) for the default period, a given range and as CSV.",
    async run(api) {
      await api.login("u_cs_compta");
      await api.get("/api/club/accounting");
      await api.get("/api/club/accounting?from=2026-09-01&to=2026-09-30", { label: "September" });
      await api.get("/api/club/accounting?from=2026-01-01&to=2026-10-17&format=csv", { label: "year to date CSV" });
      await api.login("u_cs_secretariat");
      await api.get("/api/club/accounting", { label: "secretariat cannot export" });
    },
  },
  {
    name: "club-gate",
    description: "Gate check at the desk by badge: allow, flag (arrears) or deny; events of the day; device list; signed device endpoint rejects unsigned calls.",
    async run(api) {
      await api.login("u_cs_accueil");
      const all = await (async () => {
        await api.login("u_cs_admin");
        const l = await members(api, "members", { record: false });
        await api.login("u_cs_accueil");
        return l;
      })();
      const ok = all.find((m) => m.status === "active" && m.overdue_minor === 0);
      const late = all.find((m) => m.status === "active" && m.overdue_days > 30 && m.overdue_minor >= 50000);
      const suspended = all.find((m) => m.status === "suspended");
      for (const m of [ok, late, suspended]) await api.post("/api/club/gate/check", { credential: m.badge }, { label: `gate ${m.status} ${m.overdue_days}d` });
      await api.post("/api/club/gate/check", { credential: "INCONNU" }, { label: "unknown badge" });
      await api.get("/api/club/gate/events?today=1", { label: "events today" });
      await api.get("/api/club/gate/devices", { label: "front desk cannot list devices" });
      await api.login("u_cs_admin");
      await api.get("/api/club/gate/devices");
      await api.logout();
      await api.call("POST", "/api/access/check", JSON.stringify({ credential: ok.badge }), { csrf: false, headers: { "X-Device": "gd_cs_main" }, label: "device call without signature" });
    },
  },
];
