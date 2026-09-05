import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const [shellSource, optionSource] = await Promise.all([
  "../src/components/ui/CheckoutShell.tsx", "../src/components/ui/CheckoutProviderOption.tsx",
].map((file) => readFile(new URL(file, import.meta.url), "utf8")));

function load(source, imports, globals = {}) {
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = vm.createContext({ exports: {}, require(name) {
    if (name === "react/jsx-runtime") return require(name);
    if (name.endsWith(".css")) return {};
    assert.ok(name in imports, `Unexpected shared presentation dependency: ${name}`);
    return imports[name];
  }, fetch() { assert.fail("Presentation must not make network requests"); }, ...globals });
  vm.runInContext(compiled, context);
  return context.exports;
}

function nodes(value) {
  if (Array.isArray(value)) return value.flatMap(nodes);
  return value && typeof value === "object" ? [value, ...nodes(value.props?.children)] : [];
}

function text(value) {
  if (Array.isArray(value)) return value.map(text).join("");
  if (value == null || typeof value === "boolean") return "";
  return typeof value === "object" ? text(value.props?.children) : String(value);
}

class TestHTMLElement {
  constructor(className = "checkout-scroll") {
    this.className = className;
    this.scrollTop = 0;
  }
  matches(selector) { return selector === `.${this.className}`; }
}

function shellModule({ language = "fr", present = true } = {}) {
  const effects = [];
  const module = load(shellSource, {
    "@/lib/language-context": { useLanguage: () => ({ language }) },
    "@radix-ui/react-dialog": Object.fromEntries(["Root", "Portal", "Overlay", "Content", "Title", "Description", "Close"].map((name) => [name, `dialog-${name}`])),
    "framer-motion": { motion: { div: "motion-div" }, useIsPresent: () => present },
    "lucide-react": { ArrowLeft: "back-icon", Check: "check-icon", X: "close-icon" },
    react: { useRef: (initial) => ({ current: initial }), useLayoutEffect: (effect) => effects.push(effect) },
  }, { HTMLElement: TestHTMLElement });
  return { ...module, effects };
}

function shellProps(overrides = {}) {
  return { open: true, onClose() {}, onBack() {}, onExitComplete() {}, title: "Votre commande", description: "Description de la commande",
    currentStep: 1, steps: ["Conditions", "Coordonnées", "Paiement"], selection: { label: "Votre sélection", name: "VISA BASIQUE", amount: "5 000 FCFA", icon: "card-icon" },
    reducedMotion: false, titleRef: { current: null }, contentRef: { current: null }, onOpenAutoFocus() {}, onCloseAutoFocus() {}, children: "product-fields", ...overrides };
}

test("cards and coins render one identical shell structure with only supplied order information changing", () => {
  const { CheckoutShell } = shellModule();
  const card = CheckoutShell(shellProps());
  const coins = CheckoutShell(shellProps({ selection: { label: "Votre pack", name: "770 pièces TikTok", amount: "7 900 FCFA", icon: "coins-icon" } }));
  const structure = (tree) => nodes(tree).map((node) => [node.type, node.props.className, node.props["data-checkout-shell"]]);
  assert.deepEqual(structure(card), structure(coins));
  for (const tree of [card, coins]) {
    for (const primitive of ["Root", "Portal", "Overlay", "Content", "Title", "Description"]) assert.equal(nodes(tree).filter((node) => node.type === `dialog-${primitive}`).length, 1);
    const content = nodes(tree).find((node) => node.type === "dialog-Content");
    assert.equal(content.props.asChild, true);
    assert.equal(nodes(tree).filter((node) => node.props["data-checkout-shell"] === "shared").length, 1);
    assert.equal(nodes(tree).filter((node) => node.props["aria-current"] === "step").length, 1);
    assert.equal(nodes(tree).find((node) => node.type === "dialog-Title").props.tabIndex, -1);
    assert.match(text(tree), /product-fields/);
  }
  assert.match(text(card), /VISA BASIQUE.*5 000 FCFA/);
  assert.match(text(coins), /770 pièces TikTok.*7 900 FCFA/);
});

