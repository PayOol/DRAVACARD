import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { cards } from "../src/lib/catalog.ts";
import {
  catalogSectionHash,
  readCatalogSection,
} from "../src/lib/catalog-section.ts";

const require = createRequire(import.meta.url);
const [homeSource, tabsSource, tiktokSource, desktopSource] = await Promise.all([
  "../src/app/page.tsx",
  "../src/components/catalog/CatalogTabs.tsx",
  "../src/components/catalog/TikTokPanel.tsx",
  "../src/components/catalog/DesktopCatalog.tsx",
].map((file) => readFile(new URL(file, import.meta.url), "utf8")));

function loadComponent(source, imports, globals = {}) {
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const context = vm.createContext({
    exports: {},
    require(name) {
      if (name === "react/jsx-runtime") return require(name);
      if (name === "./catalog-sections.css") return {};
      assert.ok(name in imports, `Unexpected dependency: ${name}`);
      return imports[name];
    },
    ...globals,
  });
  vm.runInContext(compiled, context);
  return context.exports.default;
}

function collectNodes(element) {
  if (Array.isArray(element)) return element.flatMap(collectNodes);
  if (element == null || typeof element !== "object") return [];
  return [element, ...collectNodes(element.props?.children)];
}

function textOf(element) {
  if (Array.isArray(element)) return element.map(textOf).join("");
  if (element == null || typeof element === "boolean") return "";
  return typeof element === "object"
    ? textOf(element.props?.children)
    : String(element);
}

function renderTabs({ section = "cards", language = "fr", idPrefix = "desktop" } = {}) {
  const changes = [];
  const focuses = [];
  const Component = loadComponent(tabsSource, {
    react: { useRef: (value) => ({ current: value }) },
    "@/lib/language-context": { useLanguage: () => ({ language }) },
  });
  const tree = Component({ section, idPrefix, onSectionChange: (value) => changes.push(value) });
  const tabs = collectNodes(tree).filter((node) => node.props.role === "tab");
  for (const tab of tabs) tab.ref({ focus: () => focuses.push(tab.props.id) });
  return { tree, tabs, changes, focuses };
}

function createHome({ hash = "", language = "fr" } = {}) {
  const states = [];
  const effects = [];
  const listeners = new Map();
  const pushes = [];
  const historyState = { existingNavigationState: true };
  const location = { pathname: "/DRAVACARD/", search: "", hash };
  let stateCursor = 0;
  let collectEffects = true;
  const Component = loadComponent(homeSource, {
    react: {
      useState(initial) {
        const index = stateCursor++;
        if (!(index in states)) states[index] = initial;
        return [states[index], (next) => {
          states[index] = typeof next === "function" ? next(states[index]) : next;
        }];
      },
      useEffect(effect) { if (collectEffects) effects.push(effect); },
    },
    "@/components/catalog/DesktopCatalog": { default: "desktop-catalog" },
    "@/components/catalog/MobileCatalog": { default: "mobile-catalog" },
    "@/components/layout/MainLayout": { default: "main-layout" },
    "@/components/ui/dialog-checkout": { DialogCheckout: "checkout" },
    "@/lib/catalog-section": { catalogSectionHash, readCatalogSection },
    "@/lib/language-context": { useLanguage: () => ({ language }) },
  }, {
    window: {
      location,
      history: {
        state: historyState,
        pushState(state, title, url) {
          pushes.push({ state, title, url });
          location.hash = new URL(url, "https://example.test").hash;
        },
      },
      addEventListener(name, callback) { listeners.set(name, callback); },
      removeEventListener(name, callback) {
        assert.equal(listeners.get(name), callback);
        listeners.delete(name);
      },
    },
  });
  function render() {
    stateCursor = 0;
    const tree = Component();
    const nodes = collectNodes(tree);
    const layout = nodes.find((node) => node.type === "main-layout");
    return {
      desktop: nodes.find((node) => node.type === "desktop-catalog"),
      mobile: layout.props.mobileContent,
      checkout: nodes.filter((node) => node.type === "checkout"),
    };
  }
  render();
  const cleanups = effects.map((effect) => effect());
  collectEffects = false;
  return {
    render,
    pushes,
    historyState,
    listeners,
    navigate(nextHash, event) {
      location.hash = nextHash;
      listeners.get(event)?.();
    },
    cleanup() { for (const cleanup of cleanups) cleanup?.(); },
  };
}

test("section hashes accept only the public TikTok identifier and default to cards", () => {
  assert.equal(readCatalogSection("#tiktok"), "tiktok");
  for (const hash of ["", "#cards", "#card:visa-basic", "#TikTok", "#tiktok/", "#tiktok?email=client@example.test", "#order=abc", "#simulation", "#tiktok&paid=true"]) {
    assert.equal(readCatalogSection(hash), "cards");
  }
  assert.equal(catalogSectionHash("cards"), "");
  assert.equal(catalogSectionHash("tiktok"), "#tiktok");
});

