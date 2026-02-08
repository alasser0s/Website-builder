import React, { useMemo } from 'react';
import { selectNodeById } from '../foundation/selectors';
import type { BlueprintStateSnapshot } from '../foundation/types';
import { theme01Tokens } from '../styles/tokens';
import { Presets } from '../styles/presets';
import { mergeStylesNonDestructive } from '../styles/mapper';

interface StylesPanelProps {
  nodeId: string;
  snapshot: BlueprintStateSnapshot;
  updateStyles: (nodeId: string, styles: Record<string, unknown>) => void;
}

const spacingSteps = ['0', '1', '2', '3', '4', '6', '8', '10', '12', '16'];
const fontWeights = ['thin', 'extralight', 'light', 'normal', 'medium', 'semibold', 'bold', 'extrabold', 'black'];
const fontFamilies = ['sans', 'serif', 'mono', 'inter', 'roboto', 'opensans', 'system'];
const letterSpacings = ['tighter', 'tight', 'normal', 'wide', 'wider', 'widest'];
const textDecorations = ['none', 'underline', 'line-through', 'overline'];
const textTransforms = ['normal-case', 'uppercase', 'lowercase', 'capitalize'];
const displays = ['block', 'inline', 'inline-block', 'flex', 'inline-flex', 'grid', 'inline-grid', 'contents', 'hidden'];
const shadows = ['none', 'sm', 'md', 'lg', 'xl'];
const radii = ['none', 'sm', 'md', 'lg', 'xl', 'full'];
const fontSizes = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl'];
const lineHeights = ['none', 'tight', 'snug', 'normal', 'relaxed', 'loose'];
const textAligns = ['left', 'center', 'right', 'justify'];
const widths = ['auto', 'full', 'screen', 'max-w-xs', 'max-w-sm', 'max-w-md', 'max-w-lg', 'max-w-xl', 'max-w-2xl', 'max-w-3xl', 'max-w-4xl'];
const aligns = ['start', 'end', 'center', 'baseline', 'stretch'];
const justifies = ['start', 'end', 'center', 'between', 'around', 'evenly'];
const borderStyles = ['none', 'solid', 'dashed', 'dotted', 'double'];

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <div style={{ fontSize: 12, opacity: 0.8 }}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

