import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, collection, query, where, limit, getDocs, arrayUnion, arrayRemove, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC0JKLRPv9O6-ks7bvEqjJkkz86FGk9lko",
  authDomain: "mi-paina-web.firebaseapp.com",
  projectId: "mi-paina-web",
  storageBucket: "mi-paina-web.firebasestorage.app",
  messagingSenderId: "450612910890",
  appId: "1:450612910890:web:8a373a3e4b40872e825c53"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ---------------- Insignias ---------------- */
export const INSIGNIAS = {
  bienvenida: { emoji: "🚀", titulo: "Primer paso", desc: "Entraste a MAPFIT por primera vez." },
  registro: { emoji: "📝", titulo: "Primer registro", desc: "Ingresaste tu correo y tus datos." },
  ficha: { emoji: "🩺", titulo: "Primera ficha", desc: "Guardaste tu ficha de salud." },
  mensaje: { emoji: "💬", titulo: "Primer llamado", desc: "Nos enviaste tu primer mensaje." },
  constante: { emoji: "🔥", titulo: "Constante", desc: "Volviste a MAPFIT en otro día." },
  rutina: { emoji: "💪", titulo: "Primera sesión", desc: "Marcaste tu primera sesión de rutina." },
  semana: { emoji: "🏆", titulo: "Semana completa", desc: "Cumpliste todas las sesiones de una semana." }
};
const ORDEN = Object.keys(INSIGNIAS);

/* ---------------- Sesión anónima (una sola por navegador) ---------------- */
let promesaSesion = null;
export function sesion() {
  if (!promesaSesion) {
    promesaSesion = new Promise((resolve, reject) => {
      const stop = onAuthStateChanged(auth, async (u) => {
        stop();
        if (u) return resolve(u);
        try {
          const cred = await signInAnonymously(auth);
          resolve(cred.user);
        } catch (e) {
          promesaSesion = null;
          reject(e);
        }
      });
    });
  }
  return promesaSesion;
}

function hoyLocal() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

/* ---------------- Base de datos ---------------- */
async function leerPerfil(uid) {
  const snap = await getDoc(doc(db, "perfiles", uid));
  return snap.exists() ? snap.data() : null;
}

export async function otorgar(id, extra) {
  extra = extra || {};
  if (!INSIGNIAS[id]) return false;
  try {
    const u = await sesion();
    const ref = doc(db, "perfiles", u.uid);
    const actual = await leerPerfil(u.uid);
    const ya = !!(actual && Array.isArray(actual.insignias) && actual.insignias.includes(id));
    if (ya && Object.keys(extra).length === 0) return false;

    const datos = Object.assign({}, extra, { actualizado: serverTimestamp() });
    if (!actual) datos.creado = serverTimestamp();
    if (!ya) datos.insignias = arrayUnion(id);
    await setDoc(ref, datos, { merge: true });

    if (!ya) mostrarToast(INSIGNIAS[id]);
    return !ya;
  } catch (e) {
    console.error("Insignias:", e);
    return false;
  }
}

export async function iniciarPerfil() {
  try {
    const u = await sesion();
    const actual = await leerPerfil(u.uid);
    const dias = actual && Array.isArray(actual.dias) ? actual.dias : [];
    const hoy = hoyLocal();
    const nuevoDia = !dias.includes(hoy);

    await otorgar("bienvenida", nuevoDia ? { dias: arrayUnion(hoy) } : {});
    const total = dias.length + (nuevoDia ? 1 : 0);
    if (total >= 2) await otorgar("constante");
  } catch (e) {
    console.error("Perfil:", e);
  }
}

async function cargarTodo() {
  const u = await sesion();
  const resultados = await Promise.all([
    leerPerfil(u.uid),
    getDocs(query(collection(db, "fichas"), where("uid", "==", u.uid), limit(20)))
  ]);
  let ficha = null;
  let mejor = -1;
  resultados[1].forEach((d) => {
    const x = d.data();
    const t = x.fecha && x.fecha.seconds ? x.fecha.seconds : 0;
    if (t > mejor) { mejor = t; ficha = x; }
  });
  return { perfil: resultados[0] || {}, ficha: ficha };
}

