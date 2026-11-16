"use client";
/**
 * Roles — a roles and permissions page for a SaaS settings area (React 18/19, no deps).
 *  The roles on the left (Owner, Admin, Editor, Viewer and your own), each with how many people have it. The chosen
 *  role on the right: one plain sentence that says what it can do (it rewrites itself as you change things), how far
 *  it reaches, and a row per part of the product with a four-stop rail (None, View, Edit, Manage) in place of a grid
 *  of checkboxes, since each level includes the one before. Hover another role and rings on every rail show its
 *  levels, to compare. Each row opens to list exactly what its level allows. Changes collect in a bar at the bottom
 *  (Discard / Save). The owner is locked. New role, Duplicate and Delete (for your own roles) work in place.
 *  With no props it shows a sample workspace. No pills, no boxes around text: dots, words, hairlines.
 * Kit-ready: the CSS lives in this file (scoped under .rp) and starts with a small kit-shield block.
 */
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';

export type Level = 0 | 1 | 2 | 3;
export type Resource = { id: string; name: string; hint: string; icon: string; can: [string, string, string]; sensitive?: boolean };
export type Role = { id: string; name: string; people: number; initials: string[]; levels: Record<string, Level>; locked?: boolean; custom?: boolean };

type RolesProps = {
  roles?: Role[];
  resources?: Resource[];
  selected?: string;                 // the role shown first (default "editor")
  onSave?: (roles: Role[]) => void;
  theme?: 'light' | 'dark';
  loadFont?: boolean;
  className?: string;
  style?: CSSProperties;
};

export const RESOURCES: Resource[] = [
  { id: 'projects', name: 'Projects', hint: 'Boards, files and timelines', icon: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
    can: ['Open every project and its files', 'Create projects and change what is in them', 'Archive, delete and move projects'] },
  { id: 'docs', name: 'Documents', hint: 'Pages and shared notes', icon: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
    can: ['Read every document', 'Write, edit and comment', 'Change who it is shared with, and delete'] },
  { id: 'members', name: 'Members', hint: 'People in the workspace', icon: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M17 11a3 3 0 1 0 0-6M22 21a6 6 0 0 0-4-5.6', sensitive: true,
    can: ['See who is in the workspace', 'Invite people', 'Change roles and remove people'] },
  { id: 'billing', name: 'Billing', hint: 'Plan, invoices and card', icon: 'M3 6h18v12H3zM3 10h18M7 15h4', sensitive: true,
    can: ['See the plan and the invoices', 'Update the card', 'Change or cancel the plan'] },
  { id: 'api', name: 'API keys', hint: 'Keys for apps and scripts', icon: 'M15 7a4 4 0 1 1-3.9 4.9L4 19v-3h2v-2h2l2.1-2.1A4 4 0 0 1 15 7zM16 9h.01', sensitive: true,
    can: ['See which keys exist', 'Create keys', 'Revoke any key'] },
  { id: 'settings', name: 'Settings', hint: 'Name, domain and security', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    can: ['See the workspace settings', 'Change the name and branding', 'Change security and the domain'] },
];
const all = (l: Level): Record<string, Level> => Object.fromEntries(RESOURCES.map((r) => [r.id, l]));
export const ROLES: Role[] = [
  { id: 'owner', name: 'Owner', people: 1, initials: ['AS'], levels: all(3), locked: true },
  { id: 'admin', name: 'Admin', people: 2, initials: ['MR', 'JK'], levels: { projects: 3, docs: 3, members: 3, billing: 1, api: 2, settings: 2 } },
  { id: 'editor', name: 'Editor', people: 5, initials: ['LT', 'PN', 'DV'], levels: { projects: 2, docs: 2, members: 1, billing: 0, api: 0, settings: 1 } },
  { id: 'viewer', name: 'Viewer', people: 12, initials: ['RB', 'SC', 'HM'], levels: { projects: 1, docs: 1, members: 1, billing: 0, api: 0, settings: 0 } },
  { id: 'finance', name: 'Finance', people: 2, initials: ['EW', 'OG'], custom: true, levels: { projects: 1, docs: 1, members: 0, billing: 3, api: 0, settings: 0 } },
];
const LEVELS = ['None', 'View', 'Edit', 'Manage'];
const VERB = ['', 'view', 'edit', 'manage'];
const TINTS = ['#e9ecfd', '#fbeee6', '#e6f4ec', '#f3e9f8', '#fdf3dc', '#e8f1f8'];

