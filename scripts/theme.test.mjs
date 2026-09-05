import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { DRAVA_CONTACT } from "../src/lib/drava-contact.ts";

const require = createRequire(import.meta.url);
const [initSource, providerSource, toggleSource, layoutSource, receiptCss, receiptSource] = await Promise.all([
  "../public/theme-init.js",
  "../src/lib/theme-context.tsx",
  "../src/components/layout/ThemeToggle.tsx",
  "../src/app/layout.tsx",
  "../src/components/payment/payment-result-mobile.css",
  "../src/components/payment/PaymentReceipt.tsx",
].map((file) => readFile(new URL(file, import.meta.url), "utf8")));

function loadModule(source, imports, globals = {}) {
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const context = vm.createContext(Object.defineProperties({
    exports: {},
    require(name) {
      if (name === "react/jsx-runtime") return require(name);
      assert.ok(name in imports, `Unexpected dependency: ${name}`);
      return imports[name];
    },
  }, Object.getOwnPropertyDescriptors(globals)));
  vm.runInContext(compiled, context);
  return context.exports;
}

function createEnvironment({ saved = null, systemDark = false, blocked = false } = {}) {
  const stored = new Map([["unrelated-setting", "unchanged"]]);
  if (saved !== null) stored.set("drava-theme", saved);
  const calls = [];
  const windowListeners = new Map();
  const mediaListeners = new Set();
  const classes = new Set(["existing-class"]);
  const metas = [{ content: "#ffffff" }, { content: "#0b1220" }].map((attributes) => ({
    attributes,
    setAttribute(key, value) { attributes[key] = value; },
  }));
  const root = {
    dataset: { existing: "retained" },
    style: {},
    classList: { toggle(name, enabled) { enabled ? classes.add(name) : classes.delete(name); } },
  };
  const media = {
    matches: systemDark,
    addEventListener(name, listener) {
      assert.equal(name, "change");
      mediaListeners.add(listener);
    },
    removeEventListener(name, listener) {
      assert.equal(name, "change");
      assert.ok(mediaListeners.delete(listener), "Remove the same media listener that was registered");
    },
  };
  const localStorage = {
    getItem(key) {
      calls.push(["get", key]);
      if (blocked) throw new Error("Storage blocked");
      return stored.get(key) ?? null;
    },
    setItem(key, value) {
      calls.push(["set", key, value]);
      if (blocked) throw new Error("Storage blocked");
      stored.set(key, value);
    },
    removeItem(key) {
      calls.push(["remove", key]);
      if (blocked) throw new Error("Storage blocked");
      stored.delete(key);
    },
  };
  const globals = {
    localStorage,
    document: {
      documentElement: root,
      querySelectorAll(selector) {
        assert.equal(selector, 'meta[name="theme-color"]');
        return metas;
      },
    },
    window: {
      matchMedia(query) {
        assert.equal(query, "(prefers-color-scheme: dark)");
        return media;
      },
      addEventListener(name, listener) {
        const listeners = windowListeners.get(name) ?? new Set();
        listeners.add(listener);
        windowListeners.set(name, listeners);
      },
      removeEventListener(name, listener) {
        assert.ok(windowListeners.get(name)?.delete(listener));
        if (!windowListeners.get(name).size) windowListeners.delete(name);
      },
      get history() { assert.fail("Theme changes must not read or mutate order history"); },
      get location() { assert.fail("Theme changes must not read or mutate order URLs"); },
    },
    fetch() { assert.fail("Theme changes must not make API or payment requests"); },
    get sessionStorage() { assert.fail("Theme changes must not access order session storage"); },
  };
  return {
    globals, root, classes, metas, calls, stored, mediaListeners, windowListeners,
    runInit() { vm.runInNewContext(initSource, globals); },
    systemChange(dark) {
      media.matches = dark;
      for (const listener of mediaListeners) listener({ matches: dark });
    },
    storageChange(key, newValue) {
      for (const listener of windowListeners.get("storage") ?? []) listener({ key, newValue, storageArea: localStorage });
    },
  };
}