/* ---------------- Interfaz ---------------- */
const CSS = `
html.pf-open,html.pf-open body{overflow:hidden}
.pf-overlay{position:fixed;inset:0;z-index:15000;display:flex;justify-content:flex-end;background:rgba(1,7,32,.72);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);animation:pfFade .25s ease both}
.pf-overlay[hidden]{display:none}
.pf-panel{position:relative;width:min(520px,100%);height:100%;display:flex;flex-direction:column;color:#fff;text-align:left;background:radial-gradient(420px circle at 100% 0%,rgba(52,211,153,.14),transparent 62%),linear-gradient(165deg,#0A2152 0%,#041637 55%,#010720 100%);border-left:2px solid rgba(219,226,234,.45);box-shadow:-20px 0 60px rgba(0,0,0,.55);animation:pfSlide .3s cubic-bezier(.2,.8,.2,1) both}
.pf-head{display:flex;align-items:center;gap:14px;padding:max(18px,env(safe-area-inset-top)) 18px 16px;border-bottom:1.5px solid rgba(219,226,234,.25);background:linear-gradient(180deg,rgba(26,77,148,.55),rgba(4,22,55,.2))}
.pf-avatar{flex:none;width:58px;height:58px;border-radius:50%;display:grid;place-items:center;font-size:1.6rem;font-weight:900;color:#fff;background:linear-gradient(135deg,#F97316,#F25C19);box-shadow:0 0 0 3px rgba(226,232,240,.7),0 0 0 8px rgba(52,211,153,.16)}
.pf-quien{flex:1;min-width:0}
.pf-quien h2{margin:0;font-size:1.3rem;line-height:1.2;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pf-quien p{margin:2px 0 0;font-size:.92rem;color:rgba(255,255,255,.75);text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pf-x{flex:none;display:grid;place-items:center;box-sizing:border-box;width:44px;height:44px;min-width:44px;margin:0;padding:0;border-radius:50%;border:1.5px solid rgba(219,226,234,.55);background:rgba(255,255,255,.08);color:#fff;line-height:1;text-align:center;text-align-last:center;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform .25s,border-color .2s,box-shadow .2s}
.pf-x svg{display:block;width:18px;height:18px;stroke:currentColor;stroke-width:2.6;fill:none;stroke-linecap:round;pointer-events:none}
.pf-x:hover{transform:rotate(90deg)}
.pf-x:hover,.pf-x:focus-visible{border-color:#34D399;box-shadow:0 0 16px rgba(52,211,153,.5);outline:none}
.pf-body{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:18px 18px max(24px,env(safe-area-inset-bottom))}
.pf-sec{margin:0 0 22px}
.pf-sec h3{margin:0 0 10px;font-size:1.05rem;letter-spacing:.02em;text-align:left;color:#A9D3C5}
.pf-sec h3::before{content:"";display:inline-block;width:4px;height:1em;margin-right:8px;border-radius:4px;vertical-align:-.15em;background:linear-gradient(#F97316,#34D399)}
.pf-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}
.pf-stat{padding:10px 6px;border-radius:14px;text-align:center;background:rgba(255,255,255,.06);border:1px solid rgba(219,226,234,.2)}
.pf-stat b{display:block;font-size:1.25rem;line-height:1.2;color:#fff}
.pf-stat span{font-size:.78rem;color:rgba(255,255,255,.7)}
.pf-barra{height:10px;border-radius:10px;background:rgba(255,255,255,.12);overflow:hidden}
.pf-barra span{display:block;height:100%;border-radius:10px;background:linear-gradient(90deg,#F97316,#f4f7fb,#34D399);transition:width .6s ease}
.pf-nota{margin:8px 0 0;font-size:.92rem;color:rgba(255,255,255,.8);text-align:left}
.pf-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.pf-ins{padding:14px 12px;border-radius:18px;text-align:center;border:1.5px solid rgba(219,226,234,.3);background:rgba(255,255,255,.06)}
.pf-ins .e{display:grid;place-items:center;width:54px;height:54px;margin:0 auto 8px;border-radius:50%;font-size:1.7rem;line-height:1;background:rgba(255,255,255,.08)}
.pf-ins.on .e{background:linear-gradient(135deg,rgba(52,211,153,.35),rgba(249,115,22,.3));box-shadow:0 0 18px rgba(52,211,153,.35)}
.pf-ins b{display:block;font-size:.98rem;line-height:1.25}
.pf-ins small{display:block;margin-top:4px;font-size:.8rem;line-height:1.35;color:rgba(255,255,255,.75)}
.pf-ins.on{border-color:#34D399;background:linear-gradient(160deg,rgba(52,211,153,.18),rgba(255,255,255,.05));box-shadow:0 0 22px rgba(52,211,153,.25)}
.pf-ins.off{opacity:.55}
.pf-ins.off .e{filter:grayscale(1)}
.pf-ins .ok{margin-top:6px;font-size:.78rem;font-weight:800;color:#34D399}
.pf-dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:8px 14px}
.pf-dl dt{font-weight:800;font-size:.9rem;color:#ffd2b0;text-align:left}
.pf-dl dd{margin:0;font-size:.98rem;text-align:left;overflow-wrap:anywhere}
.pf-dl dt,.pf-dl dd{padding-bottom:8px;border-bottom:1px solid rgba(219,226,234,.12)}
.pf-btn{display:inline-block;margin-top:12px;padding:12px 22px;border-radius:999px;border:2px solid transparent;font:inherit;font-weight:800;color:#fff;text-decoration:none;cursor:pointer;background:linear-gradient(135deg,#F97316,#F25C19) padding-box,linear-gradient(135deg,#fff,#9aa7b5 50%,#fff) border-box}
.pf-btn:hover,.pf-btn:focus-visible{filter:brightness(1.1);box-shadow:0 0 28px rgba(249,115,22,.6);outline:none}
.pf-vacio{padding:16px;border-radius:16px;background:rgba(255,255,255,.06);border:1.5px dashed rgba(219,226,234,.35);font-size:.95rem;text-align:left}
.pf-error{padding:14px;border-radius:14px;background:rgba(192,57,43,.25);border:1.5px solid #FF8A80;font-size:.95rem;text-align:left}
.pf-toast{position:fixed;left:50%;bottom:max(24px,env(safe-area-inset-bottom));z-index:30000;display:flex;align-items:center;gap:12px;max-width:min(92vw,420px);padding:14px 20px;border-radius:18px;color:#fff;font:700 .98rem/1.3 sans-serif;text-align:left;background:linear-gradient(135deg,#0F766E,#0A2152);border:2px solid #34D399;box-shadow:0 14px 40px rgba(0,0,0,.5),0 0 30px rgba(52,211,153,.4);transform:translate(-50%,30px);opacity:0;pointer-events:none;transition:transform .35s cubic-bezier(.2,.9,.3,1.3),opacity .3s}
.pf-toast.show{transform:translate(-50%,0);opacity:1}
.pf-toast .e{font-size:1.8rem;line-height:1}
.pf-ciclo{display:flex;gap:8px;margin:0 0 10px}
.pf-ciclo button{flex:1;padding:9px 8px;border-radius:999px;border:1.5px solid rgba(219,226,234,.4);background:rgba(255,255,255,.06);color:#fff;font:inherit;font-weight:800;cursor:pointer;text-align:center;text-align-last:center}
.pf-ciclo button.sel{border-color:#ffd2b0;background:linear-gradient(135deg,#F97316,#F25C19)}
.pf-planes{display:grid;gap:8px}
.pf-plan{display:flex;justify-content:space-between;align-items:center;gap:10px;width:100%;box-sizing:border-box;padding:12px 14px;border-radius:14px;border:1.5px solid rgba(219,226,234,.3);background:rgba(255,255,255,.06);color:#fff;font:inherit;text-align:left;text-align-last:left;cursor:pointer}
.pf-plan span{font-weight:800;color:#ffd2b0;white-space:nowrap}
.pf-plan.sel{border-color:#F97316;background:rgba(249,115,22,.16);box-shadow:0 0 18px rgba(249,115,22,.3)}
.pf-salir{width:100%;padding:12px;border-radius:999px;border:1.5px solid #FF8A80;background:rgba(192,57,43,.18);color:#fff;font:inherit;font-weight:800;cursor:pointer;text-align:center;text-align-last:center}
.pf-salir:hover,.pf-salir:focus-visible{background:rgba(192,57,43,.38);outline:none}
.pf-top{display:flex;align-items:center;gap:16px;margin-bottom:16px}
.pf-anillo{position:relative;flex:none;width:96px;height:96px}
.pf-anillo svg{width:96px;height:96px;transform:rotate(-90deg)}
.pf-anillo circle{fill:none;stroke-width:9}
.pf-anillo .fondo{stroke:rgba(255,255,255,.14)}
.pf-anillo .avance{stroke-linecap:round;transition:stroke-dashoffset 1s ease}
.pf-anillo b{position:absolute;inset:0;display:grid;place-items:center;font-size:1.35rem}
.pf-top-txt b{display:block;font-size:1.1rem}
.pf-top-txt span{display:block;font-size:.9rem;color:rgba(255,255,255,.8)}
.pf-top-txt small{display:block;margin-top:6px;font-size:.8rem;line-height:1.35;color:#A9D3C5}
.pf-ruta{position:relative;display:flex;justify-content:space-between;margin:6px 0 18px}
.pf-ruta::before{content:"";position:absolute;left:8%;right:8%;top:19px;border-top:3px dotted rgba(249,115,22,.6)}
.pf-nodo{position:relative;flex:1;min-width:0;text-align:center}
.pf-pt{display:grid;place-items:center;width:38px;height:38px;margin:0 auto 6px;border-radius:50%;background:#0A2152;border:2px solid rgba(219,226,234,.4);font-size:1.05rem;filter:grayscale(1);opacity:.7}
.pf-nodo.on .pf-pt{background:linear-gradient(135deg,#F97316,#F25C19);border-color:#ffd2b0;color:#fff;font-weight:900;filter:none;opacity:1;box-shadow:0 0 16px rgba(249,115,22,.55)}
.pf-nodo small{display:block;font-size:.68rem;line-height:1.2;color:rgba(255,255,255,.75)}
.pf-rd{display:flex;align-items:center;gap:10px;padding:9px 10px;margin-bottom:6px;border-radius:14px;border:1.5px solid rgba(219,226,234,.2);background:rgba(255,255,255,.05)}
.pf-rd.hoy{border-color:#F97316;background:rgba(249,115,22,.12)}
.pf-rd.fut{opacity:.5}
.pf-rd .d{flex:none;width:58px;font-weight:800;font-size:.85rem;text-align:left}
.pf-rd .s{flex:1;min-width:0;font-size:.88rem;text-align:left;overflow-wrap:anywhere}
.pf-rd .s small{display:block;color:rgba(255,255,255,.6);font-size:.72rem}
.pf-chk{flex:none;display:grid;place-items:center;box-sizing:border-box;width:34px;height:34px;padding:0;border-radius:50%;border:2px solid rgba(219,226,234,.5);background:transparent;color:#fff;font:inherit;font-size:1rem;cursor:pointer}
.pf-chk.on{border-color:#34D399;background:linear-gradient(135deg,#34D399,#0F766E)}
.pf-chk:disabled{cursor:default}
.pf-sem4{display:flex;align-items:stretch;justify-content:space-between;gap:10px;height:96px;margin:12px 0 14px}
.pf-b4{flex:1;display:flex;flex-direction:column;align-items:center;font-size:.7rem;line-height:1.25;color:rgba(255,255,255,.75);text-align:center}
.pf-b4 .t{flex:1;display:flex;align-items:flex-end;width:100%}
.pf-b4 i{display:block;width:100%;min-height:4px;border-radius:8px 8px 3px 3px;background:linear-gradient(180deg,#F97316,#F25C19)}
.pf-b4 b{color:#fff}
@keyframes pfFade{from{opacity:0}to{opacity:1}}
@keyframes pfSlide{from{transform:translateX(40px);opacity:0}to{transform:none;opacity:1}}
@media (max-width:560px){.pf-panel{border-left:0}.pf-grid{gap:8px}}
@media (prefers-reduced-motion:reduce){.pf-overlay,.pf-panel{animation:none}.pf-toast{transition:none}}
`;