const CSS = `/* kit-shield: undo Tailwind preflight inside the component (Kit) */
:where(.rp) { line-height: normal; color: CanvasText; tab-size: 8; font-feature-settings: normal; font-variation-settings: normal; -webkit-text-size-adjust: auto; -webkit-tap-highlight-color: initial; }
:where(.rp) :where(*), :where(.rp) :where(*)::before, :where(.rp) :where(*)::after { box-sizing: revert; margin: revert; padding: revert; border-width: revert; border-style: revert; border-color: revert; outline-color: revert; }
:where(.rp) :where(ol, ul, menu) { list-style: revert; }
:where(.rp) :where(h1, h2, h3, h4, h5, h6) { font-size: revert; font-weight: revert; }
:where(.rp) :where(a) { color: revert; text-decoration: revert; }
:where(.rp) :where(b, strong) { font-weight: revert; }
:where(.rp) :where(small, sub, sup) { font-size: revert; }
:where(.rp) :where(code, kbd, samp, pre) { font-family: revert; font-size: revert; font-feature-settings: revert; font-variation-settings: revert; }
:where(.rp) :where(img, svg, video, canvas, audio, iframe, embed, object) { display: revert; vertical-align: revert; }
:where(.rp) :where(img, video) { max-width: revert; height: revert; }
:where(.rp) :where(button, input, select, optgroup, textarea) { font: revert; letter-spacing: revert; color: revert; border-radius: revert; background-color: revert; opacity: revert; }
:where(.rp) :where(button, input[type="button"], input[type="reset"], input[type="submit"]) { appearance: revert; }
:where(.rp) :where(textarea) { resize: revert; }
:where(.rp) :where(table) { text-indent: revert; border-color: revert; border-collapse: revert; }
:where(.rp) :where(summary) { display: revert; }
:where(.rp) ::placeholder { color: revert; opacity: revert; }

.rp{--bg:#ffffff;--ink:#18181a;--txt:#55555b;--mute:#6f6f75;--faint:#c9c9cc;--line:#eeeeec;--soft:#f6f6f4;--hov:#fafaf9;--acc:#3d50e8;--ok:#1f9d55;--warm:#e5602f;--warmtx:#c4471a;--danger:#c93a3a;--dtint:#fdf3f3;--track:#ebebe8;
  container-type:inline-size;position:relative;width:min(1040px,100%);background:var(--bg);border:1px solid var(--line);border-radius:18px;
  font-family:Inter,system-ui,sans-serif;font-size:13px;color:var(--ink);-webkit-font-smoothing:antialiased;box-sizing:border-box;text-align:left}
.rp.dark{--bg:#121214;--ink:#f2f2f3;--txt:#b4b4ba;--mute:#8b8b92;--faint:#47474d;--line:#232327;--soft:#1b1b1f;--hov:#17171a;--acc:#8293ff;--ok:#3ccf7d;--warm:#ff7a4a;--warmtx:#ff7a4a;--danger:#ff6b6b;--dtint:#2a1717;--track:#2a2a2f}
.rp *,.rp *::before,.rp *::after{box-sizing:border-box}
.rp button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}
.rp button:focus-visible,.rp input:focus-visible,.rp [role="radiogroup"]:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
.rp p{margin:0}
.rp .pad{padding:24px}
.rp .head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding-bottom:22px;border-bottom:1px solid var(--line)}
.rp h2{margin:0;font:400 30px/1.1 Inter,system-ui,sans-serif;letter-spacing:-0.03em}
.rp .sub{margin-top:10px;color:var(--mute);font-size:12.5px}
.rp .primary{display:inline-flex;align-items:center;gap:7px;height:36px;padding:0 14px;border-radius:10px;background:var(--ink);color:var(--bg);font-weight:500;white-space:nowrap;transition:opacity .15s,transform .12s}
.rp .primary:hover{opacity:.88}
.rp .ghost{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 10px;border-radius:9px;color:var(--txt);white-space:nowrap;transition:background .15s,color .15s,transform .12s}
.rp .ghost:hover{background:var(--soft);color:var(--ink)}
.rp .ghost.red:hover{color:var(--danger);background:var(--dtint)}
.rp .primary:active,.rp .ghost:active{transform:scale(.96)}

.rp .body{display:grid;grid-template-columns:232px minmax(0,1fr);gap:28px;padding-top:22px}
.rp .list{position:relative;padding-right:20px;border-right:1px solid var(--line);align-self:start}
.rp .list .lab{margin:14px 0 6px 12px;font:500 12px Inter,system-ui,sans-serif;color:var(--mute)}
.rp .list .lab:first-child{margin-top:0}
.rp .role{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px;width:100%;min-height:52px;padding:8px 10px 8px 14px;border-radius:10px;text-align:left;transition:background .2s}
.rp .role:hover{background:var(--hov)}
.rp .role[aria-current="true"]{background:var(--soft)}
.rp .role .nm{display:flex;align-items:center;gap:6px;font-size:13.5px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rp .role .ct{display:block;margin-top:3px;color:var(--mute);font-size:12px}
.rp .role .mk{width:6px;height:6px;border-radius:50%;background:var(--acc);flex:none;animation:rp-pop .3s cubic-bezier(.3,1.6,.5,1) both}
.rp .thumb{position:absolute;left:0;top:0;width:3px;height:26px;border-radius:3px;background:var(--ink);transition:transform .38s cubic-bezier(.3,1.25,.5,1)}
.rp .faces{display:flex;flex-direction:row-reverse;justify-content:flex-end}
.rp .faces span{display:grid;place-items:center;width:22px;height:22px;margin-left:-6px;border-radius:50%;border:2px solid var(--bg);color:#3a3a40;font-size:8.5px;font-weight:500;letter-spacing:.02em}
.rp .role:hover .faces span,.rp .role[aria-current="true"] .faces span{border-color:var(--soft)}
.rp .role:hover .faces span{border-color:var(--hov)}
.rp .faces .more{background:var(--soft);color:var(--mute)}
.rp .tip{margin:14px 0 0 14px;color:var(--mute);font-size:11.5px;line-height:1.45}

.rp .top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.rp .title{margin:0;padding:0;width:100%;max-width:340px;font:400 26px/1.15 Inter,system-ui,sans-serif;letter-spacing:-0.02em;color:var(--ink);background:none;border:0;border-bottom:1px dashed transparent;border-radius:0;outline:0;transition:border-color .2s}
.rp input.title:hover{border-bottom-color:var(--faint)}
.rp input.title:focus{border-bottom-color:var(--acc)}
.rp .acts{display:flex;gap:2px;flex:none}
.rp .say{margin-top:12px;max-width:62ch;color:var(--txt);font-size:14px;line-height:1.6;animation:rp-in .45s cubic-bezier(.2,.8,.2,1) both}
.rp .say b{font-weight:500;color:var(--ink)}
.rp .meta{display:flex;flex-wrap:wrap;align-items:center;gap:8px 18px;margin-top:14px;color:var(--mute);font-size:12px}
.rp .reach{display:inline-flex;align-items:center;gap:9px}
.rp .ticks{display:inline-flex;align-items:flex-end;gap:2px;height:14px}
.rp .ticks i{display:block;width:3px;height:100%;border-radius:1px;background:var(--track);transition:background .25s,transform .3s cubic-bezier(.3,1.6,.5,1);transition-delay:calc(var(--k) * 18ms)}
.rp .ticks i.on{background:var(--ink);transform:scaleY(1.001)}
.rp .ticks i.on.top{background:var(--warm)}
.rp .reach b{font-family:'JetBrains Mono',ui-monospace,monospace;font-weight:500;color:var(--ink);font-variant-numeric:tabular-nums}
.rp .lock,.rp .cmp{display:inline-flex;align-items:center;gap:6px}
.rp .cmp{color:var(--acc);animation:rp-up .25s ease both}
.rp .cmp i{width:10px;height:10px;border-radius:50%;border:1.5px dashed var(--acc)}

.rp .x{display:grid;grid-template-rows:0fr;opacity:0;transition:grid-template-rows .42s cubic-bezier(.2,.8,.2,1),opacity .3s}
.rp .x.open{grid-template-rows:1fr;opacity:1}
.rp .x>div{min-height:0;overflow:hidden}
.rp .strip{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin-top:14px;padding:10px 10px 10px 14px;border-radius:12px;background:var(--dtint);color:var(--danger)}
.rp .strip span{display:flex;gap:4px}
.rp .strip .go{height:30px;padding:0 12px;border-radius:8px;background:var(--danger);color:var(--bg);font-weight:500;transition:transform .12s}
.rp .strip .go:active{transform:scale(.96)}

.rp .rows{margin-top:18px;border-top:1px solid var(--line)}
.rp .res{display:grid;grid-template-columns:minmax(0,1fr) 300px 28px;align-items:center;gap:6px 20px;padding:12px 4px;border-bottom:1px solid var(--line);animation:rp-up .5s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(.1s + var(--i,0) * 45ms)}
.rp .who{display:flex;align-items:center;gap:12px;min-width:0}
.rp .ico{display:grid;place-items:center;width:32px;height:32px;flex:none;border-radius:9px;background:var(--soft);color:var(--txt)}
.rp .who p{display:flex;align-items:center;gap:7px;font-size:13.5px;font-weight:500}
.rp .who .h{display:block;margin-top:2px;color:var(--mute);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rp .who .mk{width:6px;height:6px;border-radius:50%;background:var(--acc);animation:rp-pop .3s cubic-bezier(.3,1.6,.5,1) both}
.rp .who .sens{display:inline-flex;align-items:center;color:var(--warmtx);font-size:11.5px;font-weight:400;animation:rp-up .3s ease both}

.rp .rail{position:relative;display:grid;grid-template-columns:repeat(4,1fr);height:44px;border-radius:8px;--dl:0ms}
.rp .rail .tr,.rp .rail .fl{position:absolute;left:12.5%;top:12px;height:4px;border-radius:99px;pointer-events:none}
.rp .rail .tr{right:12.5%;background:var(--track)}
.rp .rail .fl{width:calc(var(--l) * 25%);background:var(--ink);transition:width .5s cubic-bezier(.3,1.2,.5,1) var(--dl),background .3s}
.rp .rail.hot .fl{background:var(--warm)}
.rp .rail .kn{position:absolute;top:6px;left:calc(12.5% + var(--l) * 25%);width:16px;height:16px;margin-left:-8px;border-radius:50%;background:var(--bg);border:2px solid var(--ink);pointer-events:none;transition:left .5s cubic-bezier(.3,1.2,.5,1) var(--dl),border-color .3s,transform .15s}
.rp .rail.zero .kn{border-color:var(--faint)}
.rp .rail.hot .kn{border-color:var(--warm)}
.rp .rail:active .kn{transform:scale(1.15)}
.rp .rail .gh{position:absolute;top:2px;left:calc(12.5% + var(--g) * 25%);width:24px;height:24px;margin-left:-12px;border-radius:50%;border:1.5px dashed var(--acc);pointer-events:none;opacity:0;transform:scale(.6);transition:opacity .2s,transform .3s cubic-bezier(.3,1.5,.5,1),left .3s cubic-bezier(.2,.8,.2,1)}
.rp .rail.cmp-on .gh{opacity:1;transform:scale(1)}
.rp .rail button{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding-top:10px;height:44px;border-radius:8px}
.rp .rail button i{width:8px;height:8px;border-radius:50%;background:var(--bg);border:2px solid var(--faint);transition:border-color .3s var(--dl),background .3s var(--dl)}
.rp .rail button.in i{border-color:var(--ink);background:var(--ink)}
.rp .rail.hot button.in i{border-color:var(--warm);background:var(--warm)}
.rp .rail button span{margin-top:9px;color:var(--mute);font-size:11.5px;transition:color .2s}
.rp .rail button:hover span{color:var(--txt)}
.rp .rail button[aria-checked="true"] span{color:var(--ink);font-weight:500}
.rp .rail.locked button{cursor:not-allowed}
.rp .rail.shake{animation:rp-shake .4s cubic-bezier(.36,.07,.19,.97)}
.rp .rail.shake.again{animation-name:rp-shake2}
.rp .more{display:grid;place-items:center;width:28px;height:28px;border-radius:8px;color:var(--mute);transition:background .15s,color .15s}
.rp .more:hover{background:var(--soft);color:var(--ink)}
.rp .more svg{transition:transform .3s cubic-bezier(.2,.8,.2,1)}
.rp .more[aria-expanded="true"] svg{transform:rotate(180deg)}
.rp .det{grid-column:1/-1}
.rp .can{display:grid;gap:8px;margin:4px 0 6px 44px;padding:0;list-style:none}
.rp .can li{display:grid;grid-template-columns:16px 60px minmax(0,1fr);align-items:center;gap:8px;color:var(--mute);font-size:12.5px;transition:color .25s}
.rp .can li.on{color:var(--txt)}
.rp .can li em{font-style:normal;font-size:11.5px;color:var(--mute)}
.rp .can li.on em{color:var(--ink);font-weight:500}
.rp .can .no{display:block;width:8px;height:1.5px;margin-left:3px;border-radius:2px;background:var(--faint)}
.rp .can li.on svg{color:var(--ok)}

.rp .bar{position:sticky;bottom:14px;z-index:3;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin-top:18px;padding:8px 8px 8px 16px;border-radius:12px;background:var(--ink);color:var(--bg);animation:rp-bar .45s cubic-bezier(.3,1.25,.5,1) both}
.rp .bar.out{animation:rp-barout .35s ease forwards}
.rp .bar p{display:inline-flex;align-items:center;gap:8px}
.rp .bar p b{font-family:'JetBrains Mono',ui-monospace,monospace;font-weight:500}
.rp .bar .ok{gap:10px;min-height:32px}
.rp .bar .ok .dot{display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:var(--ok);color:#fff;animation:rp-pop .35s cubic-bezier(.3,1.6,.5,1) both}
.rp .bar .ok b{font-family:inherit}
.rp .bar .ok em{font-style:normal;opacity:.6}
@container (max-width: 568px){.rp .bar .ok em{display:none}}
.rp .bar span{display:flex;gap:6px}
.rp .bar .d{height:32px;padding:0 12px;border-radius:9px;color:inherit;opacity:.75;transition:opacity .15s,background .15s,transform .12s}
.rp .bar .d:hover{opacity:1;background:color-mix(in srgb,var(--bg) 12%,transparent)}
.rp .bar .s{display:inline-flex;align-items:center;gap:7px;height:32px;padding:0 14px;border-radius:9px;background:var(--bg);color:var(--ink);font-weight:500;transition:transform .12s}
.rp .bar .d:active,.rp .bar .s:active{transform:scale(.96)}
.rp .spin{width:12px;height:12px;border-radius:50%;border:2px solid var(--line);border-top-color:var(--ink);animation:rp-spin .7s linear infinite}
.rp .drawn path{stroke-dasharray:1;animation:rp-draw .45s .05s cubic-bezier(.65,0,.35,1) both}

@keyframes rp-up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes rp-in{from{opacity:0;transform:translateY(6px);filter:blur(4px)}to{opacity:1;transform:none;filter:none}}
@keyframes rp-pop{from{transform:scale(0)}to{transform:scale(1)}}
@keyframes rp-draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
@keyframes rp-spin{to{transform:rotate(360deg)}}
@keyframes rp-shake{20%,60%{transform:translateX(-4px)}40%,80%{transform:translateX(4px)}}
@keyframes rp-shake2{20%,60%{transform:translateX(-4px)}40%,80%{transform:translateX(4px)}}
@keyframes rp-bar{from{opacity:0;transform:translateY(16px) scale(.98)}to{opacity:1;transform:none}}
@keyframes rp-barout{to{opacity:0;transform:translateY(12px)}}

/* the card has no padding of its own (it sits on .pad, so these queries can change it): 808 and 568 are the old 760 and 520 plus the 48px it used to take */
@container (max-width: 808px){
  .rp .body{grid-template-columns:1fr;gap:20px}
  .rp .list{display:flex;flex-wrap:wrap;gap:6px;padding:0 0 18px;border-right:0;border-bottom:1px solid var(--line)}
  .rp .list .lab,.rp .thumb,.rp .tip,.rp .faces{display:none}
  .rp .role{width:auto;min-height:0;padding:7px 12px;border:1px solid var(--line);grid-template-columns:auto}
  .rp .role[aria-current="true"]{border-color:var(--ink);background:none}
  .rp .role .ct{display:none}
  .rp .res{grid-template-columns:minmax(0,1fr) 28px}
  .rp .rail{grid-column:1/-1;grid-row:2}
  .rp .det{grid-row:3}
  .rp .can{margin-left:0}
}
@container (max-width: 568px){
  .rp .pad{padding:18px 14px}
  .rp h2{font-size:24px}
  .rp .head{flex-direction:column}
  .rp .title{font-size:22px}
  .rp .acts .lbl{display:none}
  .rp .say{font-size:13.5px}
  .rp .can li{grid-template-columns:16px 52px minmax(0,1fr)}
}
@media (prefers-reduced-motion: reduce){.rp *{transition:none!important;animation:none!important}}
`;