function createProvider(options = {}) {
  const environment = createEnvironment(options);
  const states = [];
  const effects = [];
  let stateCursor = 0;
  let effectCursor = 0;
  let pending = [];
  let dirty = false;
  let tree;
  const child = Object.freeze({ type: "existing-order", props: Object.freeze({ step: "providers" }) });
  const react = {
    createContext(value) { return { Provider: "theme-context", initial: value }; },
    useContext() { return tree?.props.value ?? null; },
    useCallback(callback) { return callback; },
    useState(initial) {
      const index = stateCursor++;
      if (!(index in states)) states[index] = initial;
      return [states[index], (next) => {
        const value = typeof next === "function" ? next(states[index]) : next;
        if (!Object.is(states[index], value)) {
          states[index] = value;
          dirty = true;
        }
      }];
    },
    useEffect(effect, dependencies) {
      const index = effectCursor++;
      const previous = effects[index];
      if (!previous || dependencies.some((value, offset) => !Object.is(previous.dependencies[offset], value))) {
        pending.push(() => {
          previous?.cleanup?.();
          effects[index] = { dependencies, cleanup: effect() };
        });
      }
    },
  };
  const module = loadModule(providerSource, { react }, environment.globals);
  function flush() {
    let iterations = 0;
    do {
      assert.ok(++iterations < 10, "Theme effects should converge without a render loop");
      stateCursor = 0;
      effectCursor = 0;
      dirty = false;
      tree = module.ThemeProvider({ children: child });
      assert.equal(tree.props.children, child, "Theme provider must preserve the existing checkout child identity");
      const scheduled = pending;
      pending = [];
      for (const effect of scheduled) effect();
    } while (dirty);
    return tree.props.value;
  }
  return {
    ...environment,
    module,
    flush,
    preference() { return tree.props.value.preference; },
    choose(value) { tree.props.value.setPreference(value); flush(); },
    systemChange(value) { environment.systemChange(value); flush(); },
    storageChange(key, value) { environment.storageChange(key, value); flush(); },
    cleanup() { for (const effect of effects) effect.cleanup?.(); },
  };
}

function assertAppearance(environment, preference, dark) {
  assert.equal(environment.root.dataset.theme, preference);
  assert.equal(environment.classes.has("dark"), dark);
  assert.equal(environment.root.style.colorScheme, dark ? "dark" : "light");
  assert.ok(environment.classes.has("existing-class"));
  assert.equal(environment.root.dataset.existing, "retained");
}

test("theme parser accepts only the three public visual preferences", () => {
  const provider = createProvider();
  for (const value of [null, undefined, "", "system", "invalid", "DARK", "dark&paid=true", "client@example.test", { theme: "dark" }]) {
    assert.equal(provider.module.readThemePreference(value), "system");
  }
  assert.equal(provider.module.readThemePreference("light"), "light");
  assert.equal(provider.module.readThemePreference("dark"), "dark");
  assert.throws(() => provider.module.useTheme(), /within ThemeProvider/);
});

test("prepaint initialization applies saved light/dark before system preference and preserves the document", () => {
  for (const [saved, systemDark, preference, dark] of [
    ["light", true, "light", false],
    ["dark", false, "dark", true],
    [null, false, "system", false],
    [null, true, "system", true],
    ["system", true, "system", true],
    ["not-a-theme", false, "system", false],
    ["dark&paid=true", true, "system", true],
  ]) {
    const environment = createEnvironment({ saved, systemDark });
    environment.runInit();
    assertAppearance(environment, preference, dark);
    assert.deepEqual(environment.calls, [["get", "drava-theme"]], "Prepaint must never write storage");
  }
});

test("prepaint keeps working when storage is denied", () => {
  for (const systemDark of [false, true]) {
    const environment = createEnvironment({ saved: "dark", blocked: true, systemDark });
    assert.doesNotThrow(() => environment.runInit());
    assertAppearance(environment, "system", systemDark);
  }
});

