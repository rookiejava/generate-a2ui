import {useEffect, useState} from 'react';
import {fetchAnalysis, generate, validate, type PreviewDocument, type RuntimeProviderInput} from './api';
import type {A2UIVersion, ProviderId, ValidationResult, VersionAnalysis} from '../../src/core/types';

const DEFAULT_PROMPT_BY_LANG: Record<Language, string> = {
  ko: '확인 버튼과 취소 버튼이 있는 경고창을 만들어줘',
  en: 'Create an alert dialog with Confirm and Cancel buttons.',
  es: 'Crea un cuadro de alerta con botones Confirmar y Cancelar.',
  ja: '確認ボタンとキャンセルボタンがあるアラートダイアログを作って。',
  zh: '创建一个包含确认和取消按钮的警告对话框。',
};

const SETTINGS_STORAGE_KEY = 'a2ui.runtimeSettings.v1';
const LANGUAGE_STORAGE_KEY = 'a2ui.language.v1';

type Page = 'studio' | 'settings';
type Language = 'ko' | 'en' | 'es' | 'ja' | 'zh';

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

const LANG_OPTIONS: {code: Language; label: string}[] = [
  {code: 'ko', label: '한국어'},
  {code: 'en', label: 'English'},
  {code: 'es', label: 'Español'},
  {code: 'ja', label: '日本語'},
  {code: 'zh', label: '中文'},
];