const Icon = ({ d, s = 14 }: { d: string; s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
const I = {
  plus: 'M12 5v14M5 12h14',
  copy: 'M8 8h12v12H8zM16 8V4H4v12h4',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
  down: 'M6 9l6 6 6-6',
};
const Drawn = () => <svg className="drawn" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} /></svg>;

// opens and closes by its height (not a jump): it stays mounted while it closes, then goes
function Expand({ open, children }: { open: boolean; children: ReactNode }) {
  const [show, setShow] = useState(open);
  const [on, setOn] = useState(open);
  useEffect(() => {
    if (open) { setShow(true); const t = window.setTimeout(() => setOn(true), 20); return () => window.clearTimeout(t); }
    setOn(false); const t = window.setTimeout(() => setShow(false), 420); return () => window.clearTimeout(t);
  }, [open]);
  if (!show) return null;
  return <div className={'x' + (on ? ' open' : '')}><div>{children}</div></div>;
}

// counts to its value (a timer, so it always ends)
function CountUp({ value, ms = 600 }: { value: number; ms?: number }) {
  const [n, setN] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (typeof window === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(value); from.current = value; return; }
    const a = from.current, start = Date.now();
    const id = window.setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / ms), e = 1 - Math.pow(1 - t, 3);
      const v = Math.round(a + (value - a) * e); setN(v); from.current = v;
      if (t >= 1) window.clearInterval(id);
    }, 30);
    return () => window.clearInterval(id);
  }, [value, ms]);
  return <>{n}</>;
}

