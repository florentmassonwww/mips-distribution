// QR code the customer scans to pay (also used by the club's screens).
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { t } from "./legacy-bridge.js";

export function PaymentQrCode({ value }: { value: string }) {
  const [dataUrl, setDataUrl] = useState("");
  useEffect(() => {
    QRCode.toDataURL(value, { margin: 1, width: 240 })
      .then(setDataUrl)
      .catch(() => setDataUrl(""));
  }, [value]);
  return (
    <div className="qr">
      {dataUrl ? <img src={dataUrl} alt={t("Code à présenter au client")} /> : <span className="muted">{t("Génération du code…")}</span>}
    </div>
  );
}
