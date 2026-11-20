// Checks the French -> English table of apps/web against the sources, with the TypeScript parser:
//  - every text passed to translate() / translateCount() is a key of the table (both counted forms);
//  - every key of the table is used: by a translate() / translateCount() call of apps/web, or as a
//    text the server sends (a string of apps/api or packages: error messages, plan names, reasons),
//    or as "err.<code>" for an error code the server uses.
// Keys passed as variables (server texts) cannot be resolved; they are only counted.
// Usage: node --no-warnings tests/i18n/check.mjs
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

const root = join(import.meta.dirname, "..", "..");
const webSources = join(root, "apps", "web", "src");
const tablePath = join(webSources, "i18n", "translations.ts");
const serverRoots = [join(root, "apps", "api"), join(root, "packages")];

const listFiles = (dir, extensions) =>
  readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && extensions.some((extension) => entry.name.endsWith(extension)))
    .map((entry) => join(entry.parentPath, entry.name))
    .filter((path) => !path.split(/[\\/]/).includes("node_modules"))
    .sort();

const parse = (path) =>
  ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true, path.endsWith("x") ? ts.ScriptKind.TSX : undefined);

const where = (node) => {
  const file = node.getSourceFile();
  const { line } = file.getLineAndCharacterOfPosition(node.getStart());
  return `${relative(root, file.fileName)}:${line + 1}`;
};

const visit = (node, callback) => {
  callback(node);
  ts.forEachChild(node, (child) => visit(child, callback));
};

const isText = (node) => ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node);

// --- The table -------------------------------------------------------------------------------
const table = new Map(); // key -> location
const errors = [];
visit(parse(tablePath), (node) => {
  if (!ts.isVariableDeclaration(node) || node.name.getText() !== "translations") return;
  let literal = node.initializer;
  while (literal && (ts.isAsExpression(literal) || ts.isSatisfiesExpression(literal) || ts.isParenthesizedExpression(literal)))
    literal = literal.expression;
  if (!literal || !ts.isObjectLiteralExpression(literal)) throw new Error("translations is not an object literal");
  for (const property of literal.properties) {
    if (!ts.isPropertyAssignment(property)) {
      errors.push(`${where(property)}: unexpected entry in the table`);
      continue;
    }
    const key = ts.isIdentifier(property.name) || isText(property.name) ? property.name.text : undefined;
    if (key === undefined) errors.push(`${where(property)}: computed key in the table`);
    else if (table.has(key)) errors.push(`${where(property)}: duplicate key ${JSON.stringify(key)} (first at ${table.get(key)})`);
    else table.set(key, where(property));
    if (!isText(property.initializer)) errors.push(`${where(property)}: the English text must be a plain string`);
  }
});

// --- Texts passed to translate() / translateCount() -------------------------------------------
const used = new Map(); // key -> first location
let dynamicKeys = 0;

/** Static texts an expression can evaluate to; false when part of it is not static. */
function staticTexts(node, texts) {
  if (ts.isParenthesizedExpression(node)) return staticTexts(node.expression, texts);
  if (isText(node)) {
    if (node.text !== "") texts.push(node.text);
    return true;
  }
  if (ts.isConditionalExpression(node)) return staticTexts(node.whenTrue, texts) & staticTexts(node.whenFalse, texts);
  if (ts.isBinaryExpression(node) && [ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken].includes(node.operatorToken.kind))
    return staticTexts(node.left, texts) & staticTexts(node.right, texts);
  if (ts.isTemplateExpression(node)) errors.push(`${where(node)}: translation key built with \${…}: use "{0}" placeholders`);
  return false;
}

const keyArguments = { translate: [0], translateCount: [1, 2] };
for (const path of listFiles(webSources, [".ts", ".tsx"])) {
  if (path === tablePath) continue;
  visit(parse(path), (node) => {
    if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression)) return;
    const positions = keyArguments[node.expression.text];
    if (!positions) return;
    if (node.expression.text === "translateCount" && node.arguments.length < 3)
      errors.push(`${where(node)}: translateCount needs a count, a singular and a plural`);
    for (const position of positions) {
      const argument = node.arguments[position];
      if (!argument) continue;
      const texts = [];
      if (!staticTexts(argument, texts)) dynamicKeys++;
      for (const text of texts) {
        if (!used.has(text)) used.set(text, where(argument));
        if (/\((s|x|es)\)/.test(text)) errors.push(`${where(argument)}: "(s)" form ${JSON.stringify(text)}: use translateCount`);
      }
    }
  });
}

// --- Texts sent by the server -------------------------------------------------------------------
const serverTexts = new Set();
for (const path of serverRoots.flatMap((dir) => listFiles(dir, [".ts", ".mts", ".js", ".mjs"]))) {
  visit(parse(path), (node) => {
    if (isText(node)) serverTexts.add(node.text);
    else if (ts.isTemplateExpression(node)) {
      serverTexts.add(node.head.text);
      for (const span of node.templateSpans) serverTexts.add(span.literal.text);
    }
  });
}

const missing = [...used].filter(([key]) => !table.has(key));
const unused = [...table].filter(
  ([key]) => !used.has(key) && !serverTexts.has(key) && !(key.startsWith("err.") && serverTexts.has(key.slice(4))),
);
for (const [key, location] of missing) errors.push(`${location}: missing English entry for ${JSON.stringify(key)}`);
for (const [key, location] of unused) errors.push(`${location}: unused entry ${JSON.stringify(key)}`);

for (const error of errors) console.error(error);
console.log(
  `${table.size} entries, ${used.size} texts translated in apps/web, ${dynamicKeys} keys passed as variables; ` +
    `${missing.length} missing, ${unused.length} unused, ${errors.length} problem(s).`,
);
process.exitCode = errors.length ? 1 : 0;