const noun = (n: string) => (/^[A-Z]{2}/.test(n) ? n : n.toLowerCase());
const join = (a: string[]) => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
const same = (a: Role, b: Role) => a.name === b.name && Object.keys(a.levels).every((k) => a.levels[k] === b.levels[k]);

// one plain sentence for what a role can do
function Sentence({ role, resources }: { role: Role; resources: Resource[] }) {
  const groups = ([3, 2, 1] as Level[]).map((l) => ({ l, names: resources.filter((r) => (role.levels[r.id] ?? 0) === l).map((r) => noun(r.name)) })).filter((g) => g.names.length);
  const hidden = resources.filter((r) => !(role.levels[r.id] ?? 0)).map((r) => r.name);
  const name = role.name.trim() || 'This role';
  if (!groups.length) return <>{name} can't see anything yet. Choose what it can reach below.</>;
  if (groups.length === 1 && groups[0].l === 3 && !hidden.length) return <>{name} can <b>manage</b> everything.</>;
  return (
    <>
      {name} can{' '}
      {groups.map((g, i) => (
        <span key={g.l}>{i > 0 ? (i === groups.length - 1 ? ', and ' : ', ') : ''}<b>{VERB[g.l]}</b> {join(g.names)}</span>
      ))}
      .{hidden.length > 0 && <> {join(hidden)} {hidden.length === 1 && !/s$/i.test(hidden[0]) ? 'stays' : 'stay'} hidden.</>}
    </>
  );
}

