import {useEffect, useState} from 'react';
import {fetchAnalysis, generate, validate, type PreviewDocument, type RuntimeProviderInput} from './api';
import type {A2UIVersion, ProviderId, ValidationResult, VersionAnalysis} from '../../src/core/types';

const DEFAULT_PROMPT = '확인 버튼과 취소 버튼이 있는 경고창을 만들어줘';
const SETTINGS_STORAGE_KEY = 'a2ui.runtimeSettings.v1';

type ConnectionState = {
  requestedProvider: ProviderId;
  provider: ProviderId;
  providerReason: string;
  model?: string;
  usedModel: boolean;
};

function resolveValue(value: unknown, data: Record<string, unknown>): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value && typeof value === 'object' && 'path' in (value as any)) {
    return String(data[String((value as any).path).replace(/^\//, '')] ?? '');
  }
  return '';
}

function PreviewPane({preview}: {preview: PreviewDocument | null}) {
  if (!preview) return <div className="preview-shell empty">생성 결과를 검증하면 미리보기가 표시됩니다.</div>;

  const renderNode = (id: string): any => {
    const node = preview.components[id];
    if (!node) return null;

    const component = String(node.component);
    const children = Array.isArray(node.children) ? (node.children as string[]) : [];
    const style = {
      ['--accent' as any]: preview.theme.primaryColor ?? '#1d4ed8',
      ['--font-stack' as any]: preview.theme.font ?? 'Pretendard, system-ui, sans-serif',
    } as any;

    if (component === 'Text') {
      return <p key={id} className={`node text ${String(node.variant ?? 'body')}`} style={style}>{resolveValue(node.text, preview.data)}</p>;
    }
    if (component === 'Button') {
      return <button key={id} className={`node button ${String(node.variant ?? 'secondary')}`} style={style}>{renderNode(String(node.child))}</button>;
    }
    if (component === 'CheckBox') {
      return (
        <label key={id} className="node checkbox" style={style}>
          <input type="checkbox" defaultChecked={Boolean(preview.data[String(((node.value as any)?.path ?? '')).replace(/^\//, '')])} />
          <span>{resolveValue(node.label, preview.data)}</span>
        </label>
      );
    }
    if (component === 'TextField') {
      return (
        <label key={id} className="node field" style={style}>
          <span>{resolveValue(node.label, preview.data)}</span>
          <input
            type={node.variant === 'obscured' ? 'password' : 'text'}
            defaultValue={resolveValue(node.value ?? node.text, preview.data)}
            placeholder={resolveValue(node.label, preview.data)}
          />
        </label>
      );
    }
    if (component === 'Card') {
      return <section key={id} className="node card" style={style}>{renderNode(String(node.child))}</section>;
    }
    if (component === 'Modal') {
      return (
        <section key={id} className="node modal" style={style}>
          <div className="modal-trigger">{renderNode(String(node.trigger))}</div>
          <div className="modal-body">{renderNode(String(node.content))}</div>
        </section>
      );
    }
    if (component === 'Row' || component === 'Column') {
      return <section key={id} className={`node stack ${component === 'Row' ? 'row' : 'column'}`} style={style}>{children.map((childId) => renderNode(childId))}</section>;
    }

    return <section key={id} className="node unknown" style={style}><strong>{component}</strong></section>;
  };

  return (
    <div className="preview-shell">
      <div className="preview-head"><span>{preview.version}</span><span>{preview.surfaceId}</span></div>
      <div className="preview-canvas">{renderNode(preview.rootId)}</div>
      {preview.functionCalls.length > 0 ? (
        <div className="preview-log"><h4>Function Calls</h4><pre>{JSON.stringify(preview.functionCalls, null, 2)}</pre></div>
      ) : null}
    </div>
  );
}

export function App() {
  const [version, setVersion] = useState<A2UIVersion>('v0.10');
  const [provider, setProvider] = useState<ProviderId>('auto');
  const [providers, setProviders] = useState<ProviderId[]>(['auto', 'fallback', 'openai', 'gemini', 'claude']);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [source, setSource] = useState('[]');
  const [analysis, setAnalysis] = useState<VersionAnalysis[]>([]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [preview, setPreview] = useState<PreviewDocument | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionState | null>(null);
  const [runtime, setRuntime] = useState<RuntimeProviderInput>({});
  const [secureMode, setSecureMode] = useState(true);
  const [persistSettings, setPersistSettings] = useState(false);

  useEffect(() => {
    fetchAnalysis()
      .then((payload) => {
        setAnalysis(payload.versions);
        setProviders(payload.providers);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {persist: boolean; runtime: RuntimeProviderInput};
      if (parsed && typeof parsed === 'object') {
        setPersistSettings(Boolean(parsed.persist));
        setRuntime(parsed.runtime ?? {});
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    if (secureMode) {
      setPersistSettings(false);
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
      return;
    }

    if (!persistSettings) {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
      return;
    }

    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({persist: true, runtime}));
  }, [secureMode, persistSettings, runtime]);

  function updateRuntime(key: keyof RuntimeProviderInput, value: string) {
    setRuntime((prev) => ({...prev, [key]: value}));
  }

  async function handleGenerate() {
    setIsGenerating(true);
    setActionError(null);
    try {
      const result = await generate(prompt, version, provider, runtime);
      setSource(result.serialized);
      setConnection({
        requestedProvider: result.requestedProvider,
        provider: result.provider,
        providerReason: result.providerReason,
        model: result.model,
        usedModel: result.usedModel,
      });
      const next = await validate(version, result.serialized);
      setPreview(next.preview);
      setValidation(next.validation);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Generate failed');
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleValidate() {
    setIsValidating(true);
    setActionError(null);
    try {
      const result = await validate(version, source);
      setValidation(result.validation);
      setPreview(result.preview);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Validate failed');
    } finally {
      setIsValidating(false);
    }
  }

  const current = analysis.find((entry) => entry.version === version);

  return (
    <main className="app-shell">
      <section className="left-pane">
        <div className="panel hero">
          <div>
            <p className="eyebrow">A2UI Studio</p>
            <h1>Prompt to versioned A2UI</h1>
          </div>
          <div className="controls">
            <select value={version} onChange={(event) => setVersion(event.target.value as A2UIVersion)}>
              <option value="v0.8">v0.8</option>
              <option value="v0.9">v0.9</option>
              <option value="v0.10">v0.10</option>
            </select>
            <select value={provider} onChange={(event) => setProvider(event.target.value as ProviderId)}>
              {providers.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <button onClick={handleGenerate} disabled={isGenerating || isValidating}>{isGenerating ? 'Generating...' : 'Generate'}</button>
            <button className="secondary" onClick={handleValidate} disabled={isGenerating || isValidating}>{isValidating ? 'Validating...' : 'Validate'}</button>
          </div>
        </div>

        <details className="panel settings" open>
          <summary>Model Settings</summary>
          <p className="muted">키/모델 설정은 Generate 요청 시에만 사용됩니다. 키 쿼터는 각 provider 정책을 따릅니다.</p>
          <label className="persist-row">
            <input type="checkbox" checked={secureMode} onChange={(event) => setSecureMode(event.target.checked)} />
            <span>보안 모드 (세션 메모리 only)</span>
          </label>
          <label className="persist-row">
            <input
              type="checkbox"
              checked={persistSettings}
              disabled={secureMode}
              onChange={(event) => setPersistSettings(event.target.checked)}
            />
            <span>이 브라우저에 설정 저장</span>
          </label>
          <div className="settings-grid">
            <label>
              <span>OpenAI Key</span>
              <input type="password" value={runtime.openaiApiKey ?? ''} onChange={(event) => updateRuntime('openaiApiKey', event.target.value)} placeholder="sk-..." />
            </label>
            <label>
              <span>OpenAI Model</span>
              <input value={runtime.openaiModel ?? ''} onChange={(event) => updateRuntime('openaiModel', event.target.value)} placeholder="gpt-4.1-mini" />
            </label>
            <label>
              <span>Gemini Key</span>
              <input type="password" value={runtime.geminiApiKey ?? ''} onChange={(event) => updateRuntime('geminiApiKey', event.target.value)} placeholder="AIza..." />
            </label>
            <label>
              <span>Gemini Model</span>
              <input value={runtime.geminiModel ?? ''} onChange={(event) => updateRuntime('geminiModel', event.target.value)} placeholder="gemini-2.5-flash" />
            </label>
            <label>
              <span>Claude Key</span>
              <input type="password" value={runtime.anthropicApiKey ?? ''} onChange={(event) => updateRuntime('anthropicApiKey', event.target.value)} placeholder="sk-ant-..." />
            </label>
            <label>
              <span>Claude Model</span>
              <input value={runtime.anthropicModel ?? ''} onChange={(event) => updateRuntime('anthropicModel', event.target.value)} placeholder="claude-3-5-sonnet-latest" />
            </label>
          </div>
        </details>

        <div className="panel action-status info">
          <strong>연결 상태</strong>
          {connection ? (
            <>
              <p>requested: <code>{connection.requestedProvider}</code> / active: <code>{connection.provider}</code>{connection.model ? <> (<code>{connection.model}</code>)</> : null}</p>
              <p>{connection.usedModel ? 'Live model connected' : 'Fallback generator in use'}</p>
              <p className="muted">{connection.providerReason}</p>
            </>
          ) : (
            <>
              <p>아직 Generate를 실행하지 않았습니다.</p>
              <p className="muted">현재 선택: <code>{provider}</code></p>
            </>
          )}
        </div>

        {actionError ? <div className="panel action-status error">{actionError}</div> : null}

        <div className="panel">
          <label className="label">Prompt</label>
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={5} />
        </div>

        <div className="panel">
          <label className="label">A2UI Source</label>
          <textarea value={source} onChange={(event) => setSource(event.target.value)} rows={18} />
        </div>

        <div className="panel analysis">
          <h3>Version Notes</h3>
          <ul>{(current?.summary ?? []).map((item) => <li key={item}>{item}</li>)}</ul>
          <h3>Renderer Notes</h3>
          <ul>{(current?.rendererNotes ?? []).map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      </section>

      <section className="right-pane">
        <div className="panel">
          <h3>Validation</h3>
          <div className={`validation ${validation?.valid ? 'ok' : 'bad'}`}>
            {validation?.valid ? 'Schema valid' : 'Schema issues detected'}
          </div>
          <ul className="issues">
            {(validation?.issues ?? []).map((issue) => <li key={`${issue.instancePath}-${issue.message}`}><code>{issue.instancePath}</code> {issue.message}</li>)}
          </ul>
        </div>
        <PreviewPane preview={preview} />
      </section>
    </main>
  );
}