test("both language variants expose two accessible selected tabs with layout-specific IDs", () => {
  for (const language of ["fr", "en"]) {
    for (const idPrefix of ["mobile", "desktop"]) {
      for (const section of ["cards", "tiktok"]) {
        const { tree, tabs } = renderTabs({ language, idPrefix, section });
        assert.equal(tree.props.role, "tablist");
        assert.equal(tree.props["aria-orientation"], "horizontal");
        assert.equal(tree.props["aria-label"], language === "fr" ? "Nos produits" : "Our products");
        assert.equal(tabs.length, 2);
        assert.deepEqual(tabs.map(textOf), language === "fr"
          ? ["Cartes virtuelles", "Pièces TikTok"]
          : ["Virtual cards", "TikTok coins"]);
        for (const [index, value] of ["cards", "tiktok"].entries()) {
          assert.equal(tabs[index].props.type, "button");
          assert.equal(tabs[index].props.id, `${idPrefix}-tab-${value}`);
          assert.equal(tabs[index].props["aria-controls"], value === section ? `${idPrefix}-section-${value}` : undefined);
          assert.equal(tabs[index].props["aria-selected"], value === section);
          assert.equal(tabs[index].props.tabIndex, value === section ? 0 : -1);
        }
      }
    }
  }
});

test("tab arrow keys wrap and Home/End both select and focus their destination", () => {
  for (const [current, key, destination] of [
    ["cards", "ArrowRight", "tiktok"],
    ["cards", "ArrowLeft", "tiktok"],
    ["tiktok", "ArrowRight", "cards"],
    ["tiktok", "ArrowLeft", "cards"],
    ["tiktok", "Home", "cards"],
    ["cards", "End", "tiktok"],
  ]) {
    const { tabs, changes, focuses } = renderTabs({ section: current });
    let prevented = 0;
    tabs.find((tab) => tab.props["aria-selected"]).props.onKeyDown({ key, preventDefault() { prevented++; } });
    assert.equal(prevented, 1);
    assert.deepEqual(changes, [destination]);
    assert.deepEqual(focuses, [`desktop-tab-${destination}`]);
  }
});

test("tabs preserve native Tab/Enter/Space handling and pointer clicks use the shared callback", () => {
  const { tabs, changes, focuses } = renderTabs();
  for (const key of ["Tab", "Enter", " ", "ArrowUp", "Escape"]) {
    tabs[0].props.onKeyDown({ key, preventDefault() { assert.fail(`${key} must keep its native behavior`); } });
  }
  assert.deepEqual(changes, []);
  assert.deepEqual(focuses, []);
  tabs[1].props.onClick();
  assert.deepEqual(changes, ["tiktok"]);
});

test("Home owns a single section shared by mobile and desktop without storing customer data", () => {
  const home = createHome();
  let view = home.render();
  assert.equal(view.desktop.props.section, "cards");
  assert.equal(view.mobile.props.section, "cards");
  assert.equal(view.desktop.props.onSectionChange, view.mobile.props.onSectionChange);
  view.desktop.props.onSectionChange("tiktok");
  view = home.render();
  assert.equal(view.desktop.props.section, "tiktok");
  assert.equal(view.mobile.props.section, "tiktok");
  assert.equal(home.pushes.length, 1);
  assert.equal(home.pushes[0].state, home.historyState, "Tab navigation must not add any state payload");
  assert.equal(home.pushes[0].url, "/DRAVACARD/#tiktok");
  view.mobile.props.onSectionChange("tiktok");
  assert.equal(home.pushes.length, 1, "Selecting the active section must not add history entries");
  view.mobile.props.onSectionChange("cards");
  view = home.render();
  assert.equal(view.desktop.props.section, "cards");
  assert.equal(view.mobile.props.section, "cards");
  assert.equal(home.pushes[1].url, "/DRAVACARD/");
  home.cleanup();
  assert.equal(home.listeners.size, 0);
});

test("deep links and browser navigation synchronize both layouts without pushing extra history", () => {
  const home = createHome({ hash: "#tiktok" });
  for (const [hash, event, expected] of [
    ["#tiktok", "hashchange", "tiktok"],
    ["", "popstate", "cards"],
    ["#tiktok", "popstate", "tiktok"],
    ["#card:visa-basic", "hashchange", "cards"],
  ]) {
    home.navigate(hash, event);
    const view = home.render();
    assert.equal(view.desktop.props.section, expected);
    assert.equal(view.mobile.props.section, expected);
  }
  assert.deepEqual(home.pushes, []);
  home.cleanup();
});