function el(tag, cls, texto) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (texto != null) n.textContent = texto;
  return n;
}

let overlay = null;
let cuerpo = null;
let avatar = null;
let titulo = null;
let correoEl = null;
let abridor = null;
let toastEl = null;
let toastTimer = null;

function construir() {
  if (overlay) return;
  const st = document.createElement("style");
  st.textContent = CSS;
  document.head.appendChild(st);

  overlay = el("div", "pf-overlay");
  overlay.hidden = true;
  const panel = el("aside", "pf-panel");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", "pfTitulo");

  const head = el("header", "pf-head");
  avatar = el("div", "pf-avatar", "?");
  const quien = el("div", "pf-quien");
  titulo = el("h2", null, "Mi perfil");
  titulo.id = "pfTitulo";
  correoEl = el("p", null, "");
  quien.appendChild(titulo);
  quien.appendChild(correoEl);
  const cerrar = el("button", "pf-x");
  cerrar.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  cerrar.type = "button";
  cerrar.setAttribute("aria-label", "Cerrar perfil");
  cerrar.addEventListener("click", cerrarPerfil);
  head.appendChild(avatar);
  head.appendChild(quien);
  head.appendChild(cerrar);

  cuerpo = el("div", "pf-body");
  panel.appendChild(head);
  panel.appendChild(cuerpo);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (e) => { if (e.target === overlay) cerrarPerfil(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !overlay.hidden) cerrarPerfil(); });

  toastEl = el("div", "pf-toast");
  toastEl.setAttribute("role", "status");
  toastEl.setAttribute("aria-live", "polite");
  document.body.appendChild(toastEl);
}