test("provider hydration agrees with prepaint without overwriting saved preference", () => {
  for (const saved of [null, "light", "dark", "invalid"]) {
    for (const systemDark of [false, true]) {
      const provider = createProvider({ saved, systemDark });
      provider.runInit();
      const before = { ...provider.root.dataset };
      provider.flush();
      assert.deepEqual(provider.root.dataset, before);
      const preference = saved === "light" || saved === "dark" ? saved : "system";
      const dark = preference === "dark" || (preference === "system" && systemDark);
      assertAppearance(provider, preference, dark);
      assert.equal(provider.module.useTheme().preference, preference);
      assert.ok(provider.metas.every((meta) => meta.attributes.content === (dark ? "#0b1220" : "#ffffff")));
      assert.ok(provider.calls.every(([operation, key]) => operation === "get" && key === "drava-theme"));
      provider.cleanup();
    }
  }
});

test("manual choices store only the whitelisted theme and system removes only that key", () => {
  const provider = createProvider({ systemDark: false });
  provider.flush();
  provider.choose("dark");
  assertAppearance(provider, "dark", true);
  assert.equal(provider.stored.get("drava-theme"), "dark");
  provider.choose("light");
  assertAppearance(provider, "light", false);
  assert.equal(provider.stored.get("drava-theme"), "light");
  provider.choose("system");
  assertAppearance(provider, "system", false);
  assert.equal(provider.stored.has("drava-theme"), false);
  provider.choose("untrusted-value");
  assert.equal(provider.preference(), "system");
  assert.equal(provider.stored.get("unrelated-setting"), "unchanged");
  assert.deepEqual(provider.calls, [
    ["get", "drava-theme"], ["set", "drava-theme", "dark"],
    ["set", "drava-theme", "light"], ["remove", "drava-theme"], ["remove", "drava-theme"],
  ]);
  provider.cleanup();
});

test("system changes are live only for system preference and never overwrite explicit choices", () => {
  const provider = createProvider();
  provider.flush();
  provider.systemChange(true);
  assertAppearance(provider, "system", true);
  provider.choose("light");
  provider.systemChange(false);
  provider.systemChange(true);
  assertAppearance(provider, "light", false);
  provider.choose("dark");
  provider.systemChange(false);
  assertAppearance(provider, "dark", true);
  provider.choose("system");
  assertAppearance(provider, "system", false);
  provider.systemChange(true);
  assertAppearance(provider, "system", true);
  provider.cleanup();
});

test("storage events synchronize preference, ignore other keys and clean up all listeners", () => {
  const provider = createProvider({ systemDark: true });
  provider.flush();
  assert.equal(provider.mediaListeners.size, 1);
  assert.equal(provider.windowListeners.get("storage").size, 1);
  provider.storageChange("drava-theme", "light");
  assertAppearance(provider, "light", false);
  provider.storageChange("unrelated-setting", "dark");
  assertAppearance(provider, "light", false);
  provider.storageChange("drava-theme", "dark");
  assertAppearance(provider, "dark", true);
  provider.storageChange("drava-theme", "invalid");
  assertAppearance(provider, "system", true);
  provider.storageChange("drava-theme", "light");
  provider.storageChange(null, null);
  assertAppearance(provider, "system", true);
  assert.deepEqual(provider.calls, [["get", "drava-theme"]], "Cross-tab updates must not create a storage event write loop");
  provider.cleanup();
  assert.equal(provider.mediaListeners.size, 0);
  assert.equal(provider.windowListeners.size, 0);
});

test("storage-denied users retain in-memory theme choices and live system mode", () => {
  const provider = createProvider({ blocked: true, systemDark: true });
  assert.doesNotThrow(() => provider.flush());
  assertAppearance(provider, "system", true);
  assert.doesNotThrow(() => provider.choose("light"));
  assertAppearance(provider, "light", false);
  assert.doesNotThrow(() => provider.choose("dark"));
  assertAppearance(provider, "dark", true);
  assert.doesNotThrow(() => provider.choose("system"));
  provider.systemChange(false);
  assertAppearance(provider, "system", false);
  provider.cleanup();
});