const TEXT: Record<Language, Record<string, string>> = {
  ko: {
    studio: 'Studio',
    settings: 'Settings',
    title: 'Prompt to versioned A2UI',
    settingsTitle: 'Model Settings',
    settingsDesc: '키/모델 설정은 Generate 요청 시에만 사용됩니다. 키 쿼터는 각 provider 정책을 따릅니다.',
    secureMode: '보안 모드 (세션 메모리 only)',
    persist: '이 브라우저에 설정 저장',
    connected: '연결 상태',
    notRun: '아직 Generate를 실행하지 않았습니다.',
    currentSelected: '현재 선택',
    liveConnected: 'Live model connected',
    fallbackUsed: 'Fallback generator in use',
    prompt: 'Prompt',
    source: 'A2UI Source',
    versionNotes: 'Version Notes',
    rendererNotes: 'Renderer Notes',
    validation: 'Validation',
    schemaValid: 'Schema valid',
    schemaInvalid: 'Schema issues detected',
    generate: 'Generate',
    generating: 'Generating...',
    validate: 'Validate',
    validating: 'Validating...',
    download: 'Download',
    previewEmpty: '생성 결과를 검증하면 미리보기가 표시됩니다.',
    downloadEmpty: '다운로드할 A2UI source가 없습니다.',
    generateFailed: 'Generate failed',
    validateFailed: 'Validate failed',
    requested: 'requested',
    active: 'active',
    lang: 'Language',
  },
  en: {
    studio: 'Studio',
    settings: 'Settings',
    title: 'Prompt to versioned A2UI',
    settingsTitle: 'Model Settings',
    settingsDesc: 'Keys and model settings are used only for Generate requests. Quotas follow each provider policy.',
    secureMode: 'Secure mode (session memory only)',
    persist: 'Save settings in this browser',
    connected: 'Connection Status',
    notRun: 'Generate has not run yet.',
    currentSelected: 'Current selection',
    liveConnected: 'Live model connected',
    fallbackUsed: 'Fallback generator in use',
    prompt: 'Prompt',
    source: 'A2UI Source',
    versionNotes: 'Version Notes',
    rendererNotes: 'Renderer Notes',
    validation: 'Validation',
    schemaValid: 'Schema valid',
    schemaInvalid: 'Schema issues detected',
    generate: 'Generate',
    generating: 'Generating...',
    validate: 'Validate',
    validating: 'Validating...',
    download: 'Download',
    previewEmpty: 'Run validation to render the preview.',
    downloadEmpty: 'No A2UI source to download.',
    generateFailed: 'Generate failed',
    validateFailed: 'Validate failed',
    requested: 'requested',
    active: 'active',
    lang: 'Language',
  },
  es: {
    studio: 'Estudio',
    settings: 'Configuración',
    title: 'Prompt a A2UI versionado',
    settingsTitle: 'Configuración de modelo',
    settingsDesc: 'Las claves y modelos se usan solo en Generate. Las cuotas dependen de cada proveedor.',
    secureMode: 'Modo seguro (solo memoria de sesión)',
    persist: 'Guardar configuración en este navegador',
    connected: 'Estado de conexión',
    notRun: 'Aún no se ejecutó Generate.',
    currentSelected: 'Selección actual',
    liveConnected: 'Modelo en vivo conectado',
    fallbackUsed: 'Usando generador fallback',
    prompt: 'Prompt',
    source: 'Fuente A2UI',
    versionNotes: 'Notas de versión',
    rendererNotes: 'Notas de renderizador',
    validation: 'Validación',
    schemaValid: 'Esquema válido',
    schemaInvalid: 'Problemas de esquema detectados',
    generate: 'Generar',
    generating: 'Generando...',
    validate: 'Validar',
    validating: 'Validando...',
    download: 'Descargar',
    previewEmpty: 'Valida el resultado generado para ver la vista previa.',
    downloadEmpty: 'No hay fuente A2UI para descargar.',
    generateFailed: 'Error al generar',
    validateFailed: 'Error al validar',
    requested: 'solicitado',
    active: 'activo',
    lang: 'Idioma',
  },
  ja: {
    studio: 'スタジオ',
    settings: '設定',
    title: 'Prompt to versioned A2UI',
    settingsTitle: 'モデル設定',
    settingsDesc: 'キーとモデル設定は Generate リクエスト時のみ使用されます。クォータは各プロバイダのポリシーに従います。',
    secureMode: 'セキュアモード（セッションメモリのみ）',
    persist: 'このブラウザに設定を保存',
    connected: '接続状態',
    notRun: 'まだ Generate を実行していません。',
    currentSelected: '現在の選択',
    liveConnected: 'ライブモデル接続中',
    fallbackUsed: 'フォールバック生成を使用中',
    prompt: 'プロンプト',
    source: 'A2UI ソース',
    versionNotes: 'バージョンノート',
    rendererNotes: 'レンダラーノート',
    validation: '検証',
    schemaValid: 'スキーマは有効です',
    schemaInvalid: 'スキーマ問題を検出しました',
    generate: '生成',
    generating: '生成中...',
    validate: '検証',
    validating: '検証中...',
    download: 'ダウンロード',
    previewEmpty: '生成結果を検証するとプレビューが表示されます。',
    downloadEmpty: 'ダウンロードする A2UI ソースがありません。',
    generateFailed: '生成に失敗しました',
    validateFailed: '検証に失敗しました',
    requested: 'requested',
    active: 'active',
    lang: '言語',
  },
  zh: {
    studio: '工作台',
    settings: '设置',
    title: 'Prompt 到版本化 A2UI',
    settingsTitle: '模型设置',
    settingsDesc: '密钥和模型设置仅在 Generate 请求时使用。配额遵循各提供商策略。',
    secureMode: '安全模式（仅会话内存）',
    persist: '在此浏览器保存设置',
    connected: '连接状态',
    notRun: '尚未执行 Generate。',
    currentSelected: '当前选择',
    liveConnected: '实时模型已连接',
    fallbackUsed: '正在使用回退生成器',
    prompt: '提示词',
    source: 'A2UI 源码',
    versionNotes: '版本说明',
    rendererNotes: '渲染说明',
    validation: '校验',
    schemaValid: 'Schema 有效',
    schemaInvalid: '检测到 Schema 问题',
    generate: '生成',
    generating: '生成中...',
    validate: '校验',
    validating: '校验中...',
    download: '下载',
    previewEmpty: '校验生成结果后将显示预览。',
    downloadEmpty: '没有可下载的 A2UI 源码。',
    generateFailed: '生成失败',
    validateFailed: '校验失败',
    requested: 'requested',
    active: 'active',
    lang: '语言',
  },
};