function mostrarToast(ins, cabecera) {
  construir();
  toastEl.textContent = "";
  toastEl.appendChild(el("span", "e", ins.emoji));
  const t = el("span", null, "");
  t.appendChild(document.createTextNode(cabecera || "¡Nueva insignia!"));
  t.appendChild(document.createElement("br"));
  t.appendChild(el("span", null, ins.titulo));
  toastEl.appendChild(t);
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 4500);
}

function fila(dl, k, v) {
  if (v == null || v === "") return;
  dl.appendChild(el("dt", null, k));
  dl.appendChild(el("dd", null, String(v)));
}

const NIVELES = ["Recién llegado", "Primer paso dado", "En camino", "Avanzando", "Buen ritmo", "Casi en la meta", "A un paso de la meta", "¡Ruta completa!"];

function claveFecha(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function anillo(pct, idGrad) {
  const c = 2 * Math.PI * 38;
  const w = el("div", "pf-anillo");
  w.innerHTML = '<svg viewBox="0 0 96 96" aria-hidden="true"><defs><linearGradient id="' + idGrad + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F97316"/><stop offset="1" stop-color="#34D399"/></linearGradient></defs>'
    + '<circle class="fondo" cx="48" cy="48" r="38"/>'
    + '<circle class="avance" cx="48" cy="48" r="38" stroke="url(#' + idGrad + ')" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + c.toFixed(1) + '"/></svg>';
  w.appendChild(el("b", null, pct + "%"));
  const arco = w.querySelector(".avance");
  requestAnimationFrame(() => requestAnimationFrame(() => { arco.style.strokeDashoffset = (c * (1 - pct / 100)).toFixed(1); }));
  return w;
}

const DIAS_LARGOS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const PATRON = { 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 5], 5: [0, 1, 2, 3, 4] };
const SESIONES_TIPO = {
  "Bajar de peso": ["Caminata rápida 30 min", "Fuerza suave 25 min", "Cardio ligero 30 min", "Movilidad 15 min", "Caminata 40 min"],
  "Controlar mi glucosa o presión": ["Caminata suave 30 min", "Estiramientos y respiración 15 min", "Caminata suave 30 min", "Fuerza ligera 20 min", "Caminata 30 min"],
  "Ganar constancia con el ejercicio": ["Caminata 20 min", "Fuerza básica 20 min", "Movilidad 15 min", "Cardio ligero 20 min", "Caminata 30 min"],
  "Mejorar mi alimentación": ["Caminata 20 min", "Movilidad 15 min", "Fuerza básica 20 min", "Caminata 25 min", "Estiramientos 15 min"],
  "Mantener mis resultados actuales": ["Cardio 30 min", "Fuerza 30 min", "Movilidad 20 min", "Cardio 30 min", "Fuerza 30 min"]
};
const SESIONES_BASE = SESIONES_TIPO["Ganar constancia con el ejercicio"];

