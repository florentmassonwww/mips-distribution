// Small helpers shared by the club module.
import type { Actor } from "../../core/actor.ts";
import { type Db, get } from "../../core/db.ts";
import { notFound } from "../../core/errors.ts";
import type { MemberPaymentRow, MemberRow } from "./types.ts";

/** Company of the signed-in actor (club staff always belong to one). */
export const actorCompanyId = (actor: Actor): string => actor.companyId as string;

/** Path of a member's public account page. */
export const portalPath = (member: Pick<MemberRow, "portal_token">): string => `/membre/${member.portal_token}`;

export function requireMember(db: Db, companyId: string, memberId: string): MemberRow {
  const member = get<MemberRow>(db, "SELECT * FROM members WHERE id = ? AND company_id = ?", memberId, companyId);
  if (!member) throw notFound("Membre");
  return member;
}

export function requireMemberPayment(db: Db, companyId: string, paymentId: string): MemberPaymentRow {
  const payment = get<MemberPaymentRow>(
    db,
    "SELECT * FROM member_payments WHERE id = ? AND company_id = ?",
    paymentId,
    companyId,
  );
  if (!payment) throw notFound("Paiement");
  return payment;
}

/** Member row known to exist (foreign key). */
export const memberById = (db: Db, memberId: string): MemberRow =>
  get<MemberRow>(db, "SELECT * FROM members WHERE id = ?", memberId)!;

/** Member payment row known to exist. */
export const memberPaymentById = (db: Db, paymentId: string): MemberPaymentRow =>
  get<MemberPaymentRow>(db, "SELECT * FROM member_payments WHERE id = ?", paymentId)!;