const ERROR_TEXT: Record<Language, Record<string, string>> = {
  ko: {network: '네트워크 연결을 확인해 주세요.', version: '지원되지 않는 버전입니다. 버전을 다시 선택해 주세요.', provider: '지원되지 않는 모델 제공자 설정입니다.', schema: '스키마 검증에 실패했습니다. 소스 형식을 확인해 주세요.', runtime: '모델 호출 중 오류가 발생하여 fallback으로 전환되었을 수 있습니다.', unknown: '요청 처리 중 오류가 발생했습니다.'},
  en: {network: 'Please check your network connection.', version: 'Unsupported version. Please select a valid version.', provider: 'Unsupported provider configuration.', schema: 'Schema validation failed. Please check the source format.', runtime: 'Model call failed and may have fallen back to the local generator.', unknown: 'An error occurred while processing the request.'},
  es: {network: 'Verifica tu conexión de red.', version: 'Versión no compatible. Selecciona una versión válida.', provider: 'Configuración de proveedor no compatible.', schema: 'Falló la validación del esquema. Revisa el formato de la fuente.', runtime: 'La llamada al modelo falló y puede haber usado el generador fallback.', unknown: 'Ocurrió un error al procesar la solicitud.'},
  ja: {network: 'ネットワーク接続を確認してください。', version: '未対応のバージョンです。対応バージョンを選択してください。', provider: '未対応のプロバイダ設定です。', schema: 'スキーマ検証に失敗しました。ソース形式を確認してください。', runtime: 'モデル呼び出しに失敗し、フォールバック生成に切り替わった可能性があります。', unknown: 'リクエスト処理中にエラーが発生しました。'},
  zh: {network: '请检查网络连接。', version: '不支持的版本，请重新选择。', provider: '不支持的提供方配置。', schema: 'Schema 校验失败，请检查源码格式。', runtime: '模型调用失败，可能已切换到回退生成器。', unknown: '请求处理时发生错误。'},
};

function localizeApiError(rawMessage: string, language: Language): string {
  const message = rawMessage.toLowerCase();
  const text = ERROR_TEXT[language];
  if (message.includes('failed to fetch') || message.includes('networkerror')) return text.network;
  if (message.includes('unsupported a2ui version') || message.includes('unsupported version')) return text.version;
  if (message.includes('unsupported provider')) return text.provider;
  if (message.includes('validation') || message.includes('schema')) return text.schema;
  if (message.includes('fallback') || message.includes('request failed with status')) return text.runtime;
  return rawMessage || text.unknown;
}

function PreviewPane({preview, emptyLabel}: {preview: PreviewDocument | null; emptyLabel: string}) {
  if (!preview) return <div className="preview-shell empty">{emptyLabel}</div>;

  const renderNode = (id: string): any => {
    const node = preview.components[id];
    if (!node) return null;

    const component = String(node.component);
    const children = Array.isArray(node.children) ? (node.children as string[]) : [];
    const style = {
      ['--accent' as any]: preview.theme.primaryColor ?? '#1d4ed8',
      ['--font-stack' as any]: preview.theme.font ?? 'Pretendard, system-ui, sans-serif',
    } as any;

    if (component === 'Text') return <p key={id} className={`node text ${String(node.variant ?? 'body')}`} style={style}>{resolveValue(node.text, preview.data)}</p>;
    if (component === 'Button') return <button key={id} className={`node button ${String(node.variant ?? 'secondary')}`} style={style}>{renderNode(String(node.child))}</button>;
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
          <input type={node.variant === 'obscured' ? 'password' : 'text'} defaultValue={resolveValue(node.value ?? node.text, preview.data)} placeholder={resolveValue(node.label, preview.data)} />
        </label>
      );
    }
    if (component === 'Card') return <section key={id} className="node card" style={style}>{renderNode(String(node.child))}</section>;
    if (component === 'Modal') {
      return (
        <section key={id} className="node modal" style={style}>
          <div className="modal-trigger">{renderNode(String(node.trigger))}</div>
          <div className="modal-body">{renderNode(String(node.content))}</div>
        </section>
      );
    }
    if (component === 'Row' || component === 'Column') return <section key={id} className={`node stack ${component === 'Row' ? 'row' : 'column'}`} style={style}>{children.map((childId) => renderNode(childId))}</section>;

    return <section key={id} className="node unknown" style={style}><strong>{component}</strong></section>;
  };

  return (
    <div className="preview-shell">
      <div className="preview-head"><span>{preview.version}</span><span>{preview.surfaceId}</span></div>
      <div className="preview-canvas">{renderNode(preview.rootId)}</div>
      {preview.functionCalls.length > 0 ? <div className="preview-log"><h4>Function Calls</h4><pre>{JSON.stringify(preview.functionCalls, null, 2)}</pre></div> : null}
    </div>
  );
}

