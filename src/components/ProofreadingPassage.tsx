"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { checkGrammarLesson, lessonFixes, type GrammarLesson } from "@/lib/grammar-lessons";
import { applyProofreadingMark, isProofreadingKind, PROOFREADING_MARKS, type ProofreadingEdit, type ProofreadingKind } from "@/lib/proofreading";

// Original vector paths for conventional proofreading marks, drawn for WriteGrow.
function Mark({ kind }: { kind: ProofreadingKind }) {
  const paths = {
    insert: "M6 23 L16 8 L26 23",
    delete: "M5 22 L24 8 C31 2 29 23 18 22 C8 21 13 9 21 13 L27 25",
    replace: "M4 10 L28 10 M8 26 L16 16 L24 26",
    capitalize: "M8 5 L16 5 L16 16 M8 16 L24 16 M8 21 L24 21 M8 26 L24 26",
    lowercase: "M9 7 L9 20 C9 26 24 26 24 19 C24 14 9 13 9 20 M5 27 L27 5",
  };
  return <svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind]} /></svg>;
}
const dragType = "application/x-writegrow-proofreading";
interface MarkEditor { fixId: string; kind: ProofreadingKind; text: string; start: number; end: number; addition: string }

export function ProofreadingPassage({ lesson, values, checked, edits, disabled, onChange, onUndo }: {
  lesson: GrammarLesson;
  values: Record<string, string>;
  checked: boolean;
  edits: ProofreadingEdit[];
  disabled: boolean;
  onChange: (fixId: string, value: string, mark?: ProofreadingKind) => void;
  onUndo: () => void;
}) {
  const [selected, setSelected] = useState<ProofreadingKind | null>(null);
  const [dragging, setDragging] = useState(false);
  const [editor, setEditor] = useState<MarkEditor | null>(null);
  const [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const textField = useRef<HTMLInputElement>(null);
  const fixes = lessonFixes(lesson);
  const correctIds = new Set(checkGrammarLesson(lesson, values).filter((result) => result.correct).map((result) => result.id));

  useEffect(() => {
    if (!editor || !dialog.current) return;
    dialog.current.showModal();
    textField.current?.focus();
    textField.current?.setSelectionRange(editor.start, editor.end);
  // Open only when a new target is chosen, not when selection changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor?.fixId, editor?.kind]);

  function openMark(fixId: string, kind: ProofreadingKind) {
    if (disabled) return;
    const text = values[fixId] ?? fixes.find((fix) => fix.id === fixId)!.original;
    const start = kind === "insert" ? text.length : 0;
    const end = kind === "insert" ? text.length : kind === "capitalize" || kind === "lowercase" ? Math.min(1, text.length) : text.length;
    setEditor({ fixId, kind, text, start, end, addition: "" });
    setSelected(null); setDragging(false);
  }
  function apply() {
    if (!editor) return;
    const next = applyProofreadingMark(editor.text, editor.kind, editor.start, editor.end, editor.addition);
    if (next !== editor.text) {
      onChange(editor.fixId, next, editor.kind);
      setNotice(`${PROOFREADING_MARKS.find((mark) => mark.kind === editor.kind)!.label} mark applied.`);
    }
    setEditor(null);
  }
  const pending = editor ? applyProofreadingMark(editor.text, editor.kind, editor.start, editor.end, editor.addition) : "";
  return <>
    <div className="proof-toolbar" role="group" aria-label="Proofreading marks">
      {PROOFREADING_MARKS.map((mark) => <button type="button" key={mark.kind} draggable={!disabled} disabled={disabled} aria-pressed={selected === mark.kind} title={`${mark.label} proofreading mark`} className="proof-tool" onClick={() => setSelected(selected === mark.kind ? null : mark.kind)}
        onDragStart={(event) => { event.dataTransfer.setData(dragType, mark.kind); event.dataTransfer.effectAllowed = "copy"; setDragging(true); }} onDragEnd={() => setDragging(false)}>
        <Mark kind={mark.kind} /><span>{mark.label}</span>
      </button>)}
      <button type="button" className="proof-tool" title="Undo last proofreading mark" aria-label="Undo last proofreading mark" disabled={disabled || !edits.length} onClick={onUndo}><span className="text-2xl" aria-hidden="true">&#8630;</span><span>Undo</span></button>
    </div>
    <p className="sr-only" role="status">{selected ? `${PROOFREADING_MARKS.find((mark) => mark.kind === selected)!.label} selected. Choose a highlighted phrase.` : notice}</p>
    <div className={`grammar-passage ${dragging || selected ? "proof-targets-ready" : ""}`}>
      {lesson.parts.map((part, index) => {
        if (typeof part === "string") return <span key={index}>{part}</span>;
        const value = values[part.id] ?? part.original;
        const mark = [...edits].reverse().find((edit) => edit.fixId === part.id);
        const correct = checked && correctIds.has(part.id);
        return <span key={part.id} className="proof-target" onDragOver={(event) => { if (event.dataTransfer.types.includes(dragType)) { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; } }}
          onDrop={(event) => { const kind = event.dataTransfer.getData(dragType); if (isProofreadingKind(kind)) { event.preventDefault(); openMark(part.id, kind); } }}>
          <span className="proof-annotation" title={mark ? `${PROOFREADING_MARKS.find((item) => item.kind === mark.kind)!.label}: ${mark.before} to ${mark.after || "removed"}` : undefined}>
            {mark && <><Mark kind={mark.kind} /><span className={mark.kind === "delete" || mark.kind === "replace" ? "line-through" : ""}>{mark.before}</span></>}
          </span>
          <input aria-label={`Fix ${fixes.findIndex((fix) => fix.id === part.id) + 1}: ${part.original}`} aria-describedby={checked ? `result-${part.id}` : undefined} disabled={disabled} autoComplete="off" spellCheck={false} className={`grammar-edit ${correct ? "grammar-edit-correct" : ""}`}
            style={{ width: `${Math.max(5, Math.min(22, Math.max(part.original.length, ...part.answers.map((answer) => answer.length)) + 2))}ch` }} value={value}
            onClick={() => { if (selected) openMark(part.id, selected); }}
            onKeyDown={(event) => { if (selected && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); openMark(part.id, selected); } }}
            onChange={(event) => onChange(part.id, event.target.value)} />
        </span>;
      })}
    </div>
    {editor && createPortal(<dialog ref={dialog} className="proof-dialog" aria-labelledby="proof-dialog-title" onCancel={() => setEditor(null)}>
      <form onSubmit={(event) => { event.preventDefault(); event.stopPropagation(); apply(); }}>
        <h3 id="proof-dialog-title" className="flex items-center gap-2 font-display text-xl font-semibold"><Mark kind={editor.kind} />{PROOFREADING_MARKS.find((mark) => mark.kind === editor.kind)!.label}</h3>
        <label className="label mt-4" htmlFor="proof-source">Text</label>
        <input ref={textField} id="proof-source" className="field" readOnly value={editor.text} onSelect={(event) => { const input = event.currentTarget; setEditor({ ...editor, start: input.selectionStart ?? 0, end: input.selectionEnd ?? 0 }); }} />
        {editor.kind === "insert" ? <label className="mt-4 block"><span className="label">Add here</span><select className="field" value={editor.start} onChange={(event) => { const start = Number(event.target.value); setEditor({ ...editor, start, end: start }); }}>{Array.from({ length: editor.text.length + 1 }, (_, i) => <option key={i} value={i}>{editor.text.slice(0, i)} | {editor.text.slice(i)}</option>)}</select></label> : <div className="mt-4 grid grid-cols-2 gap-3">
          <label><span className="label">From</span><select className="field" value={editor.start} onChange={(event) => { const start = Number(event.target.value); setEditor({ ...editor, start, end: Math.max(start, editor.end) }); }}>{Array.from({ length: editor.text.length + 1 }, (_, i) => <option key={i} value={i}>{editor.text.slice(0, i)} | {editor.text.slice(i)}</option>)}</select></label>
          <label><span className="label">To</span><select className="field" value={editor.end} onChange={(event) => { const end = Number(event.target.value); setEditor({ ...editor, end, start: Math.min(end, editor.start) }); }}>{Array.from({ length: editor.text.length + 1 }, (_, i) => <option key={i} value={i}>{editor.text.slice(0, i)} | {editor.text.slice(i)}</option>)}</select></label>
        </div>}
        {(editor.kind === "insert" || editor.kind === "replace") && <label className="mt-4 block"><span className="label">{editor.kind === "insert" ? "Add in" : "New text"}</span><input className="field" value={editor.addition} onChange={(event) => setEditor({ ...editor, addition: event.target.value })} /></label>}
        <div className="mt-4 border-y border-sprout-100 py-3"><p className="eyebrow">After your mark</p><p className="mt-2 break-words text-lg text-sprout-800">{pending || <span className="text-sm text-ink/60">Text removed</span>}</p></div>
        <div className="mt-5 flex flex-wrap justify-end gap-3"><button type="button" className="btn-ghost" onClick={() => setEditor(null)}>Cancel</button><button type="submit" className="btn-primary" disabled={pending === editor.text || ((editor.kind === "insert" || editor.kind === "replace") && !editor.addition)}>Apply mark</button></div>
      </form>
    </dialog>, document.body)}
  </>;
}