function metaSemanal(plan, actividad) {
  const porPlan = { "Básico": 3, "Recuperación": 4, "Bienestar total": 5 };
  if (porPlan[plan]) return porPlan[plan];
  const a = actividad || "";
  if (a.indexOf("Alta") === 0) return 5;
  if (a.indexOf("Moderada") === 0) return 4;
  if (a.indexOf("Baja") === 0) return 3;
  if (a.indexOf("Casi nula") === 0) return 2;
  return 3;
}

function sumarDias(f, n) {
  return new Date(f.getFullYear(), f.getMonth(), f.getDate() + n);
}

function lunesDe(f) {
  return sumarDias(f, -((f.getDay() + 6) % 7));
}

function contarSemana(lista, lunes) {
  let n = 0;
  for (let i = 0; i < 7; i++) if (lista.includes(claveFecha(sumarDias(lunes, i)))) n++;
  return n;
}

function semanasSeguidas(lista, meta, lunes) {
  let racha = contarSemana(lista, lunes) >= meta ? 1 : 0;
  let lun = sumarDias(lunes, -7);
  while (racha < 520 && contarSemana(lista, lun) >= meta) {
    racha++;
    lun = sumarDias(lun, -7);
  }
  return racha;
}

async function marcarSesion(perfil, ficha, clave, hecha, msg) {
  msg.textContent = "";
  try {
    const u = await sesion();
    const datos = { sesiones: hecha ? arrayUnion(clave) : arrayRemove(clave), actualizado: serverTimestamp() };
    if (!perfil || Object.keys(perfil).length === 0) datos.creado = serverTimestamp();
    await setDoc(doc(db, "perfiles", u.uid), datos, { merge: true });

    const lista = Array.isArray(perfil.sesiones) ? perfil.sesiones.slice() : [];
    const i = lista.indexOf(clave);
    if (hecha && i < 0) lista.push(clave);
    if (!hecha && i >= 0) lista.splice(i, 1);
    perfil.sesiones = lista;

    if (hecha) {
      const plan = perfil.plan || (ficha && ficha.plan);
      const meta = metaSemanal(plan, ficha && ficha.actividad);
      const nuevas = [];
      if (await otorgar("rutina")) nuevas.push("rutina");
      if (contarSemana(lista, lunesDe(new Date())) >= meta && (await otorgar("semana"))) nuevas.push("semana");
      if (nuevas.length) perfil.insignias = (Array.isArray(perfil.insignias) ? perfil.insignias : []).concat(nuevas);
    }
    return true;
  } catch (e) {
    console.error("Rutina:", e);
    msg.textContent = "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.";
    return false;
  }
}