export function App() {
  const [page, setPage] = useState<Page>('studio');
  const [language, setLanguage] = useState<Language>('ko');
  const [version, setVersion] = useState<A2UIVersion>('v0.10');
  const [provider, setProvider] = useState<ProviderId>('auto');
  const [providers, setProviders] = useState<ProviderId[]>(['auto', 'fallback', 'openai', 'gemini', 'claude']);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT_BY_LANG.ko);
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

  const t = (key: string) => TEXT[language][key] ?? key;

  useEffect(() => {
    fetchAnalysis().then((payload) => {
      setAnalysis(payload.versions);
      setProviders(payload.providers);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    try {
      const rawLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (rawLanguage && ['ko', 'en', 'es', 'ja', 'zh'].includes(rawLanguage)) {
        setLanguage(rawLanguage as Language);
        setPrompt(DEFAULT_PROMPT_BY_LANG[rawLanguage as Language]);
      }

      const rawSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings) as {persist: boolean; runtime: RuntimeProviderInput};
        if (parsed && typeof parsed === 'object') {
          setPersistSettings(Boolean(parsed.persist));
          setRuntime(parsed.runtime ?? {});
        }
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

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

  function handleDownloadSource() {
    const payload = source.trim();
    if (!payload) {
      setActionError(t('downloadEmpty'));
      return;
    }

    const extension = payload.startsWith('{') || payload.startsWith('[') ? 'json' : 'yaml';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `a2ui-${version}-${timestamp}.${extension}`;
    const blob = new Blob([payload], {type: 'application/json;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleGenerate() {
    setIsGenerating(true);
    setActionError(null);
    try {
      const result = await generate(prompt, version, provider, runtime);
      setSource(result.serialized);
      setConnection({requestedProvider: result.requestedProvider, provider: result.provider, providerReason: result.providerReason, model: result.model, usedModel: result.usedModel});
      const next = await validate(version, result.serialized);
      setPreview(next.preview);
      setValidation(next.validation);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('generateFailed');
      setActionError(localizeApiError(message, language));
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
      const message = error instanceof Error ? error.message : t('validateFailed');
      setActionError(localizeApiError(message, language));
    } finally {
      setIsValidating(false);
    }
  }

  const current = analysis.find((entry) => entry.version === version);

  return (
    <main className="workspace-shell">
      <header className="top-nav">
        <button className={page === 'studio' ? 'active' : ''} onClick={() => setPage('studio')}>{t('studio')}</button>
        <button className={page === 'settings' ? 'active' : ''} onClick={() => setPage('settings')}>{t('settings')}</button>
        <div className="lang-switch">
          <label>{t('lang')}</label>
          <select value={language} onChange={(event) => setLanguage(event.target.value as Language)}>
            {LANG_OPTIONS.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
          </select>
        </div>
      </header>

      {page === 'settings' ? (
        <section className="settings-page">
          <div className="panel settings-full">
            <h2>{t('settingsTitle')}</h2>
            <p className="muted">{t('settingsDesc')}</p>
            <label className="persist-row">
              <input type="checkbox" checked={secureMode} onChange={(event) => setSecureMode(event.target.checked)} />
              <span>{t('secureMode')}</span>
            </label>
            <label className="persist-row">
              <input type="checkbox" checked={persistSettings} disabled={secureMode} onChange={(event) => setPersistSettings(event.target.checked)} />
              <span>{t('persist')}</span>
            </label>
            <div className="settings-grid">
              <label><span>OpenAI Key</span><input type="password" value={runtime.openaiApiKey ?? ''} onChange={(event) => updateRuntime('openaiApiKey', event.target.value)} placeholder="sk-..." /></label>
              <label><span>OpenAI Model</span><input value={runtime.openaiModel ?? ''} onChange={(event) => updateRuntime('openaiModel', event.target.value)} placeholder="gpt-4.1-mini" /></label>
              <label><span>Gemini Key</span><input type="password" value={runtime.geminiApiKey ?? ''} onChange={(event) => updateRuntime('geminiApiKey', event.target.value)} placeholder="AIza..." /></label>
              <label><span>Gemini Model</span><input value={runtime.geminiModel ?? ''} onChange={(event) => updateRuntime('geminiModel', event.target.value)} placeholder="gemini-2.5-flash" /></label>
              <label><span>Claude Key</span><input type="password" value={runtime.anthropicApiKey ?? ''} onChange={(event) => updateRuntime('anthropicApiKey', event.target.value)} placeholder="sk-ant-..." /></label>
              <label><span>Claude Model</span><input value={runtime.anthropicModel ?? ''} onChange={(event) => updateRuntime('anthropicModel', event.target.value)} placeholder="claude-3-5-sonnet-latest" /></label>
            </div>
          </div>
        </section>
      ) : (
        <div className="app-shell">
          <section className="left-pane">
            <div className="panel hero">
              <div>
                <p className="eyebrow">A2UI Studio</p>
                <h1>{t('title')}</h1>
              </div>
              <div className="controls">
                <select value={version} onChange={(event) => setVersion(event.target.value as A2UIVersion)}>
                  <option value="v0.8">v0.8</option><option value="v0.9">v0.9</option><option value="v0.10">v0.10</option>
                </select>
                <select value={provider} onChange={(event) => setProvider(event.target.value as ProviderId)}>
                  {providers.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <button onClick={handleGenerate} disabled={isGenerating || isValidating}>{isGenerating ? t('generating') : t('generate')}</button>
                <button className="secondary" onClick={handleValidate} disabled={isGenerating || isValidating}>{isValidating ? t('validating') : t('validate')}</button>
                <button className="secondary" onClick={handleDownloadSource} disabled={isGenerating || isValidating || !source.trim()}>{t('download')}</button>
              </div>
            </div>

            <div className="panel action-status info">
              <strong>{t('connected')}</strong>
              {connection ? (
                <>
                  <p>{t('requested')}: <code>{connection.requestedProvider}</code> / {t('active')}: <code>{connection.provider}</code>{connection.model ? <> (<code>{connection.model}</code>)</> : null}</p>
                  <p>{connection.usedModel ? t('liveConnected') : t('fallbackUsed')}</p>
                  <p className="muted">{connection.providerReason}</p>
                </>
              ) : (
                <>
                  <p>{t('notRun')}</p>
                  <p className="muted">{t('currentSelected')}: <code>{provider}</code></p>
                </>
              )}
            </div>

            {actionError ? <div className="panel action-status error">{actionError}</div> : null}

            <div className="panel">
              <label className="label">{t('prompt')}</label>
              <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={5} />
            </div>

            <div className="panel">
              <label className="label">{t('source')}</label>
              <textarea value={source} onChange={(event) => setSource(event.target.value)} rows={18} />
            </div>

            <div className="panel analysis">
              <h3>{t('versionNotes')}</h3>
              <ul>{(current?.summary ?? []).map((item) => <li key={item}>{item}</li>)}</ul>
              <h3>{t('rendererNotes')}</h3>
              <ul>{(current?.rendererNotes ?? []).map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </section>

          <section className="right-pane">
            <div className="panel">
              <h3>{t('validation')}</h3>
              <div className={`validation ${validation?.valid ? 'ok' : 'bad'}`}>{validation?.valid ? t('schemaValid') : t('schemaInvalid')}</div>
              <ul className="issues">{(validation?.issues ?? []).map((issue) => <li key={`${issue.instancePath}-${issue.message}`}><code>{issue.instancePath}</code> {issue.message}</li>)}</ul>
            </div>
            <PreviewPane preview={preview} emptyLabel={t('previewEmpty')} />
          </section>
        </div>
      )}
    </main>
  );
}