test("shared dismissal controls honor busy state and delegate focus callbacks without touching data", () => {
  for (const canDismiss of [true, false]) {
    const { CheckoutShell } = shellModule({ language: "en" });
    let closed = 0;
    let back = 0;
    const props = shellProps({ canDismiss, onClose: () => closed++, onBack: () => back++ });
    const tree = CheckoutShell(props);
    const root = nodes(tree).find((node) => node.type === "dialog-Root");
    root.props.onOpenChange(true);
    assert.equal(closed, 0);
    root.props.onOpenChange(false);
    assert.equal(closed, canDismiss ? 1 : 0);
    const content = nodes(tree).find((node) => node.type === "dialog-Content");
    assert.equal(content.props.onOpenAutoFocus, props.onOpenAutoFocus);
    assert.equal(content.props.onCloseAutoFocus, props.onCloseAutoFocus);
    for (const handler of ["onEscapeKeyDown", "onInteractOutside"]) {
      let prevented = false;
      content.props[handler]({ preventDefault() { prevented = true; } });
      assert.equal(prevented, !canDismiss);
    }
    const buttons = nodes(tree).filter((node) => node.type === "button");
    assert.deepEqual(buttons.map((node) => node.props["aria-label"]), ["Back", "Close"]);
    assert.ok(buttons.every((node) => node.props.type === "button" && node.props.disabled === !canDismiss));
    if (canDismiss) buttons[0].props.onClick();
    assert.equal(back, canDismiss ? 1 : 0);
  }
});

test("only the shell's own recognized exit animation finishes a closed modal", () => {
  for (const open of [true, false]) {
    const { CheckoutShell } = shellModule();
    let finished = 0;
    const tree = CheckoutShell(shellProps({ open, onExitComplete: () => finished++ }));
    const frame = nodes(tree).find((node) => node.props["data-checkout-shell"]);
    const target = {};
    for (const animationName of ["unrelated", "checkout-dialog-enter", "checkout-mobile-enter"]) frame.props.onAnimationEnd({ target, currentTarget: target, animationName });
    frame.props.onAnimationEnd({ target: {}, currentTarget: target, animationName: "checkout-dialog-exit" });
    assert.equal(finished, 0);
    for (const animationName of ["checkout-dialog-exit", "checkout-mobile-exit"]) frame.props.onAnimationEnd({ target, currentTarget: target, animationName });
    assert.equal(finished, open ? 0 : 2);
  }
});

test("exiting panels become inert and hidden; only present checkout scrollers update saved scroll", () => {
  for (const present of [true, false]) for (const reducedMotion of [true, false]) {
    const { CheckoutPanel, CheckoutShell, effects } = shellModule({ present });
    const savedScroll = [];
    const panel = CheckoutPanel({ children: "fields", reducedMotion, scrollTop: 142, onScrollTopChange: (position) => savedScroll.push(position) });
    const scroller = new TestHTMLElement();
    const element = { inert: false, querySelector(selector) { assert.equal(selector, ".checkout-scroll"); return scroller; } };
    panel.ref.current = element;
    for (const effect of effects) effect();
    assert.equal(element.inert, !present);
    assert.equal(panel.props["aria-hidden"], present ? undefined : true);
    assert.equal(scroller.scrollTop, 142);
    scroller.scrollTop = 162;
    panel.props.onScrollCapture({ target: scroller });
    assert.deepEqual(savedScroll, present ? [162] : []);
    panel.props.onScrollCapture({ target: new TestHTMLElement("nested-scroll") });
    panel.props.onScrollCapture({ target: { scrollTop: 999, matches: () => true } });
    assert.deepEqual(savedScroll, present ? [162] : [], "nested or non-element events cannot overwrite the checkout position");
    const withoutCallback = CheckoutPanel({ children: "fields", reducedMotion });
    assert.doesNotThrow(() => withoutCallback.props.onScrollCapture({ target: scroller }));
    assert.equal(panel.props.transition.duration, reducedMotion ? 0 : 0.18);
    if (reducedMotion) {
      assert.equal(panel.props.initial.y, 0);
      assert.equal(panel.props.exit.y, 0);
    }
    const shell = CheckoutShell(shellProps({ reducedMotion }));
    assert.equal(nodes(shell).find((node) => node.props["data-checkout-shell"]).props.layout, reducedMotion ? false : "size");
  }
});

test("shared provider options only select, preserve recommendation, and disable unavailable services", () => {
  for (const language of ["fr", "en"]) for (const unavailable of [true, false]) {
    let selected = 0;
    const { CheckoutProviderOption } = load(optionSource, { "@/lib/language-context": { useLanguage: () => ({ language }) } });
    const tree = CheckoutProviderOption({ id: "leekpay", name: "LeekPay", selected: true, recommended: true, unavailable, logoSrc: "/images/leekpay.webp", onSelect: () => selected++ });
    assert.equal(tree.type, "button");
    assert.equal(tree.props.type, "button");
    assert.equal(tree.props["aria-pressed"], true);
    assert.equal(tree.props.disabled, unavailable);
    const image = nodes(tree).find((node) => node.type === "img");
    assert.equal(image.props.alt, "");
    assert.equal(image.props.src, "/images/leekpay.webp");
    assert.match(text(tree), language === "fr" ? /Recommandé/ : /Recommended/);
    if (unavailable) assert.match(text(tree), language === "fr" ? /Indisponible/ : /Unavailable/);
    else tree.props.onClick();
    assert.equal(selected, unavailable ? 0 : 1);
  }
});
