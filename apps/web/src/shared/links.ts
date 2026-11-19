// The interface uses hash routing (HashRouter): an in-app path lives after "#".

/** href of an in-app path, for a plain <a>. */
export const hashHref = (path: string): string => `#${path}`;

/** Full URL of an in-app path on this site (links to share or encode in a QR code). */
export const absoluteHashUrl = (path: string): string => `${location.href.split("#")[0]}#${path}`;