test("a selected card retains the one shared checkout and cannot be replaced by a section change", () => {
  const home = createHome();
  let view = home.render();
  assert.equal(view.desktop.props.onSelect, view.mobile.props.onSelect);
  const card = cards[0];
  view.mobile.props.onSelect(card);
  view = home.render();
  assert.equal(view.checkout.length, 1);
  assert.equal(view.checkout[0].props.card.id, card.id);
  assert.equal(view.checkout[0].props.card.name, card.name.fr);
  assert.equal(view.checkout[0].props.card.amount, Number.parseInt(card.price, 10));
  view.desktop.props.onSectionChange("tiktok");
  view = home.render();
  assert.equal(view.desktop.props.section, "cards");
  assert.equal(view.mobile.props.section, "cards");
  assert.equal(view.checkout.length, 1);
  assert.deepEqual(home.pushes, []);
  view.checkout[0].props.onClose();
  assert.equal(home.render().checkout.length, 0);
  home.cleanup();
});

test("TikTok has a bilingual preparation page without fabricated offers, forms, external links or payment actions", () => {
  for (const language of ["fr", "en"]) {
    const Component = loadComponent(tiktokSource, {
      "@/lib/language-context": { useLanguage: () => ({ language }) },
      "lucide-react": { Coins: "coins-icon" },
    });
    const tree = Component();
    const nodes = collectNodes(tree);
    const headings = nodes.filter((node) => node.type === "h1");
    assert.equal(headings.length, 1);
    assert.equal(headings[0].props.tabIndex, -1);
    assert.equal(textOf(headings[0]), language === "fr" ? "Pièces TikTok" : "TikTok coins");
    assert.match(textOf(tree), language === "fr" ? /Bientôt disponible.*Les offres seront ajoutées prochainement/s : /Coming soon.*Offers will be added soon/s);
    assert.equal(nodes.some((node) => ["form", "input", "select", "textarea", "button", "a"].includes(node.type)), false);
    assert.doesNotMatch(textOf(tree), /\b(?:Fcfa|FCFA|XOF|USD|EUR)\b|https?:\/\//);
  }
});

test("desktop intro keeps the original description on the left and important note on the right in both languages", () => {
  const expectedCopy = {
    fr: [
      "Choisissez la carte qui correspond à vos besoins et commencez à effectuer des paiements en ligne en toute sécurité.",
      "Note importante: Les cartes ne sont pas acceptées sur les sites de cryptomonnaies, les plateformes de paris sportifs comme Bet9ja, Wise, et les sites pour adultes.",
    ],
    en: [
      "Choose the card that matches your needs and start making secure online payments.",
      "Important note: Cards are not accepted on cryptocurrency sites, sports betting platforms like Bet9ja, Wise, and adult sites.",
    ],
  };
  for (const language of ["fr", "en"]) {
    const Component = loadComponent(desktopSource, {
      "@/components/catalog/MobileTransitions": { CatalogCardTransition: "card-transition" },
      "@/components/catalog/CatalogSectionPanel": { default: "section-panel" },
      "@/components/catalog/CatalogTabs": { default: "catalog-tabs" },
      "@/components/catalog/TikTokPanel": { default: "tiktok-panel" },
      "@/components/catalog/RecommendedBadge": { default: "recommended-badge" },
      "@/components/ui/button": { Button: "button" },
      "@/lib/base-path": { withBasePath: (path) => path },
      "@/lib/catalog": { cards },
      "@/lib/language-context": { useLanguage: () => ({ language }) },
      "framer-motion": { AnimatePresence: "animate-presence", useReducedMotion: () => false },
      "lucide-react": Object.fromEntries(["Check", "Clock", "CreditCard", "Shield", "X", "Zap"].map((name) => [name, `${name}-icon`])),
    });
    const tree = Component({ section: "cards", onSelect() {}, onSectionChange() {} });
    const rows = collectNodes(tree).filter((node) => node.props["data-catalog-intro-row"] === true);
    assert.equal(rows.length, 1);
    const row = rows[0];
    for (const className of ["grid", "grid-cols-2", "items-center", "text-left"]) {
      assert.ok(row.props.className.split(/\s+/).includes(className), `The intro row must retain ${className}`);
    }
    const children = Array.from(row.props.children);
    assert.equal(children.length, 2, "Both intro elements must share the same two-column row");
    assert.equal(children[0].type, "p", "Description must be the left-hand element");
    assert.equal(children[1].type, "div", "Important note must be the right-hand element");
    assert.deepEqual(children.map(textOf), expectedCopy[language]);
    assert.ok(children.every((node) => node.props.className.split(/\s+/).includes("min-w-0")));
    assert.match(children[1].props.className, /\bborder-red-200\b/);
  }
});