test("the bilingual native theme selector exposes system/light/dark without mutating a checkout", () => {
  for (const language of ["fr", "en"]) {
    for (const preference of ["system", "light", "dark"]) {
      const changes = [];
      const provider = createProvider();
      const Component = loadModule(toggleSource, {
        "lucide-react": { Monitor: "monitor-icon", Sun: "sun-icon", Moon: "moon-icon" },
        "@/lib/language-context": { useLanguage: () => ({ language }) },
        "@/lib/theme-context": {
          readThemePreference: provider.module.readThemePreference,
          useTheme: () => ({ preference, setPreference: (value) => changes.push(value) }),
        },
      }, provider.globals).default;
      const tree = Component();
      const children = Array.from(tree.props.children);
      const select = children.find((child) => child.type === "select");
      const icon = children.find((child) => child.type.endsWith("-icon"));
      assert.equal(tree.type, "label");
      assert.equal(tree.props.className, "theme-toggle");
      assert.equal(icon.props["aria-hidden"], "true");
      assert.equal(icon.type, { system: "monitor-icon", light: "sun-icon", dark: "moon-icon" }[preference]);
      assert.equal(select.props["aria-label"], language === "fr" ? "Thème" : "Theme");
      assert.equal(select.props.value, preference);
      const options = Array.from(select.props.children);
      assert.deepEqual(options.map((option) => option.props.value), ["system", "light", "dark"]);
      assert.deepEqual(options.map((option) => option.props.children), language === "fr" ? ["Système", "Clair", "Sombre"] : ["System", "Light", "Dark"]);
      for (const value of ["dark", "light", "system", "untrusted-value"]) select.props.onChange({ target: { value } });
      assert.deepEqual(changes, ["dark", "light", "system", "system"]);
      assert.deepEqual(provider.calls, [], "The selector delegates preference changes without touching storage or payments");
    }
  }
});

test("root layout loads the base-path-safe prepaint script in head before the shared theme provider", () => {
  const basePathCalls = [];
  const child = { type: "existing-checkout", props: { step: "customer" } };
  const module = loadModule(layoutSource, {
    "next/font/google": {
      Inter: () => ({ variable: "font-inter" }),
      Righteous: () => ({ variable: "font-righteous" }),
    },
    "./globals.css": {},
    "@/components/payment/payment-result-mobile.css": {},
    "@/lib/base-path": {
      withBasePath(path) { basePathCalls.push(path); return `/DRAVACARD${path}`; },
    },
    "@/lib/language-context": { LanguageProvider: "language-provider" },
    "@/lib/theme-context": { ThemeProvider: "theme-provider" },
    "@/components/pwa/PwaInstallPrompt": { PwaInstallPrompt: "pwa-install-prompt" },
    "next/script": { default: "next-script" },
  }, { URL, process: { env: {} } });
  const tree = module.default({ children: child });
  assert.equal(tree.type, "html");
  assert.equal(tree.props.suppressHydrationWarning, true, "Prepaint theme attributes are intentionally applied before hydration");
  const nodes = Array.from(tree.props.children);
  assert.deepEqual(nodes.map((node) => node.type), ["head", "body"]);
  const headChildren = Array.from(nodes[0].props.children);
  const script = headChildren.find((node) => node?.type === "script");
  assert.ok(script, "The theme bootstrap must be a synchronous native head script");
  assert.equal(script.props.src, "/DRAVACARD/theme-init.js");
  assert.ok(basePathCalls.includes("/theme-init.js"));
  assert.ok(!script.props.async && !script.props.defer, "The bootstrap must run before body paint, not asynchronously");
  assert.notEqual(script.props.type, "module", "Module scripts defer and would flash the wrong saved theme");
  assert.equal(script.props.dangerouslySetInnerHTML, undefined, "Bootstrap must use the same-origin public asset");
  const bodyChildren = Array.from(nodes[1].props.children);
  const languageProvider = bodyChildren.find((node) => node.type === "language-provider");
  assert.ok(languageProvider);
  assert.equal(languageProvider.props.children.type, "theme-provider");
  const themedChildren = languageProvider.props.children.props.children;
  assert.equal(themedChildren[0], child, "One theme context wraps the unchanged page and checkout");
  assert.deepEqual(Array.from(themedChildren.slice(1), node => node.type), ["pwa-install-prompt"], "The installation prompt shares the current language and theme without replacing the page");
  assert.ok(headChildren.some(node => node?.type === "script" && node.props.src === "/DRAVACARD/pwa-install-capture.js"), "Install event capture respects the deployment base path");
  assert.equal(module.viewport.colorScheme, "light dark");
});

