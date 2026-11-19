// Demo gate access: a badge reader posts signed requests, verified like provider notifications.
import { ApiError } from "../../core/errors.ts";
import { iso } from "../../core/time.ts";
import { verifySignature } from "./legacy-imports.ts";
import type { GateAccess, GateRequest } from "./types.ts";

interface GateRequestBody {
  requestId?: string;
  credential?: unknown;
  occurredAt?: string;
}

/** Longest credential a reader may send (RFID/NFC identifiers, PIN, QR payload). */
const MAX_CREDENTIAL_LENGTH = 64;

export function createDemoGateAccess(toleranceSeconds: number): GateAccess {
  return {
    label: "Barrière de démonstration",
    demo: true,
    toVerify: [
      "Interface exposée par le logiciel de contrôle d'accès du fournisseur de la barrière (API, webhook, liste blanche synchronisée) : l'intégration en dépend.",
      "Temps de réponse admissible au passage du badge et comportement du lecteur si le serveur du club ne répond pas (liste locale, ouverture ou refus par défaut).",
      "Identifiants lus (carte RFID, NFC, BLE, PIN, QR) et format transmis par le lecteur ; association d'un badge à un membre.",
      "Affichage possible à l'accueil d'un signalement « dette à régulariser » sans bloquer la barrière ; anti-retour et comptage des passages.",
      "Option de lecture de plaques (ANPR) : à chiffrer séparément si retenue.",
    ],
    verifyRequest(rawBody: string, signature: string | undefined, secret: string, now: Date): GateRequest {
      verifySignature(secret, rawBody, signature, now, toleranceSeconds);
      const body = JSON.parse(rawBody) as GateRequestBody;
      if (
        !body.requestId ||
        typeof body.credential != "string" ||
        !body.credential.trim() ||
        body.credential.length > MAX_CREDENTIAL_LENGTH
      ) {
        throw new ApiError(400, "invalid_request", "Demande de lecteur incomplète.");
      }
      return { requestId: body.requestId, credential: body.credential.trim(), occurredAt: body.occurredAt ?? iso(now) };
    },
  };
}
