// Company administration: users, settings (payment methods, accounting software), audit log.
import { deliverFirstOrder, createPayment } from "./helpers.mjs";

export const admin = [
  {
    name: "admin-users",
    description: "Company admin creates users, changes a role, deactivates a user (who can no longer log in); own access and duplicate email refused.",
    async run(api) {
      await api.login("u_bd_admin");
      await api.get("/api/admin/users");
      const c = await api.post("/api/admin/users", { name: "Livreur Test (démo)", email: "Livreur.Test@Exemple.invalid", role: "agent" }, { label: "create driver" });
      await api.post("/api/admin/users", { name: "Doublon (démo)", email: "livreur.test@exemple.invalid", role: "finance" }, { label: "duplicate email" });
      await api.post("/api/admin/users", { name: "Plateforme", email: "p@exemple.invalid", role: "platform_admin" }, { label: "cannot create a platform admin" });
      await api.patch(`/api/admin/users/${c.data.id}`, { role: "dispatcher" }, { label: "change role" });
      await api.patch(`/api/admin/users/${c.data.id}`, { active: false }, { label: "deactivate" });
      await api.patch("/api/admin/users/u_bd_admin", { role: "agent" }, { label: "change own access" });
      await api.get("/api/admin/users", { label: "users after changes" });
      await api.post("/api/demo/login", { userId: c.data.id }, { label: "deactivated user cannot log in" });
      await api.get("/api/admin/audit");
      await api.get("/api/admin/audit?format=csv", { label: "audit CSV" });
    },
  },
  {
    name: "admin-settings-methods",
    description: "Settings read and update: a disabled payment method disappears from the driver's bundle and cannot be used; invalid settings refused.",
    async run(api) {
      await api.login("u_bd_admin");
      const s = await api.get("/api/admin/settings");
      const settings = s.data.settings;
      const methods = { ...settings.payments.methods, juice: { ...settings.payments.methods.juice, enabled: false } };
      await api.put("/api/admin/settings", { payments: { ...settings.payments, methods }, erp: settings.erp }, { label: "disable Juice" });
      await api.put("/api/admin/settings", { payments: { ...settings.payments, attemptMinutes: 0 }, erp: settings.erp }, { label: "invalid attempt time" });
      await api.put("/api/admin/settings", { payments: settings.payments, erp: { ...settings.erp, secretRef: "clé en clair" } }, { label: "secret must be a reference, not a value" });
      await api.get("/api/admin/settings", { label: "settings after update" });
      await api.login("u_bd_agent1");
      const { invoice } = await deliverFirstOrder(api);
      await createPayment(api, invoice, "juice", "key-disabled-juice-01");
      await createPayment(api, invoice, "paystation", "key-enabled-paystat1");
      await api.login("u_bd_centrale");
      await api.put("/api/admin/settings", { payments: settings.payments, erp: settings.erp }, { label: "dispatcher cannot change settings" });
    },
  },
];