test("printed receipts override dark backgrounds and keep the local simulation warning visible", () => {
  const css = require("postcss").parse(receiptCss);
  const printBlocks = [];
  css.walkAtRules("media", (rule) => { if (rule.params.trim() === "print") printBlocks.push(rule); });
  assert.ok(printBlocks.length > 0, "Receipt print styles must be scoped to @media print");
  const rules = [];
  for (const block of printBlocks) block.walkRules((rule) => rules.push(rule));
  function declaration(selector, property) {
    let result;
    for (const rule of rules) {
      if (rule.selectors.includes(selector)) {
        rule.walkDecls(property, (value) => { result = value; });
      }
    }
    assert.ok(result, `Missing print declaration ${selector} { ${property} }`);
    return result;
  }
  for (const selector of [
    "html:has(.payment-receipt)", "body:has(.payment-receipt)",
    "body:has(.payment-receipt) .app-layout", "body:has(.payment-receipt) main", ".payment-receipt",
  ]) {
    assert.equal(declaration(selector, "background").value, "#fff");
    assert.equal(declaration(selector, "background").important, true);
    assert.equal(declaration(selector, "background-image").value, "none");
    assert.equal(declaration(selector, "background-image").important, true);
    assert.equal(declaration(selector, "color-scheme").value, "light");
  }
  for (const selector of [".payment-receipt", ".payment-receipt *"]) {
    assert.equal(declaration(selector, "color").value, "#111827");
    assert.equal(declaration(selector, "color").important, true);
    assert.equal(declaration(selector, "box-shadow").value, "none");
    assert.equal(declaration(selector, "text-shadow").value, "none");
  }
  assert.equal(declaration(".payment-receipt *", "background").value, "transparent");
  assert.equal(declaration(".payment-receipt *", "background-image").value, "none");
  assert.equal(declaration(".payment-receipt .payment-result-simulation", "border").important, true);
  const hidingDeclarations = { display: "none", visibility: "hidden", opacity: "0", "content-visibility": "hidden" };
  for (const rule of rules) {
    rule.walkDecls((entry) => {
      assert.notEqual(entry.value, hidingDeclarations[entry.prop], `Print rule must not hide the receipt or its simulation warning: ${rule.selector}`);
    });
  }

  function simulationPath(node, ancestors = []) {
    if (Array.isArray(node)) return node.flatMap((child) => simulationPath(child, ancestors));
    if (node == null || typeof node !== "object") return [];
    const path = [...ancestors, node];
    if (node.props.className?.split(/\s+/).includes("payment-result-simulation")) return [path];
    return simulationPath(node.props.children, path);
  }
  for (const language of ["fr", "en"]) {
    const Receipt = loadModule(receiptSource, {
      "@/components/ui/button": { Button: "button" },
      "@/lib/drava-contact": { DRAVA_CONTACT },
      "@/lib/language-context": { useLanguage: () => ({ language }) },
      "lucide-react": { CheckCircle2: "success-icon", Printer: "printer-icon" },
      "next/link": { default: "a" },
    }).default;
    const paths = simulationPath(Receipt({ amount: 5000, simulation: true }));
    assert.equal(paths.length, 1, "A local receipt must retain exactly one simulation warning");
    const path = paths[0];
    assert.equal(path.at(-1).props.children, language === "fr" ? "Simulation locale — aucun paiement réel" : "Local simulation — no real payment");
    for (const node of path) {
      assert.ok(!node.props.hidden);
      assert.notEqual(node.props["aria-hidden"], true);
      const classes = node.props.className?.split(/\s+/) ?? [];
      for (const hiddenClass of ["print:hidden", "print:invisible", "print:opacity-0", "hidden", "invisible", "dark:hidden"]) {
        assert.ok(!classes.includes(hiddenClass), `The simulation warning or its ancestor must not be hidden: ${hiddenClass}`);
      }
    }
  }
});
