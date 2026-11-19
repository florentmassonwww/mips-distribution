// QR code the customer scans to pay (also used by the club's screens).
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { translate } from "../i18n/translate.ts";

export function PaymentQrCode({ value }: { value: string }) {
  const [dataUrl, setDataUrl] = useState("");
  useEffect(() => {
    QRCode.toDataURL(value, { margin: 1, width: 240 })
      .then(setDataUrl)
      .catch(() => setDataUrl(""));
  }, [value]);
  return (
    <div className="qr">
      {dataUrl ? <img src={dataUrl} alt={translate("Code à présenter au client")} /> : <span className="muted">{translate("Génération du code…")}</span>}
    </div>
  );
}
