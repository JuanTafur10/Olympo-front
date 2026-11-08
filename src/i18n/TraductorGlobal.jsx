import { useEffect } from "react";
import { useContextoApp } from "../context/contexto_app";
import { traducirTexto } from "./traducciones";

const textosOriginales = new WeakMap();
const atributosOriginales = new WeakMap();
const atributosTraducibles = ["title", "aria-label", "placeholder", "alt", "value"];
const tagsIgnorados = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE"]);

const debeIgnorar = (elemento) =>
  !elemento ||
  tagsIgnorados.has(elemento.tagName) ||
  elemento.closest?.("[data-no-traducir]");

function traducirNodoTexto(nodo, idioma) {
  const padre = nodo.parentElement;
  if (debeIgnorar(padre) || !String(nodo.nodeValue || "").trim()) return;

  if (!textosOriginales.has(nodo)) {
    textosOriginales.set(nodo, nodo.nodeValue);
  }

  const original = textosOriginales.get(nodo);
  const siguiente = idioma === "es" ? original : traducirTexto(original, idioma);

  if (nodo.nodeValue !== siguiente) {
    nodo.nodeValue = siguiente;
  }
}

function traducirAtributos(elemento, idioma) {
  if (debeIgnorar(elemento)) return;

  atributosTraducibles.forEach((atributo) => {
    if (!elemento.hasAttribute?.(atributo)) return;
    if (atributo === "value" && !["BUTTON", "INPUT"].includes(elemento.tagName)) return;
    if (atributo === "value" && elemento.tagName === "INPUT" && !["button", "submit", "reset"].includes(elemento.type)) return;

    let originales = atributosOriginales.get(elemento);
    if (!originales) {
      originales = {};
      atributosOriginales.set(elemento, originales);
    }

    if (!Object.prototype.hasOwnProperty.call(originales, atributo)) {
      originales[atributo] = elemento.getAttribute(atributo);
    }

    const original = originales[atributo];
    const siguiente = idioma === "es" ? original : traducirTexto(original, idioma);
    if (elemento.getAttribute(atributo) !== siguiente) {
      elemento.setAttribute(atributo, siguiente);
    }
  });
}

function recorrer(root, idioma) {
  if (!root) return;

  if (root.nodeType === Node.TEXT_NODE) {
    traducirNodoTexto(root, idioma);
    return;
  }

  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) {
    return;
  }

  if (root.nodeType === Node.ELEMENT_NODE) {
    traducirAtributos(root, idioma);
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      if (node.nodeType === Node.ELEMENT_NODE && tagsIgnorados.has(node.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let nodo = walker.nextNode();
  while (nodo) {
    if (nodo.nodeType === Node.TEXT_NODE) {
      traducirNodoTexto(nodo, idioma);
    } else {
      traducirAtributos(nodo, idioma);
    }
    nodo = walker.nextNode();
  }
}

export default function TraductorGlobal() {
  const { configuracion_global } = useContextoApp();
  const idioma = configuracion_global?.idioma || "es";

  useEffect(() => {
    document.documentElement.lang = idioma;
    recorrer(document.body, idioma);

    const observer = new MutationObserver((mutaciones) => {
      mutaciones.forEach((mutacion) => {
        mutacion.addedNodes.forEach((nodo) => recorrer(nodo, idioma));
        if (mutacion.type === "characterData" || mutacion.type === "attributes") {
          recorrer(mutacion.target, idioma);
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: atributosTraducibles,
    });

    return () => observer.disconnect();
  }, [idioma]);

  return null;
}
