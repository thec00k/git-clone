// Settings must never add or remove a light, or switch shadows on or off.
//
// three.js builds each material's shader around the number and kinds of lights and whether shadows are on. If a
// setting (time, season, shelf lights, quality...) mounts or unmounts a light, every material in the room is
// rebuilt at once and the page freezes. Lights therefore stay mounted and settings change their intensity instead.
//
// This reads the room's .tsx files with the TypeScript parser (no browser) and fails when:
// - a light, or a component that contains a light, is rendered behind `&&`, `||`, `??`, `? :` or an early
//   `return` whose condition reads anything other than the room's identity or whether the model has loaded;
// - a light gets `visible={...}` or `castShadow={...}` from an expression (three.js skips hidden lights, so that
//   changes the count too);
// - the Canvas `shadows` prop is an expression (a fixed shadow type is fine), or code assigns `shadowMap.enabled`.
import assert from 'node:assert/strict';
import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

const LIGHT_TAGS = new Set([
  'ambientLight',
  'directionalLight',
  'hemisphereLight',
  'lightProbe',
  'pointLight',
  'rectAreaLight',
  'spotLight',
]);

// Names a condition may read. Each one is fixed for as long as a room is open, so it never toggles a light at
// runtime: switching rooms loads a different model anyway.
const ALLOWED = new Set([
  // Which room is open.
  'activeRoom',
  'coastal',
  'neon',
  'neonMap',
  'study',
  'woodland',
  // Whether a friend is visiting: fixed for the whole visit.
  'isVisitor',
  // Whether the room model, or a piece of it, has loaded yet.
  'board',
  'cloned',
  'fixture',
  'hearthPosition',
  'loaded',
  'mapBox',
  'scene',
  'surface',
  // Literals.
  'undefined',
  'null',
  'true',
  'false',
]);

const tagName = node => (ts.isJsxElement(node) ? node.openingElement.tagName : node.tagName).getText();
const isJsx = node => ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node);
const attributes = node => (ts.isJsxElement(node) ? node.openingElement : node).attributes.properties;

/** Root names read by an expression: `environment.season === 'winter'` reads `environment`. */
function rootsOf(expression) {
  const roots = new Set();
  const visit = node => {
    if (ts.isPropertyAccessExpression(node)) return visit(node.expression);
    if (ts.isIdentifier(node)) return roots.add(node.text);
    if (node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword) return;
    if (node.kind === ts.SyntaxKind.NullKeyword) return;
    ts.forEachChild(node, visit);
  };
  visit(expression);
  return [...roots];
}

function componentName(node) {
  if (ts.isFunctionDeclaration(node) && node.name) return node.name.text;
  if (
    (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) &&
    ts.isVariableDeclaration(node.parent) &&
    ts.isIdentifier(node.parent.name)
  )
    return node.parent.name.text;
  return null;
}

