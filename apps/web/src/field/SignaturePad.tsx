// Receiver's signature, drawn with a finger, mouse or pen. Reported as a PNG data URL (the format
// the server accepts: data:image/png;base64,…) after each stroke, null once cleared.
import { useRef, useState, type PointerEvent } from "react";
import { translate } from "../i18n/translate.ts";

interface SignaturePadProps {
  onChange: (signature: string | null) => void;
}

export function SignaturePad({ onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [signed, setSigned] = useState(false);

  // Pointer position in canvas pixels (the canvas is scaled by CSS).
  const point = (event: PointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement): [number, number] => {
    const rect = canvas.getBoundingClientRect();
    return [(event.clientX - rect.left) * (canvas.width / rect.width), (event.clientY - rect.top) * (canvas.height / rect.height)];
  };

  const start = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    drawing.current = true;
    canvas.setPointerCapture(event.pointerId);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.lineWidth = 2.5;
    context.lineCap = "round";
    context.strokeStyle = "#0e2a55";
    context.beginPath();
    context.moveTo(...point(event, canvas));
  };

  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const canvas = event.currentTarget;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.lineTo(...point(event, canvas));
    context.stroke();
  };

  const end = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    drawing.current = false;
    setSigned(true);
    onChange(event.currentTarget.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setSigned(false);
    onChange(null);
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="signature"
        width={480}
        height={150}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        aria-label={translate("Zone de signature du réceptionnaire")}
      />
      <div className="row spread small">
        <span className="muted">{translate(signed ? "Signature enregistrée" : "Signature du réceptionnaire (facultative)")}</span>
        {signed && (
          <button type="button" className="sm secondary" onClick={clear}>
            {translate("Effacer")}
          </button>
        )}
      </div>
    </div>
  );
}
