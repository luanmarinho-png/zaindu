'use client';

import { useEffect, useRef } from 'react';
import { Select } from '@/components/ui/Select';

const PERSONALIZATION = [
  { value: 'nome', label: 'Nome da pessoa' },
  { value: 'clinica', label: 'Nome da clínica' },
  { value: 'profissional', label: 'Profissional' },
  { value: 'assinatura', label: 'Assinatura' },
];
const labelOf = (token: string) => PERSONALIZATION.find(item => item.value === token)?.label;

function readEditor(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
  if (!(node instanceof HTMLElement)) return Array.from(node.childNodes).map(readEditor).join('');
  const token = node.dataset.personalization;
  if (token && labelOf(token)) return `{{${token}}}`;
  if (node.tagName === 'BR') return node.parentElement?.childNodes.length === 1 && ['DIV', 'P'].includes(node.parentElement.tagName) ? '' : '\n';
  return Array.from(node.childNodes).map((child, index) => {
    const block = child instanceof HTMLElement && ['DIV', 'P'].includes(child.tagName);
    return `${block && index > 0 ? '\n' : ''}${readEditor(child)}`;
  }).join('');
}

function marker(token: string) {
  const chip = document.createElement('span');
  chip.className = 'z-message-token';
  chip.contentEditable = 'false';
  chip.dataset.personalization = token;
  chip.textContent = labelOf(token) || '';
  chip.setAttribute('aria-label', `Personalização: ${labelOf(token)}`);
  return chip;
}

function writeEditor(root: HTMLElement, value: string) {
  const pieces = value.split(/(\{\{(?:nome|clinica|profissional|assinatura)\}\})/g);
  root.replaceChildren(...pieces.map(piece => /^\{\{/.test(piece) ? marker(piece.slice(2, -2)) : document.createTextNode(piece)));
}

export function MessageEditor({ id, label, value, onChange, multiline = false, maxLength }: { id: string; label: string; value: string; onChange: (value: string) => void; multiline?: boolean; maxLength: number }) {
  const editor = useRef<HTMLDivElement>(null);
  const caret = useRef<Range | null>(null);

  useEffect(() => {
    if (editor.current && readEditor(editor.current) !== value) {
      writeEditor(editor.current, value);
      caret.current = null;
    }
  }, [value]);

  function rememberCaret() {
    const selection = window.getSelection();
    if (selection?.rangeCount && editor.current?.contains(selection.getRangeAt(0).commonAncestorContainer)) caret.current = selection.getRangeAt(0).cloneRange();
  }

  function change() {
    if (!editor.current) return;
    const next = readEditor(editor.current);
    if (next.length > maxLength) {
      writeEditor(editor.current, value);
      caret.current = null;
      return;
    }
    rememberCaret();
    onChange(next);
  }

  function insert(node: Node) {
    const root = editor.current;
    if (!root) return;
    const range = caret.current && root.contains(caret.current.commonAncestorContainer) ? caret.current : document.createRange();
    if (!caret.current || !root.contains(range.commonAncestorContainer)) { range.selectNodeContents(root); range.collapse(false); }
    const before = readEditor(root);
    const removed = readEditor(range.cloneContents());
    const added = node instanceof HTMLElement && node.dataset.personalization ? `{{${node.dataset.personalization}}}` : node.textContent || '';
    if (before.length - removed.length + added.length > maxLength) return;
    range.deleteContents();
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    root.focus();
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    caret.current = range.cloneRange();
    change();
  }

  return <div className="z-message-compose">
    <div ref={editor} id={id} className={`z-message-input ${multiline ? 'multiline' : ''}`} contentEditable suppressContentEditableWarning role="textbox" aria-label={label} aria-multiline={multiline} tabIndex={0}
      onInput={change} onBlur={rememberCaret} onKeyUp={rememberCaret} onMouseUp={rememberCaret}
      onKeyDown={event => { if (!multiline && event.key === 'Enter') event.preventDefault(); }}
      onPaste={event => { event.preventDefault(); rememberCaret(); const text = event.clipboardData.getData('text/plain'); insert(document.createTextNode(multiline ? text : text.replace(/[\r\n]+/g, ' '))); }}
      onDrop={event => event.preventDefault()} />
    <Select value="" ariaLabel={`Personalizar ${label.toLocaleLowerCase('pt-BR')}`} placeholder="Inserir personalização" options={PERSONALIZATION} onChange={token => { if (labelOf(token)) insert(marker(token)); }} />
  </div>;
}