export default function Roles({
  roles: initial = ROLES, resources = RESOURCES, selected = 'editor', onSave, theme = 'light', loadFont = true, className, style,
}: RolesProps) {
  const [saved, setSaved] = useState<Role[]>(initial);
  const [roles, setRoles] = useState<Role[]>(initial);
  const [sel, setSel] = useState(initial.some((r) => r.id === selected) ? selected : initial[0]?.id);
  const [cmp, setCmp] = useState<string | null>(null);       // the role being compared (hover / focus)
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [nudge, setNudge] = useState({ id: '', n: 0 });       // the locked rail that was clicked, to shake
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState<'' | 'busy' | 'done'>('');
  const [thumb, setThumb] = useState(-100);
  const listRef = useRef<HTMLDivElement>(null);
  const btns = useRef<Record<string, HTMLButtonElement | null>>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const focusName = useRef(false);

  useEffect(() => {
    if (!loadFont || typeof document === 'undefined' || document.getElementById('rp-fonts')) return;
    const l = document.createElement('link');
    l.id = 'rp-fonts'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap';
    document.head.appendChild(l);
  }, [loadFont]);
  // the bar beside the chosen role follows it
  useEffect(() => {
    const place = () => { const b = btns.current[sel]; if (b) setThumb(b.offsetTop + (b.offsetHeight - 26) / 2); };
    place();
    if (typeof ResizeObserver === 'undefined' || !listRef.current) return;
    const ro = new ResizeObserver(place); ro.observe(listRef.current);
    return () => ro.disconnect();
  }, [sel, roles.length]);
  useEffect(() => { setDeleting(false); if (focusName.current) { focusName.current = false; nameRef.current?.select(); } }, [sel]);
  useEffect(() => { if (saving !== 'done') return; const t = window.setTimeout(() => setSaving(''), 1700); return () => window.clearTimeout(t); }, [saving]);

  const role = roles.find((r) => r.id === sel) ?? roles[0];
  const was = saved.find((r) => r.id === role.id);
  const other = cmp && cmp !== role.id ? roles.find((r) => r.id === cmp) : undefined;
  const changes = roles.reduce((n, r) => {
    const s = saved.find((x) => x.id === r.id);
    if (!s) return n + 1;
    return n + (r.name !== s.name ? 1 : 0) + resources.filter((x) => (r.levels[x.id] ?? 0) !== (s.levels[x.id] ?? 0)).length;
  }, 0) + saved.filter((s) => !roles.some((r) => r.id === s.id)).length;
  const reach = resources.reduce((n, r) => n + (role.levels[r.id] ?? 0), 0), most = resources.length * 3;
  const builtIn = roles.filter((r) => !r.custom), custom = roles.filter((r) => r.custom);

  const patch = (fn: (r: Role) => Role) => setRoles((rs) => rs.map((r) => (r.id === role.id ? fn(r) : r)));
  const setLevel = (res: string, l: number) => {
    if (role.locked) { setNudge((v) => ({ id: res, n: v.n + 1 })); return; }
    const lv = Math.max(0, Math.min(3, l)) as Level;
    patch((r) => ({ ...r, levels: { ...r.levels, [res]: lv } }));
  };
  const onRailKey = (e: KeyboardEvent<HTMLDivElement>, res: string) => {
    const cur = role.levels[res] ?? 0;
    const map: Record<string, number> = { ArrowLeft: cur - 1, ArrowDown: cur - 1, ArrowRight: cur + 1, ArrowUp: cur + 1, Home: 0, End: 3 };
    if (!(e.key in map)) return;
    e.preventDefault();
    const next = Math.max(0, Math.min(3, map[e.key]));
    setLevel(res, next);
    const el = e.currentTarget;
    window.setTimeout(() => (el.querySelectorAll('button')[role.locked ? cur : next] as HTMLButtonElement | undefined)?.focus(), 0);
  };
  const addRole = (from?: Role) => {
    const id = 'role-' + Date.now().toString(36);
    const r: Role = { id, name: from ? from.name + ' copy' : 'New role', people: 0, initials: [], custom: true, levels: from ? { ...from.levels } : Object.fromEntries(resources.map((x) => [x.id, 0 as Level])) };
    setRoles((rs) => [...rs, r]); focusName.current = true; setSel(id);
  };
  const removeRole = () => {
    const fallback = roles.find((r) => r.id === 'viewer') ?? roles.find((r) => r.id !== role.id && !r.locked);
    setRoles((rs) => rs.filter((r) => r.id !== role.id).map((r) => (fallback && r.id === fallback.id ? { ...r, people: r.people + role.people } : r)));
    setSel(fallback?.id ?? roles[0].id);
  };
  const discard = () => { setRoles(saved); if (!saved.some((r) => r.id === sel)) setSel(saved[0]?.id); };
  const save = () => {
    if (saving) return;
    setSaving('busy');
    window.setTimeout(() => { setSaved(roles); setSaving('done'); onSave?.(roles); }, 650);
  };

  const roleBtn = (r: Role) => {
    const s = saved.find((x) => x.id === r.id);
    const dirty = !s || !same(r, s);
    return (
      <button key={r.id} type="button" className="role" aria-current={r.id === role.id} ref={(b) => { btns.current[r.id] = b; }}
        onClick={() => setSel(r.id)} onMouseEnter={() => setCmp(r.id)} onMouseLeave={() => setCmp(null)} onFocus={() => setCmp(r.id)} onBlur={() => setCmp(null)}>
        <span style={{ minWidth: 0 }}>
          <span className="nm">{r.name.trim() || 'Untitled'}{r.locked && <Icon d={I.lock} s={12} />}{dirty && <i className="mk" aria-label="Unsaved" />}</span>
          <span className="ct">{r.people === 0 ? 'No one yet' : r.people === 1 ? '1 person' : `${r.people} people`}</span>
        </span>
        <span className="faces" aria-hidden="true">
          {r.people > r.initials.length && <span className="more">+{r.people - r.initials.length}</span>}
          {r.initials.slice().reverse().map((x, i) => <span key={x + i} style={{ background: TINTS[(x.charCodeAt(0) + x.charCodeAt(1)) % TINTS.length] }}>{x}</span>)}
        </span>
      </button>
    );
  };

  return (
    <div className={['rp', theme === 'dark' ? 'dark' : '', className].filter(Boolean).join(' ')} style={style}>
      {/* as raw HTML: React 18's server renderer escapes quotes and > in a text child, which breaks the selectors */}
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="pad">
      <div className="head">
        <div>
          <h2>Roles &amp; permissions</h2>
          <p className="sub">Decide what each role can see and change.</p>
        </div>
        <button type="button" className="primary" onClick={() => addRole()}><Icon d={I.plus} />New role</button>
      </div>

      <div className="body">
        <div className="list" ref={listRef}>
          <span className="thumb" aria-hidden="true" style={{ transform: `translateY(${thumb}px)` }} />
          <p className="lab">Built in</p>
          {builtIn.map(roleBtn)}
          {custom.length > 0 && <p className="lab">Your roles</p>}
          {custom.map(roleBtn)}
          <p className="tip">Hover a role to compare it with the one open.</p>
        </div>

        <div>
          <div className="top">
            {role.custom
              ? <input ref={nameRef} className="title" value={role.name} aria-label="Role name" maxLength={32} onChange={(e) => patch((r) => ({ ...r, name: e.target.value }))} />
              : <h3 className="title">{role.name}</h3>}
            <span className="acts">
              <button type="button" className="ghost" onClick={() => addRole(role)} title="Duplicate"><Icon d={I.copy} /><span className="lbl">Duplicate</span></button>
              {role.custom && <button type="button" className="ghost red" onClick={() => setDeleting(true)} title="Delete"><Icon d={I.trash} /><span className="lbl">Delete</span></button>}
            </span>
          </div>
          <p className="say" key={role.id + JSON.stringify(role.levels)}><Sentence role={role} resources={resources} /></p>
          <div className="meta">
            <span className="reach">Reach
              <span className="ticks" aria-hidden="true">
                {Array.from({ length: most }, (_, k) => <i key={k} className={k < reach ? (k >= most - 3 ? 'on top' : 'on') : ''} style={{ '--k': k } as CSSProperties} />)}
              </span><b><CountUp value={reach} /></b> of {most}</span>
            {role.locked && <span className="lock"><Icon d={I.lock} s={12} />The owner can always do everything.</span>}
            {other && <span className="cmp" key={other.id}><i />Rings show {other.name.trim() || 'Untitled'}</span>}
          </div>
          <Expand open={deleting}>
            <div className="strip" role="alertdialog" aria-label={`Delete ${role.name}?`}>
              <p>Delete {role.name.trim() || 'this role'}?{role.people > 0 && <> {role.people === 1 ? 'Its 1 person moves' : `Its ${role.people} people move`} to Viewer.</>}</p>
              <span>
                <button type="button" className="ghost" onClick={() => setDeleting(false)}>Keep</button>
                <button type="button" className="go" onClick={removeRole}>Delete role</button>
              </span>
            </div>
          </Expand>

          <div className="rows">
            {resources.map((x, i) => {
              const lv = role.levels[x.id] ?? 0;
              const g = other ? other.levels[x.id] ?? 0 : lv;
              const dirty = was ? (was.levels[x.id] ?? 0) !== lv : false;
              const hot = !!x.sensitive && lv === 3;
              // each nudge swaps between two identical keyframes, which replays the shake without remounting the rail (a remount drops keyboard focus)
              const cls = ['rail', lv === 0 ? 'zero' : '', hot ? 'hot' : '', other ? 'cmp-on' : '', role.locked ? 'locked' : '', nudge.id === x.id && nudge.n ? (nudge.n % 2 ? 'shake' : 'shake again') : ''].filter(Boolean).join(' ');
              return (
                <div className="res" key={x.id} style={{ '--i': i } as CSSProperties}>
                  <div className="who">
                    <span className="ico"><Icon d={x.icon} s={16} /></span>
                    <span style={{ minWidth: 0 }}>
                      <p>{x.name}{dirty && <i className="mk" aria-label="Changed" />}{hot && <span className="sens">Sensitive</span>}</p>
                      <span className="h">{x.hint}</span>
                    </span>
                  </div>
                  <div className={cls} role="radiogroup" aria-label={`${x.name} access`}
                    style={{ '--l': lv, '--g': g, '--dl': `${i * 40}ms` } as CSSProperties} onKeyDown={(e) => onRailKey(e, x.id)}>
                    <span className="tr" /><span className="fl" /><span className="gh" /><span className="kn" />
                    {LEVELS.map((name, k) => (
                      <button key={name} type="button" role="radio" aria-checked={lv === k} tabIndex={lv === k ? 0 : -1} className={k <= lv && k > 0 ? 'in' : ''}
                        aria-disabled={role.locked || undefined} onClick={() => setLevel(x.id, k)}>
                        <i /><span>{name}</span>
                      </button>
                    ))}
                  </div>
                  <button type="button" className="more" aria-expanded={!!open[x.id]} aria-label={`What ${x.name} access allows`} onClick={() => setOpen((o) => ({ ...o, [x.id]: !o[x.id] }))}>
                    <Icon d={I.down} />
                  </button>
                  <div className="det">
                    <Expand open={!!open[x.id]}>
                      <ul className="can">
                        {x.can.map((c, k) => (
                          <li key={k} className={k < lv ? 'on' : ''}>
                            {k < lv ? <span key={'t' + lv}><Drawn /></span> : <span className="no" />}
                            <em>{LEVELS[k + 1]}</em>{c}
                          </li>
                        ))}
                      </ul>
                    </Expand>
                  </div>
                </div>
              );
            })}
          </div>

          {(changes > 0 || saving) && (
            <div className={'bar' + (saving === 'done' ? ' out' : '')} role="status" style={saving === 'done' ? { animationDelay: '1.3s' } : undefined}>
              {saving === 'done'
                ? <p className="ok"><span className="dot"><Drawn /></span><b>Saved</b><em>Everyone gets the new access on their next click.</em></p>
                : <p><b>{changes}</b> unsaved {changes === 1 ? 'change' : 'changes'}</p>}
              {saving !== 'done' && (
                <span>
                  <button type="button" className="d" onClick={discard} disabled={!!saving}>Discard</button>
                  <button type="button" className="s" onClick={save}>{saving === 'busy' && <span className="spin" />}Save changes</button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