function seccionRutina(perfil, ficha) {
  const sec = el("section", "pf-sec");
  sec.appendChild(el("h3", null, "Mi rutina de la semana"));

  const plan = perfil.plan || (ficha && ficha.plan) || "";
  const meta = metaSemanal(plan, ficha && ficha.actividad);
  const plan7 = PATRON[meta] || PATRON[3];
  const tipos = SESIONES_TIPO[ficha && ficha.objetivo] || SESIONES_BASE;
  const lista = Array.isArray(perfil.sesiones) ? perfil.sesiones : [];
  const hoy = new Date();
  const hoyClave = claveFecha(hoy);
  const lunes = lunesDe(hoy);
  const hechas = contarSemana(lista, lunes);
  const pct = Math.min(100, Math.round((hechas / meta) * 100));

  const arriba = el("div", "pf-top");
  arriba.appendChild(anillo(pct, "pfgRut"));
  const t = el("div", "pf-top-txt");
  t.appendChild(el("b", null, hechas + " de " + meta + " sesiones"));
  t.appendChild(el("span", null, pct >= 100 ? "¡Meta de la semana cumplida!" : "Te faltan " + (meta - hechas) + " esta semana"));
  t.appendChild(el("small", null, "Meta según tu " + (plan ? "plan " + plan : "nivel de actividad") + (ficha && ficha.objetivo ? " · Objetivo: " + ficha.objetivo : "")));
  arriba.appendChild(t);
  sec.appendChild(arriba);

  const msg = el("p", "pf-nota", "");
  for (let i = 0; i < 7; i++) {
    const f = sumarDias(lunes, i);
    const clave = claveFecha(f);
    const k = plan7.indexOf(i);
    const futuro = clave > hoyClave;
    const hecha = lista.includes(clave);
    const fila = el("div", "pf-rd" + (clave === hoyClave ? " hoy" : "") + (futuro ? " fut" : ""));
    fila.appendChild(el("span", "d", DIAS_LARGOS[i] + " " + f.getDate()));
    const s = el("span", "s", k >= 0 ? tipos[k % tipos.length] : "Descanso activo");
    if (k < 0) s.appendChild(el("small", null, "Opcional: marca si te moviste"));
    fila.appendChild(s);
    const b = el("button", "pf-chk" + (hecha ? " on" : ""), hecha ? "✓" : "");
    b.type = "button";
    b.disabled = futuro;
    b.setAttribute("aria-label", (hecha ? "Desmarcar " : "Marcar como hecha ") + DIAS_LARGOS[i] + " " + f.getDate());
    b.addEventListener("click", async () => {
      b.disabled = true;
      const ok = await marcarSesion(perfil, ficha, clave, !hecha, msg);
      if (ok) {
        const y = cuerpo.scrollTop;
        pintar(perfil, ficha);
        cuerpo.scrollTop = y;
      } else {
        b.disabled = false;
      }
    });
    fila.appendChild(b);
    sec.appendChild(fila);
  }
  sec.appendChild(msg);

  const nombres = ["Hace 3", "Hace 2", "Pasada", "Esta"];
  const sem4 = el("div", "pf-sem4");
  for (let w = 3; w >= 0; w--) {
    const n = contarSemana(lista, sumarDias(lunes, -7 * w));
    const col = el("div", "pf-b4");
    const caja = el("div", "t");
    const barra = document.createElement("i");
    barra.style.height = Math.min(100, Math.round((n / meta) * 100)) + "%";
    caja.appendChild(barra);
    col.appendChild(caja);
    col.appendChild(el("b", null, n + "/" + meta));
    col.appendChild(el("span", null, nombres[3 - w]));
    sem4.appendChild(col);
  }
  sec.appendChild(sem4);

  const stats = el("div", "pf-stats");
  [[semanasSeguidas(lista, meta, lunes), "Semanas seguidas"], [lista.length, "Sesiones totales"], [meta + "/sem", "Tu meta"]].forEach((x) => {
    const c = el("div", "pf-stat");
    c.appendChild(el("b", null, String(x[0])));
    c.appendChild(el("span", null, x[1]));
    stats.appendChild(c);
  });
  sec.appendChild(stats);
  sec.appendChild(el("p", "pf-nota", "Es una guía general. Si tienes presión alta, glucosa elevada o alguna lesión, consulta a tu médico antes de cambiar tu rutina."));
  return sec;
}