/** Parses each file and lists its components with the JSX tags they render. */
function parse(files) {
  const components = new Map();
  for (const {file, text} of files) {
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = node => {
      const name = componentName(node);
      if (name && /^[A-Z]/.test(name)) {
        const tags = [];
        const own = [];
        // Lights inside a component's own <Canvas> belong to a separate renderer, not to the room.
        const collect = (child, inCanvas) => {
          if (isJsx(child)) {
            tags.push(child);
            if (!inCanvas) own.push(child);
            if (tagName(child) === 'Canvas') inCanvas = true;
          }
          ts.forEachChild(child, n => collect(n, inCanvas));
        };
        ts.forEachChild(node, n => collect(n, false));
        components.set(name, {name, node, tags, own, file, source});
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  // A component "has a light" if it renders one, directly or through another component.
  const lit = new Set();
  for (let changed = true; changed;) {
    changed = false;
    for (const c of components.values()) {
      if (lit.has(c.name)) continue;
      if (c.own.some(t => LIGHT_TAGS.has(tagName(t)) || lit.has(tagName(t)))) {
        lit.add(c.name);
        changed = true;
      }
    }
  }
  return {components, lit};
}

export function findProblems(files) {
  const {components, lit} = parse(files);
  const problems = [];
  const where = (c, node) => {
    const {line} = c.source.getLineAndCharacterOfPosition(node.getStart());
    return `${c.file}:${line + 1}`;
  };
  const blocked = roots => roots.filter(r => !ALLOWED.has(r));
  for (const c of components.values()) {
    for (const tag of c.tags) {
      const name = tagName(tag);
      if (name === 'Canvas') {
        for (const a of attributes(tag)) {
          if (
            ts.isJsxAttribute(a) &&
            a.name.getText() === 'shadows' &&
            a.initializer &&
            !ts.isStringLiteral(a.initializer)
          )
            problems.push(`${where(c, a)} Canvas shadows={...} must stay fixed; see RoomShadowQuality`);
        }
      }
      const isLight = LIGHT_TAGS.has(name);
      if (!isLight && !lit.has(name)) continue;
      if (isLight) {
        for (const a of attributes(tag)) {
          if (!ts.isJsxAttribute(a) || !a.initializer) continue;
          const prop = a.name.getText();
          if (prop === 'visible' || prop === 'castShadow')
            problems.push(`${where(c, a)} <${name} ${prop}={...}> changes the light count; use intensity`);
        }
      }
      // Walk up to the component, collecting the conditions this element sits behind.
      for (
        let child = tag, parent = tag.parent;
        parent && parent !== c.node;
        child = parent, parent = parent.parent
      ) {
        let condition = null;
        if (
          ts.isBinaryExpression(parent) &&
          parent.right === child &&
          [
            ts.SyntaxKind.AmpersandAmpersandToken,
            ts.SyntaxKind.BarBarToken,
            ts.SyntaxKind.QuestionQuestionToken,
          ].includes(parent.operatorToken.kind)
        )
          condition = parent.left;
        if (ts.isConditionalExpression(parent) && parent.condition !== child) condition = parent.condition;
        if (ts.isIfStatement(parent) && parent.expression !== child) condition = parent.expression;
        if (!condition) continue;
        const bad = blocked(rootsOf(condition));
        if (bad.length)
          problems.push(
            `${where(c, tag)} <${name}> is only rendered when \`${condition.getText()}\` (reads ${bad.join(', ')}); keep it mounted and set intensity 0`,
          );
      }
    }
    // Early `if (...) return ...` before the lights in a component that renders them.
    if (!lit.has(c.name)) continue;
    const body = c.node.body;
    if (!body || !ts.isBlock(body)) continue;
    for (const statement of body.statements) {
      if (!ts.isIfStatement(statement)) continue;
      let returns = false;
      const find = n => {
        if (ts.isReturnStatement(n)) returns = true;
        else if (!ts.isFunctionLike(n)) ts.forEachChild(n, find);
      };
      find(statement.thenStatement);
      if (statement.elseStatement) find(statement.elseStatement);
      const bad = blocked(rootsOf(statement.expression));
      if (returns && bad.length)
        problems.push(
          `${where(c, statement)} ${c.name} renders lights but returns early when \`${statement.expression.getText()}\` (reads ${bad.join(', ')})`,
        );
    }
  }
  for (const {file, text} of files) {
    if (/shadowMap\.enabled\s*=[^=]/.test(text))
      problems.push(`${file} assigns shadowMap.enabled; keep shadows on and use RoomShadowQuality`);
  }
  return problems;
}

// The scanner must catch the patterns that used to freeze the room.
const fixture = text => [{file: 'fixture.tsx', text}];
assert.equal(findProblems(fixture('export function A({on}){return <>{on && <pointLight />}</>;}')).length, 1);
assert.equal(
  findProblems(fixture('export function A({night}){return <group>{night ? <spotLight /> : null}</group>;}'))
    .length,
  1,
);
assert.equal(
  findProblems(
    fixture(
      'function Fire(){return <pointLight />;}\nexport function Room({environment}){return <>{environment.season === "winter" && <Fire />}</>;}',
    ),
  ).length,
  1,
  'a component holding a light counts too',
);
assert.equal(
  findProblems(fixture('export function A({q}){return <Canvas shadows={q.shadows} />;}')).length,
  1,
);
assert.equal(findProblems(fixture('export function A(){return <Canvas shadows="percentage" />;}')).length, 0);
assert.equal(findProblems(fixture('export function A({on}){return <pointLight visible={on} />;}')).length, 1);
assert.equal(
  findProblems(fixture('export function A({on}){if (!on) return null; return <pointLight />;}')).length,
  1,
);
assert.equal(
  findProblems(fixture('export function A({on}){return <pointLight intensity={on ? 1 : 0} />;}')).length,
  0,
);
assert.equal(
  findProblems(fixture('export function A({neon}){return <>{neon && <pointLight />}</>;}')).length,
  0,
);
assert.equal(
  findProblems(
    fixture(
      'function Scan(){return <Canvas><pointLight /></Canvas>;}\nexport function A({open}){return <>{open && <Scan />}</>;}',
    ),
  ).length,
  0,
  'a separate <Canvas> has its own lights',
);

// The real room: everything drawn by the room's renderer lives in room3d.
const root = fileURLToPath(new URL('../src/components/room3d/', import.meta.url));
const list = dir =>
  readdirSync(dir, {withFileTypes: true}).flatMap(e =>
    e.isDirectory() ? list(join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : [],
  );
const files = list(root).map(path => ({file: path.slice(root.length), text: readFileSync(path, 'utf8')}));
const problems = findProblems(files);
if (problems.length) {
  console.error('Lights or shadows that change with settings (each one rebuilds every shader):');
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
const {lit} = parse(files);
assert.ok(
  lit.has('ShelfLighting') && lit.has('HearthFire') && lit.has('RoomLights'),
  'scanner sees the room lights',
);
console.log(`PASS constant lights: ${lit.size} components with lights, none mounted or hidden by a setting.`);