export function StylesPanel({ nodeId, snapshot, updateStyles }: StylesPanelProps) {
  const node = useMemo(() => selectNodeById(snapshot.root, nodeId), [snapshot, nodeId]);
  if (!node) return <div>Node not found</div>;
  const styles = (node.styles ?? {}) as any;

  const colors = Object.keys(theme01Tokens.color);

  const setBase = (patch: Record<string, unknown>) => updateStyles(nodeId, patch);
  const setResp = (bp: 'sm' | 'md' | 'lg', patch: Record<string, unknown>) => {
    const next = { [bp]: { ...(styles?.[bp] ?? {}), ...patch } } as any;
    updateStyles(nodeId, next);
  };

  const applyPreset = (name: keyof typeof Presets) => {
    const merged = mergeStylesNonDestructive(styles, Presets[name]);
    updateStyles(nodeId, merged as any);
  };

  return (
    <div style={{ padding: 12, border: '1px solid #ddd', borderRadius: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <strong>Styles</strong>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['Minimal', 'Contrast', 'Soft'] as const).map((p) => (
            <button key={p} onClick={() => applyPreset(p)}>{p}</button>
          ))}
        </div>
      </div>

      <fieldset style={{ marginBottom: 12 }}>
        <legend style={{ fontWeight: 600, fontSize: 12 }}>Base</legend>
        <FieldRow label="bg">
          <select value={styles.bg ?? ''} onChange={(e) => setBase({ bg: e.target.value || undefined })}>
            <option value="">(none)</option>
            {colors.map((c) => (<option key={c} value={c}>{c}</option>))}
          </select>
        </FieldRow>
        <FieldRow label="text">
          <select value={styles.text ?? ''} onChange={(e) => setBase({ text: e.target.value || undefined })}>
            <option value="">(none)</option>
            {colors.map((c) => (<option key={c} value={c}>{c}</option>))}
          </select>
        </FieldRow>
        <FieldRow label="text align">
          <select value={styles.textAlign ?? ''} onChange={(e) => setBase({ textAlign: e.target.value || undefined })}>
            <option value="">(none)</option>
            {textAligns.map((c) => (<option key={c} value={c}>{c}</option>))}
          </select>
        </FieldRow>
        <FieldRow label="p">
          <select value={String(styles.p ?? '')} onChange={(e) => setBase({ p: e.target.value ? Number(e.target.value) : undefined })}>
            <option value="">(none)</option>
            {spacingSteps.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
        </FieldRow>
        <FieldRow label="m">
          <select value={String(styles.m ?? '')} onChange={(e) => setBase({ m: e.target.value ? Number(e.target.value) : undefined })}>
            <option value="">(none)</option>
            {spacingSteps.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
        </FieldRow>
        <FieldRow label="pt/pr/pb/pl">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
            {(['pt', 'pr', 'pb', 'pl'] as const).map((k) => (
              <select key={k} value={String(styles?.[k] ?? '')} onChange={(e) => setBase({ [k]: e.target.value ? Number(e.target.value) : undefined } as any)}>
                <option value="">(none)</option>
                {spacingSteps.map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>
            ))}
          </div>
        </FieldRow>
        <FieldRow label="rounded">
          <select value={styles.rounded ?? ''} onChange={(e) => setBase({ rounded: e.target.value || undefined })}>
            <option value="">(none)</option>
            {radii.map((r) => (<option key={r} value={r}>{r}</option>))}
          </select>
        </FieldRow>
        <FieldRow label="shadow">
          <select value={styles.shadow ?? ''} onChange={(e) => setBase({ shadow: e.target.value || undefined })}>
            <option value="">(none)</option>
            {shadows.map((r) => (<option key={r} value={r}>{r}</option>))}
          </select>
        </FieldRow>
        <FieldRow label="fontSize">
          <select value={styles.fontSize ?? ''} onChange={(e) => setBase({ fontSize: e.target.value || undefined })}>
            <option value="">(none)</option>
            {fontSizes.map((r) => (<option key={r} value={r}>{r}</option>))}
          </select>
        </FieldRow>
        <FieldRow label="lineHeight">
          <select value={styles.lineHeight ?? ''} onChange={(e) => setBase({ lineHeight: e.target.value || undefined })}>
            <option value="">(none)</option>
            {lineHeights.map((r) => (<option key={r} value={r}>{r}</option>))}
          </select>
        </FieldRow>
        <FieldRow label="fontWeight">
          <select value={styles.fontWeight ?? ''} onChange={(e) => setBase({ fontWeight: e.target.value || undefined })}>
            <option value="">(none)</option>
            {fontWeights.map((r) => (<option key={r} value={r}>{r}</option>))}
          </select>
        </FieldRow>
        <FieldRow label="fontFamily">
          <select value={styles.fontFamily ?? ''} onChange={(e) => setBase({ fontFamily: e.target.value || undefined })}>
            <option value="">(none)</option>
            {fontFamilies.map((r) => (<option key={r} value={r}>{r}</option>))}
          </select>
        </FieldRow>
        <FieldRow label="letterSpacing">
          <select value={styles.letterSpacing ?? ''} onChange={(e) => setBase({ letterSpacing: e.target.value || undefined })}>
            <option value="">(none)</option>
            {letterSpacings.map((r) => (<option key={r} value={r}>{r}</option>))}
          </select>
        </FieldRow>
        <FieldRow label="textDecoration">
          <select value={styles.textDecoration ?? ''} onChange={(e) => setBase({ textDecoration: e.target.value || undefined })}>
            <option value="">(none)</option>
            {textDecorations.map((r) => (<option key={r} value={r}>{r}</option>))}
          </select>
        </FieldRow>
        <FieldRow label="textTransform">
          <select value={styles.textTransform ?? ''} onChange={(e) => setBase({ textTransform: e.target.value || undefined })}>
            <option value="">(none)</option>
            {textTransforms.map((r) => (<option key={r} value={r}>{r}</option>))}
          </select>
        </FieldRow>
        <FieldRow label="display">
          <select value={styles.display ?? ''} onChange={(e) => setBase({ display: e.target.value || undefined })}>
            <option value="">(none)</option>
            {displays.map((r) => (<option key={r} value={r}>{r}</option>))}
          </select>
        </FieldRow>
        <FieldRow label="width">
          <select value={styles.width ?? ''} onChange={(e) => setBase({ width: e.target.value || undefined })}>
            <option value="">(none)</option>
            {widths.map((r) => (<option key={r} value={r}>{r}</option>))}
          </select>
        </FieldRow>
        <FieldRow label="gap">
          <select value={String(styles.gap ?? '')} onChange={(e) => setBase({ gap: e.target.value ? Number(e.target.value) : undefined })}>
            <option value="">(none)</option>
            {spacingSteps.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
        </FieldRow>
        <FieldRow label="align/justify">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <select disabled={!['flex', 'inline-flex', 'grid', 'inline-grid'].includes(styles.display)} value={styles.align ?? ''} onChange={(e) => setBase({ align: e.target.value || undefined })}>
              <option value="">(none)</option>
              {aligns.map((a) => (<option key={a} value={a}>{a}</option>))}
            </select>
            <select disabled={!['flex', 'inline-flex', 'grid', 'inline-grid'].includes(styles.display)} value={styles.justify ?? ''} onChange={(e) => setBase({ justify: e.target.value || undefined })}>
              <option value="">(none)</option>
              {justifies.map((a) => (<option key={a} value={a}>{a}</option>))}
            </select>
          </div>
        </FieldRow>
        <FieldRow label="border width/style/color">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <select value={String(styles.borderWidth ?? '')} onChange={(e) => setBase({ borderWidth: e.target.value ? Number(e.target.value) : undefined })}>
              <option value="">(none)</option>
              {['0', '2', '4', '8'].map((v) => (<option key={v} value={v}>{v}</option>))}
            </select>
            <select value={styles.borderStyle ?? ''} onChange={(e) => setBase({ borderStyle: e.target.value || undefined })}>
              <option value="">(none)</option>
              {borderStyles.map((v) => (<option key={v} value={v}>{v}</option>))}
            </select>
            <select value={styles.borderColor ?? ''} onChange={(e) => setBase({ borderColor: e.target.value || undefined })}>
              <option value="">(none)</option>
              {colors.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>
        </FieldRow>
        <FieldRow label="bg image URL">
          <input value={styles.bgImage ?? ''} onChange={(e) => setBase({ bgImage: e.target.value || undefined })} placeholder="https://..." />
        </FieldRow>
        <FieldRow label="bg size/pos/repeat">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <input value={styles.bgSize ?? ''} onChange={(e) => setBase({ bgSize: e.target.value || undefined })} placeholder="cover/contain/..." />
            <input value={styles.bgPosition ?? ''} onChange={(e) => setBase({ bgPosition: e.target.value || undefined })} placeholder="center/top/..." />
            <input value={styles.bgRepeat ?? ''} onChange={(e) => setBase({ bgRepeat: e.target.value || undefined })} placeholder="no-repeat/repeat-x" />
          </div>
        </FieldRow>
      </fieldset>

      <fieldset style={{ marginBottom: 12 }}>
        <legend style={{ fontWeight: 600, fontSize: 12 }}>Hover</legend>
        <FieldRow label="text">
          <select value={styles?.hover?.text ?? ''} onChange={(e) => setBase({ hover: { ...(styles?.hover ?? {}), text: e.target.value || undefined } })}>
            <option value="">(none)</option>
            {colors.map((c) => (<option key={c} value={c}>{c}</option>))}
          </select>
        </FieldRow>
        <FieldRow label="bg">
          <select value={styles?.hover?.bg ?? ''} onChange={(e) => setBase({ hover: { ...(styles?.hover ?? {}), bg: e.target.value || undefined } })}>
            <option value="">(none)</option>
            {colors.map((c) => (<option key={c} value={c}>{c}</option>))}
          </select>
        </FieldRow>
        <FieldRow label="fontWeight">
          <select value={styles?.hover?.fontWeight ?? ''} onChange={(e) => setBase({ hover: { ...(styles?.hover ?? {}), fontWeight: e.target.value || undefined } })}>
            <option value="">(none)</option>
            {fontWeights.map((r) => (<option key={r} value={r}>{r}</option>))}
          </select>
        </FieldRow>
        <FieldRow label="textDecoration">
          <select value={styles?.hover?.textDecoration ?? ''} onChange={(e) => setBase({ hover: { ...(styles?.hover ?? {}), textDecoration: e.target.value || undefined } })}>
            <option value="">(none)</option>
            {textDecorations.map((r) => (<option key={r} value={r}>{r}</option>))}
          </select>
        </FieldRow>
        <FieldRow label="shadow">
          <select value={styles?.hover?.shadow ?? ''} onChange={(e) => setBase({ hover: { ...(styles?.hover ?? {}), shadow: e.target.value || undefined } })}>
            <option value="">(none)</option>
            {shadows.map((r) => (<option key={r} value={r}>{r}</option>))}
          </select>
        </FieldRow>
      </fieldset>

      {(['sm', 'md', 'lg'] as const).map((bp) => (
        <fieldset key={bp} style={{ marginBottom: 12 }}>
          <legend style={{ fontWeight: 600, fontSize: 12 }}>{bp.toUpperCase()}</legend>
          <FieldRow label="p">
            <select value={String(styles?.[bp]?.p ?? '')} onChange={(e) => setResp(bp, { p: e.target.value ? Number(e.target.value) : undefined })}>
              <option value="">(none)</option>
              {spacingSteps.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
          </FieldRow>
          <FieldRow label="m">
            <select value={String(styles?.[bp]?.m ?? '')} onChange={(e) => setResp(bp, { m: e.target.value ? Number(e.target.value) : undefined })}>
              <option value="">(none)</option>
              {spacingSteps.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
          </FieldRow>
          <FieldRow label="pt/pr/pb/pl">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
              {(['pt', 'pr', 'pb', 'pl'] as const).map((k) => (
                <select key={k} value={String(styles?.[bp]?.[k] ?? '')} onChange={(e) => setResp(bp, { [k]: e.target.value ? Number(e.target.value) : undefined } as any)}>
                  <option value="">(none)</option>
                  {spacingSteps.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
              ))}
            </div>
          </FieldRow>
          <FieldRow label="fontWeight">
            <select value={styles?.[bp]?.fontWeight ?? ''} onChange={(e) => setResp(bp, { fontWeight: e.target.value || undefined })}>
              <option value="">(none)</option>
              {fontWeights.map((r) => (<option key={r} value={r}>{r}</option>))}
            </select>
          </FieldRow>
          <FieldRow label="fontSize">
            <select value={styles?.[bp]?.fontSize ?? ''} onChange={(e) => setResp(bp, { fontSize: e.target.value || undefined })}>
              <option value="">(none)</option>
              {fontSizes.map((r) => (<option key={r} value={r}>{r}</option>))}
            </select>
          </FieldRow>
          <FieldRow label="lineHeight">
            <select value={styles?.[bp]?.lineHeight ?? ''} onChange={(e) => setResp(bp, { lineHeight: e.target.value || undefined })}>
              <option value="">(none)</option>
              {lineHeights.map((r) => (<option key={r} value={r}>{r}</option>))}
            </select>
          </FieldRow>
          <FieldRow label="fontFamily">
            <select value={styles?.[bp]?.fontFamily ?? ''} onChange={(e) => setResp(bp, { fontFamily: e.target.value || undefined })}>
              <option value="">(none)</option>
              {fontFamilies.map((r) => (<option key={r} value={r}>{r}</option>))}
            </select>
          </FieldRow>
          <FieldRow label="letterSpacing">
            <select value={styles?.[bp]?.letterSpacing ?? ''} onChange={(e) => setResp(bp, { letterSpacing: e.target.value || undefined })}>
              <option value="">(none)</option>
              {letterSpacings.map((r) => (<option key={r} value={r}>{r}</option>))}
            </select>
          </FieldRow>
          <FieldRow label="textDecoration">
            <select value={styles?.[bp]?.textDecoration ?? ''} onChange={(e) => setResp(bp, { textDecoration: e.target.value || undefined })}>
              <option value="">(none)</option>
              {textDecorations.map((r) => (<option key={r} value={r}>{r}</option>))}
            </select>
          </FieldRow>
          <FieldRow label="textTransform">
            <select value={styles?.[bp]?.textTransform ?? ''} onChange={(e) => setResp(bp, { textTransform: e.target.value || undefined })}>
              <option value="">(none)</option>
              {textTransforms.map((r) => (<option key={r} value={r}>{r}</option>))}
            </select>
          </FieldRow>
          <FieldRow label="display">
            <select value={styles?.[bp]?.display ?? ''} onChange={(e) => setResp(bp, { display: e.target.value || undefined })}>
              <option value="">(none)</option>
              {displays.map((r) => (<option key={r} value={r}>{r}</option>))}
            </select>
          </FieldRow>
          <FieldRow label="gap">
            <select value={String(styles?.[bp]?.gap ?? '')} onChange={(e) => setResp(bp, { gap: e.target.value ? Number(e.target.value) : undefined })}>
              <option value="">(none)</option>
              {spacingSteps.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
          </FieldRow>
          <FieldRow label="align/justify">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <select disabled={!['flex', 'inline-flex', 'grid', 'inline-grid'].includes(styles?.[bp]?.display)} value={styles?.[bp]?.align ?? ''} onChange={(e) => setResp(bp, { align: e.target.value || undefined })}>
                <option value="">(none)</option>
                {aligns.map((a) => (<option key={a} value={a}>{a}</option>))}
              </select>
              <select disabled={!['flex', 'inline-flex', 'grid', 'inline-grid'].includes(styles?.[bp]?.display)} value={styles?.[bp]?.justify ?? ''} onChange={(e) => setResp(bp, { justify: e.target.value || undefined })}>
                <option value="">(none)</option>
                {justifies.map((a) => (<option key={a} value={a}>{a}</option>))}
              </select>
            </div>
          </FieldRow>
          <FieldRow label="width">
            <select value={styles?.[bp]?.width ?? ''} onChange={(e) => setResp(bp, { width: e.target.value || undefined })}>
              <option value="">(none)</option>
              {widths.map((r) => (<option key={r} value={r}>{r}</option>))}
            </select>
          </FieldRow>
          <FieldRow label="rounded/shadow">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <select value={styles?.[bp]?.rounded ?? ''} onChange={(e) => setResp(bp, { rounded: e.target.value || undefined })}>
                <option value="">(none)</option>
                {radii.map((r) => (<option key={r} value={r}>{r}</option>))}
              </select>
              <select value={styles?.[bp]?.shadow ?? ''} onChange={(e) => setResp(bp, { shadow: e.target.value || undefined })}>
                <option value="">(none)</option>
                {shadows.map((r) => (<option key={r} value={r}>{r}</option>))}
              </select>
            </div>
          </FieldRow>
          <FieldRow label="bg/text">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <select value={styles?.[bp]?.bg ?? ''} onChange={(e) => setResp(bp, { bg: e.target.value || undefined })}>
                <option value="">(none)</option>
                {colors.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
              <select value={styles?.[bp]?.text ?? ''} onChange={(e) => setResp(bp, { text: e.target.value || undefined })}>
                <option value="">(none)</option>
                {colors.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>
          </FieldRow>
          <FieldRow label="border w/s/c">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <select value={String(styles?.[bp]?.borderWidth ?? '')} onChange={(e) => setResp(bp, { borderWidth: e.target.value ? Number(e.target.value) : undefined })}>
                <option value="">(none)</option>
                {['0', '2', '4', '8'].map((v) => (<option key={v} value={v}>{v}</option>))}
              </select>
              <select value={styles?.[bp]?.borderStyle ?? ''} onChange={(e) => setResp(bp, { borderStyle: e.target.value || undefined })}>
                <option value="">(none)</option>
                {borderStyles.map((v) => (<option key={v} value={v}>{v}</option>))}
              </select>
              <select value={styles?.[bp]?.borderColor ?? ''} onChange={(e) => setResp(bp, { borderColor: e.target.value || undefined })}>
                <option value="">(none)</option>
                {colors.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>
          </FieldRow>
        </fieldset>
      ))}
    </div>
  );
}