function pintar(perfil, ficha) {
  cuerpo.textContent = "";
  const nombre = [perfil.nombre, perfil.apellido].filter(Boolean).join(" ");
  titulo.textContent = nombre || "Mi perfil";
  correoEl.textContent = perfil.correo || "Aún sin registrar";
  avatar.textContent = (nombre || perfil.correo || "?").trim().charAt(0).toUpperCase() || "?";

  const mias = Array.isArray(perfil.insignias) ? perfil.insignias : [];
  const cuantas = ORDEN.filter((k) => mias.includes(k)).length;

  cuerpo.appendChild(seccionRutina(perfil, ficha));

  const s1 = el("section", "pf-sec");
  s1.appendChild(el("h3", null, "Progreso de insignias"));
  const pct = Math.round((cuantas / ORDEN.length) * 100);
  const arriba = el("div", "pf-top");
  arriba.appendChild(anillo(pct, "pfgIns"));
  const texto = el("div", "pf-top-txt");
  texto.appendChild(el("b", null, NIVELES[Math.min(cuantas, NIVELES.length - 1)]));
  texto.appendChild(el("span", null, cuantas + " de " + ORDEN.length + " insignias"));
  const siguiente = ORDEN.find((k) => !mias.includes(k));
  texto.appendChild(el("small", null, siguiente ? "Siguiente: " + INSIGNIAS[siguiente].titulo + ". " + INSIGNIAS[siguiente].desc : "Completaste toda la ruta. ¡Felicidades!"));
  arriba.appendChild(texto);
  s1.appendChild(arriba);

  const ruta = el("div", "pf-ruta");
  ORDEN.forEach((k) => {
    const on = mias.includes(k);
    const nodo = el("div", "pf-nodo" + (on ? " on" : ""));
    nodo.appendChild(el("span", "pf-pt", on ? "✓" : INSIGNIAS[k].emoji));
    nodo.appendChild(el("small", null, INSIGNIAS[k].titulo));
    ruta.appendChild(nodo);
  });
  s1.appendChild(ruta);

  const diasN = Array.isArray(perfil.dias) ? perfil.dias.length : 0;
  const stats = el("div", "pf-stats");
  [[cuantas + "/" + ORDEN.length, "Insignias"], [diasN || "—", "Días"], [ficha ? "Sí" : "No", "Ficha"]].forEach((x) => {
    const c = el("div", "pf-stat");
    c.appendChild(el("b", null, String(x[0])));
    c.appendChild(el("span", null, x[1]));
    stats.appendChild(c);
  });
  s1.appendChild(stats);
  cuerpo.appendChild(s1);

  const s2 = el("section", "pf-sec");
  s2.appendChild(el("h3", null, "Insignias"));
  const grid = el("div", "pf-grid");
  ORDEN.forEach((k) => {
    const d = INSIGNIAS[k];
    const on = mias.includes(k);
    const c = el("div", "pf-ins " + (on ? "on" : "off"));
    c.appendChild(el("span", "e", d.emoji));
    c.appendChild(el("b", null, d.titulo));
    c.appendChild(el("small", null, d.desc));
    c.appendChild(el("div", "ok", on ? "✓ Conseguida" : "Bloqueada"));
    grid.appendChild(c);
  });
  s2.appendChild(grid);
  cuerpo.appendChild(s2);

  const s3 = el("section", "pf-sec");
  s3.appendChild(el("h3", null, "Mis datos"));
  if (perfil.correo || nombre) {
    const dl = el("dl", "pf-dl");
    fila(dl, "Nombre", nombre);
    fila(dl, "Correo", perfil.correo);
    if (perfil.creado && perfil.creado.toDate) {
      fila(dl, "Miembro desde", perfil.creado.toDate().toLocaleDateString("es-SV", { year: "numeric", month: "long", day: "numeric" }));
    }
    s3.appendChild(dl);
  } else {
    s3.appendChild(el("div", "pf-vacio", "Todavía no te has registrado. Regístrate para guardar tu nombre y tu correo en tu perfil."));
    const b = el("button", "pf-btn", "Registrarme");
    b.type = "button";
    b.addEventListener("click", () => {
      try { sessionStorage.removeItem("mapfitRegistrado"); } catch (e) {}
      location.href = "mapfit.html";
    });
    s3.appendChild(b);
  }
  cuerpo.appendChild(s3);

  const s4 = el("section", "pf-sec");
  s4.appendChild(el("h3", null, "Mi ficha de salud"));
  if (ficha) {
    const dl = el("dl", "pf-dl");
    const alturaM = Number(ficha.altura) / 100;
    const imc = ficha.peso && alturaM ? (Number(ficha.peso) / (alturaM * alturaM)).toFixed(1) : "";
    fila(dl, "Nombre", ficha.nombre);
    fila(dl, "Edad", ficha.edad ? ficha.edad + " años" : "");
    fila(dl, "Peso", ficha.peso ? ficha.peso + " kg" : "");
    fila(dl, "Estatura", ficha.altura ? ficha.altura + " cm" : "");
    fila(dl, "IMC estimado", imc);
    fila(dl, "Condición", ficha.condicion);
    fila(dl, "Actividad", ficha.actividad);
    fila(dl, "Objetivo", ficha.objetivo);
    fila(dl, "Plan", ficha.plan ? ficha.plan + (ficha.ciclo ? " (" + ficha.ciclo + ")" : "") : "");
    fila(dl, "Notas", ficha.notas);
    s4.appendChild(dl);
    const a = el("a", "pf-btn", "Actualizar mi ficha");
    a.href = "ficha.html";
    s4.appendChild(a);
  } else {
    s4.appendChild(el("div", "pf-vacio", "Aún no has guardado una ficha de salud."));
    const a = el("a", "pf-btn", "Llenar mi ficha");
    a.href = "ficha.html";
    s4.appendChild(a);
  }
  cuerpo.appendChild(s4);

  const s5 = el("section", "pf-sec");
  s5.appendChild(el("h3", null, "Mi plan"));
  let planSel = perfil.plan || (ficha && ficha.plan) || "Sin elegir";
  let cicloSel = perfil.ciclo || (ficha && ficha.ciclo) || "mensual";
  s5.appendChild(el("p", "pf-nota", "Plan actual: " + planSel + (planSel !== "Sin elegir" ? " (" + cicloSel + ")" : "")));
  const ciclos = el("div", "pf-ciclo");
  const lista = el("div", "pf-planes");
  const msgPlan = el("p", "pf-nota", "");
  function repintarPlanes() {
    ciclos.textContent = "";
    lista.textContent = "";
    ["mensual", "anual"].forEach((c) => {
      const b = el("button", c === cicloSel ? "sel" : "", c === "mensual" ? "Mensual" : "Anual");
      b.type = "button";
      b.addEventListener("click", () => { cicloSel = c; repintarPlanes(); });
      ciclos.appendChild(b);
    });
    PLANES.forEach((pl) => {
      const b = el("button", "pf-plan" + (pl.n === planSel ? " sel" : ""));
      b.type = "button";
      b.appendChild(el("b", null, pl.n));
      b.appendChild(el("span", null, cicloSel === "anual" ? pl.a + " / año" : pl.m + " / mes"));
      b.addEventListener("click", () => { planSel = pl.n; repintarPlanes(); });
      lista.appendChild(b);
    });
  }
  repintarPlanes();
  s5.appendChild(ciclos);
  s5.appendChild(lista);
  const guardar = el("button", "pf-btn", "Guardar plan");
  guardar.type = "button";
  guardar.addEventListener("click", () => {
    if (planSel === "Sin elegir") { msgPlan.textContent = "Elige un plan primero."; return; }
    guardarPlan(perfil, planSel, cicloSel, msgPlan).then((ok) => { if (ok) pintar(perfil, ficha); });
  });
  s5.appendChild(guardar);
  s5.appendChild(msgPlan);
  cuerpo.appendChild(s5);

  const s6 = el("section", "pf-sec");
  const salir = el("button", "pf-salir", "Cerrar sesión");
  salir.type = "button";
  salir.addEventListener("click", cerrarSesion);
  s6.appendChild(salir);
  cuerpo.appendChild(s6);
}

const PLANES = [
  { n: "Básico", m: "$9", a: "$90" },
  { n: "Recuperación", m: "$19", a: "$190" },
  { n: "Bienestar total", m: "$29", a: "$290" }
];

async function guardarPlan(perfil, plan, ciclo, msg) {
  msg.textContent = "Guardando...";
  try {
    const u = await sesion();
    const datos = { plan: plan, ciclo: ciclo, actualizado: serverTimestamp() };
    if (!perfil || Object.keys(perfil).length === 0) datos.creado = serverTimestamp();
    await setDoc(doc(db, "perfiles", u.uid), datos, { merge: true });
    perfil.plan = plan;
    perfil.ciclo = ciclo;
    window.dispatchEvent(new CustomEvent("mapfit:plan", { detail: { plan: plan, ciclo: ciclo } }));
    mostrarToast({ emoji: "✅", titulo: plan + " (" + ciclo + ")" }, "Plan actualizado");
    return true;
  } catch (e) {
    console.error("Plan:", e);
    msg.textContent = "No se pudo guardar el plan. Inténtalo de nuevo.";
    return false;
  }
}

async function cerrarSesion() {
  if (!confirm("¿Cerrar sesión en este navegador?\n\nTus datos ya guardados no se borran, pero al volver empezarás con un perfil nuevo.")) return;
  try { await signOut(auth); } catch (e) { console.error("Cerrar sesión:", e); }
  promesaSesion = null;
  try {
    ["mapfitCorreo", "mapfitIdLocal", "mapfitInsignias"].forEach((k) => localStorage.removeItem(k));
    ["mapfitRegistrado", "mapfitSync"].forEach((k) => sessionStorage.removeItem(k));
  } catch (e) {}
  location.href = typeof URL_INICIO !== "undefined" ? URL_INICIO : "mapfit.html";
}

export async function leerPlanGuardado() {
  const u = await sesion();
  const p = await leerPerfil(u.uid);
  return p && p.plan ? { plan: p.plan, ciclo: p.ciclo || "mensual" } : null;
}

export async function guardarPlanPerfil(plan, ciclo) {
  const u = await sesion();
  const actual = await leerPerfil(u.uid);
  const datos = { plan: plan, ciclo: ciclo, actualizado: serverTimestamp() };
  if (!actual) datos.creado = serverTimestamp();
  await setDoc(doc(db, "perfiles", u.uid), datos, { merge: true });
}

export async function abrirPerfil() {
  construir();
  abridor = document.activeElement;
  overlay.hidden = false;
  document.documentElement.classList.add("pf-open");
  cuerpo.textContent = "";
  cuerpo.appendChild(el("p", "pf-nota", "Cargando tu perfil..."));
  overlay.querySelector(".pf-x").focus();
  try {
    const r = await cargarTodo();
    pintar(r.perfil, r.ficha);
  } catch (e) {
    console.error("Perfil:", e);
    cuerpo.textContent = "";
    cuerpo.appendChild(el("div", "pf-error", "No se pudo cargar tu perfil. Revisa tu conexión e inténtalo de nuevo."));
  }
}

export function cerrarPerfil() {
  if (!overlay) return;
  overlay.hidden = true;
  document.documentElement.classList.remove("pf-open");
  if (abridor && abridor.focus) abridor.focus();
}

document.addEventListener("click", (e) => {
  const a = e.target.closest && e.target.closest("[data-abrir-perfil]");
  if (!a) return;
  e.preventDefault();
  abrirPerfil();
});
if (location.hash === "#perfil") abrirPerfil();
