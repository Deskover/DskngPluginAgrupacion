import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanelOptionsEditorProps } from '@grafana/data';
import { Button, CodeEditor, Select } from '@grafana/ui';
import { css } from '@emotion/css';
import prettier from 'prettier/standalone';
import babel from 'prettier/plugins/babel';
import estree from 'prettier/plugins/estree';
import htmlPlugin from 'prettier/plugins/html';
import postcss from 'prettier/plugins/postcss';
import { SimpleOptions } from 'types';

type Props = PanelOptionsEditorProps<string>;

type ChartType = 'chart' | 'html' | 'widget';
type CodeKey = 'code' | 'codigo' | 'funcion';
type HtmlKey = 'html' | 'contenidoHtml' | 'template' | 'plantilla';
type CssKey = 'css' | 'estilos';
type JsKey = 'js' | 'script' | CodeKey;

type ChartEntry = {
  id: string;
  label: string;
  chartType: ChartType;
  code: string;
  codeKey: CodeKey;
  html: string;
  htmlKey: HtmlKey;
  css: string;
  cssKey: CssKey;
  js: string;
  jsKey: JsKey;
  categoryIndex: number;
  sectionIndex: number;
  chartIndex: number;
  categoriesKey: 'categories' | 'categorias' | null;
  sectionsKey: 'sections' | 'secciones';
  chartsKey: 'charts' | 'graficas' | 'graficos';
  rootIsArray: boolean;
};


const getCodeKey = (chart: any): CodeKey => {
  if (typeof chart?.code === 'string') return 'code';
  if (typeof chart?.codigo === 'string') return 'codigo';
  if (typeof chart?.funcion === 'string') return 'funcion';
  return 'codigo';
};

const getChartType = (chart: any): ChartType => {
  const typeRaw = String(chart?.type ?? chart?.tipo ?? chart?.componentType ?? chart?.componente ?? chart?.component ?? 'chart')
    .trim()
    .toLowerCase();
  if (typeRaw === 'widget' || typeRaw === 'interactive' || typeRaw === 'html-widget') {
    return 'widget';
  }
  return typeRaw === 'html' || typeRaw === 'table' || typeRaw === 'tabla' ? 'html' : 'chart';
};

const getHtmlKey = (chart: any): HtmlKey => {
  if (typeof chart?.html === 'string') return 'html';
  if (typeof chart?.contenidoHtml === 'string') return 'contenidoHtml';
  if (typeof chart?.template === 'string') return 'template';
  if (typeof chart?.plantilla === 'string') return 'plantilla';
  return 'html';
};

const getCssKey = (chart: any): CssKey => {
  if (typeof chart?.css === 'string') return 'css';
  if (typeof chart?.estilos === 'string') return 'estilos';
  return 'css';
};

const getJsKey = (chart: any): JsKey => {
  if (typeof chart?.js === 'string') return 'js';
  if (typeof chart?.script === 'string') return 'script';
  if (typeof chart?.code === 'string') return 'code';
  if (typeof chart?.codigo === 'string') return 'codigo';
  if (typeof chart?.funcion === 'string') return 'funcion';
  return 'js';
};

const extractCharts = (parsed: any): ChartEntry[] => {
  const rootIsArray = Array.isArray(parsed);
  const categoriesKey: ChartEntry['categoriesKey'] = rootIsArray
    ? null
    : parsed?.categories
      ? 'categories'
      : parsed?.categorias
        ? 'categorias'
        : null;
  const categories = rootIsArray ? parsed : categoriesKey ? parsed?.[categoriesKey] : null;
  if (!Array.isArray(categories)) return [];

  const entries: ChartEntry[] = [];
  categories.forEach((category, categoryIndex) => {
    const sectionsKey: ChartEntry['sectionsKey'] = category?.sections ? 'sections' : 'secciones';
    const sections = category?.[sectionsKey];
    if (!Array.isArray(sections)) return;
    sections.forEach((section, sectionIndex) => {
      const chartsKey: ChartEntry['chartsKey'] = section?.charts
        ? 'charts'
        : section?.graficas
          ? 'graficas'
          : 'graficos';
      const charts = section?.[chartsKey];
      if (!Array.isArray(charts)) return;
      charts.forEach((chart, chartIndex) => {
        const chartType = getChartType(chart);
        const codeKey = getCodeKey(chart);
        const code = chart?.[codeKey] ?? '';
        const htmlKey = getHtmlKey(chart);
        const cssKey = getCssKey(chart);
        const jsKey = getJsKey(chart);
        const label = `${category?.title ?? category?.titulo ?? category?.key ?? category?.clave ?? categoryIndex} / ${
          section?.title ?? section?.titulo ?? section?.key ?? section?.clave ?? sectionIndex
        } / ${chart?.title ?? chart?.titulo ?? chart?.key ?? chart?.clave ?? chartIndex}`;
        entries.push({
          id: `${categoryIndex}.${sectionIndex}.${chartIndex}`,
          label,
          chartType,
          code,
          codeKey,
          html: String(chart?.[htmlKey] ?? ''),
          htmlKey,
          css: String(chart?.[cssKey] ?? ''),
          cssKey,
          js: String(chart?.[jsKey] ?? ''),
          jsKey,
          categoryIndex,
          sectionIndex,
          chartIndex,
          categoriesKey,
          sectionsKey,
          chartsKey,
          rootIsArray,
        });
      });
    });
  });
  return entries;
};

const updateChartField = (parsed: any, entry: ChartEntry, field: 'code' | 'html' | 'css' | 'js', nextValue: string) => {
  const clone = JSON.parse(JSON.stringify(parsed));
  const categories = entry.rootIsArray ? clone : clone?.[entry.categoriesKey as string];
  if (!Array.isArray(categories)) return clone;
  const category = categories[entry.categoryIndex];
  if (!category) return clone;
  const sections = category?.[entry.sectionsKey];
  if (!Array.isArray(sections)) return clone;
  const section = sections[entry.sectionIndex];
  if (!section) return clone;
  const charts = section?.[entry.chartsKey];
  if (!Array.isArray(charts)) return clone;
  const chart = charts[entry.chartIndex];
  if (!chart) return clone;
  if (field === 'code') {
    chart[entry.codeKey] = nextValue;
  } else if (field === 'html') {
    chart[entry.htmlKey] = nextValue;
  } else if (field === 'css') {
    chart[entry.cssKey] = nextValue;
  } else {
    chart[entry.jsKey] = nextValue;
  }
  return clone;
};

const parseJsonSafe = (raw: string): { ok: true; value: any } | { ok: false } => {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false };
  }
};

const isUsablePanelConfig = (parsed: any): boolean => {
  if (Array.isArray(parsed)) return true;
  return Array.isArray(parsed?.categories) || Array.isArray(parsed?.categorias);
};

const extractConfigCandidate = (raw: unknown): unknown => {
  if (!raw || typeof raw !== 'object') return raw;

  const asRecord = raw as Record<string, any>;
  if (isUsablePanelConfig(asRecord)) {
    return asRecord;
  }

  const directConfig = asRecord.json ?? asRecord.configJson ?? asRecord.config ?? asRecord.panelConfig;
  if (directConfig !== undefined) {
    return directConfig;
  }

  const nestedData = asRecord.data;
  if (nestedData && typeof nestedData === 'object') {
    const nestedRecord = nestedData as Record<string, any>;
    if (isUsablePanelConfig(nestedRecord)) {
      return nestedRecord;
    }
    const nestedConfig =
      nestedRecord.json ?? nestedRecord.configJson ?? nestedRecord.config ?? nestedRecord.panelConfig;
    if (nestedConfig !== undefined) {
      return nestedConfig;
    }
  }

  return raw;
};

const resolveUsablePanelConfig = (raw: unknown): any | null => {
  const candidate = extractConfigCandidate(raw);

  if (typeof candidate === 'string') {
    const parsed = parseJsonSafe(candidate);
    if (!parsed.ok) return null;
    return resolveUsablePanelConfig(parsed.value);
  }

  if (candidate !== raw) {
    return resolveUsablePanelConfig(candidate);
  }

  return isUsablePanelConfig(candidate) ? candidate : null;
};

export const ConfigJsonEditor: React.FC<Props> = ({ value, onChange, context }) => {
  const [jsonEditorHeight, setJsonEditorHeight] = useState<number>(420);
  const [codeEditorHeight, setCodeEditorHeight] = useState<number>(340);
  const [localJson, setLocalJson] = useState(value ?? '');
  const [remoteJson, setRemoteJson] = useState<string>('');
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const lastHydratedRemoteRef = useRef<string>('');
  const [selectedId, setSelectedId] = useState<string>('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const options = (context?.options as SimpleOptions | undefined) ?? undefined;
  const configJsonEndpoint = (options?.configJsonEndpoint ?? '').trim();

  useEffect(() => {
    setLocalJson(value ?? '');
  }, [value]);

  const localParsed = useMemo(() => {
    if (!localJson) return null;
    const parsed = parseJsonSafe(localJson);
    if (!parsed.ok) return null;
    return parsed.value;
  }, [localJson]);
  const hasUsableLocalConfig = useMemo(() => (localParsed ? Boolean(resolveUsablePanelConfig(localParsed)) : false), [localParsed]);

  useEffect(() => {
    let isCancelled = false;
    const loadRemote = async () => {
      if (hasUsableLocalConfig || !configJsonEndpoint) {
        setRemoteJson('');
        setRemoteError(null);
        setRemoteLoading(false);
        return;
      }
      try {
        setRemoteLoading(true);
        setRemoteError(null);
        const endpointUrl = context?.replaceVariables
          ? context.replaceVariables(configJsonEndpoint)
          : configJsonEndpoint;
        const response = await fetch(endpointUrl);
        if (!response.ok) {
          throw new Error(`Error HTTP ${response.status} al consultar ${endpointUrl}`);
        }
        const contentType = response.headers.get('content-type') ?? '';
        const payload = contentType.includes('application/json') ? await response.json() : await response.text();
        const parsedPayload = typeof payload === 'string' ? parseJsonSafe(payload) : { ok: true as const, value: payload };
        const usableConfig = parsedPayload.ok ? resolveUsablePanelConfig(parsedPayload.value) : null;
        if (!usableConfig) {
          throw new Error('El endpoint debe responder un JSON con "categories" o "categorias" como arreglo.');
        }
        if (isCancelled) return;
        setRemoteJson(JSON.stringify(usableConfig, null, 2));
      } catch (error) {
        if (isCancelled) return;
        const message = error instanceof Error ? error.message : 'No se pudo cargar el JSON remoto.';
        setRemoteJson('');
        setRemoteError(message);
      } finally {
        if (!isCancelled) {
          setRemoteLoading(false);
        }
      }
    };
    loadRemote();
    return () => {
      isCancelled = true;
    };
  }, [configJsonEndpoint, context?.replaceVariables, hasUsableLocalConfig]);

  useEffect(() => {
    if (!remoteJson) return;
    if (hasUsableLocalConfig) return;
    if ((localJson ?? '').trim().length > 0) return;
    if (lastHydratedRemoteRef.current === remoteJson) return;

    lastHydratedRemoteRef.current = remoteJson;
    setLocalJson(remoteJson);
    onChange(remoteJson);
  }, [hasUsableLocalConfig, localJson, onChange, remoteJson]);

  const effectiveJson = useMemo(() => {
    if (hasUsableLocalConfig) return localJson;
    return remoteJson || localJson;
  }, [hasUsableLocalConfig, localJson, remoteJson]);

  const parsed = useMemo(() => {
    if (!effectiveJson) return null;
    const safe = parseJsonSafe(effectiveJson);
    return safe.ok ? safe.value : null;
  }, [effectiveJson]);

  const parseError = useMemo(() => {
    if (remoteError) return remoteError;
    if (!effectiveJson) return null;
    if (!parsed) return 'JSON invalido. Corrige antes de editar el codigo.';
    return null;
  }, [effectiveJson, parsed, remoteError]);

  const chartEntries = useMemo(() => (parsed ? extractCharts(parsed) : []), [parsed]);

  useEffect(() => {
    if (!chartEntries.length) {
      setSelectedId('');
      return;
    }
    if (!chartEntries.some((entry) => entry.id === selectedId)) {
      setSelectedId(chartEntries[0].id);
    }
  }, [chartEntries, selectedId]);

  const selectedEntry = chartEntries.find((entry) => entry.id === selectedId) ?? null;

  const onValueChange = useCallback(
    (next?: string) => {
      const nextValue = next ?? '';
      setLocalJson(nextValue);
      onChange(nextValue);
    },
    [onChange]
  );

  const onCodeChange = useCallback(
    (next?: string) => {
      if (!parsed || !selectedEntry) return;
      const updated = updateChartField(parsed, selectedEntry, 'code', next ?? '');
      const nextJson = JSON.stringify(updated, null, 2);
      setLocalJson(nextJson);
      onChange(nextJson);
    },
    [onChange, parsed, selectedEntry]
  );

  const onHtmlFieldChange = useCallback(
    (field: 'html' | 'css' | 'js', next?: string) => {
      if (!parsed || !selectedEntry) return;
      const updated = updateChartField(parsed, selectedEntry, field, next ?? '');
      const nextJson = JSON.stringify(updated, null, 2);
      setLocalJson(nextJson);
      onChange(nextJson);
    },
    [onChange, parsed, selectedEntry]
  );

  const onFormatCode = useCallback(async () => {
    if (!parsed || !selectedEntry) return;
    try {
      setCodeError(null);
      const isMarkupComponent = selectedEntry.chartType === 'html' || selectedEntry.chartType === 'widget';
      if (!isMarkupComponent) {
        const raw = selectedEntry.code ?? '';
        const wrapped = `function __chart(data, echarts, vars, context) {\n${raw}\n}`;
        const formatted = await prettier.format(wrapped, {
          parser: 'babel',
          plugins: [babel, estree],
          semi: true,
          singleQuote: true,
        });
        const start = formatted.indexOf('{') + 1;
        const end = formatted.lastIndexOf('}');
        const body = formatted.slice(start, end).replace(/^\s*\n/, '').replace(/\n\s*$/, '');
        onCodeChange(body);
        return;
      }

      const formattedHtml = await prettier.format(selectedEntry.html ?? '', {
        parser: 'html',
        plugins: [htmlPlugin],
      });
      const formattedCss = await prettier.format(selectedEntry.css ?? '', {
        parser: 'css',
        plugins: [postcss],
      });
      const wrappedJs = `function __html(data, vars, baseHtml, baseCss) {\n${selectedEntry.js ?? ''}\n}`;
      const formattedJs = await prettier.format(wrappedJs, {
        parser: 'babel',
        plugins: [babel, estree],
        semi: true,
        singleQuote: true,
      });
      const jsStart = formattedJs.indexOf('{') + 1;
      const jsEnd = formattedJs.lastIndexOf('}');
      const jsBody = formattedJs.slice(jsStart, jsEnd).replace(/^\s*\n/, '').replace(/\n\s*$/, '');

      const withHtml = updateChartField(parsed, selectedEntry, 'html', formattedHtml.trim());
      const withCss = updateChartField(withHtml, selectedEntry, 'css', formattedCss.trim());
      const withJs = updateChartField(withCss, selectedEntry, 'js', jsBody);
      const nextJson = JSON.stringify(withJs, null, 2);
      setLocalJson(nextJson);
      onChange(nextJson);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo formatear el codigo';
      setCodeError(message);
    }
  }, [onChange, onCodeChange, parsed, selectedEntry]);

  const adjustJsonHeight = useCallback((delta: number) => {
    setJsonEditorHeight((prev) => Math.max(240, Math.min(900, prev + delta)));
  }, []);

  const adjustCodeHeight = useCallback((delta: number) => {
    setCodeEditorHeight((prev) => Math.max(220, Math.min(900, prev + delta)));
  }, []);

  return (
    <div className={css`display: flex; flex-direction: column; gap: 12px;`}>
      <div className={css`display: flex; align-items: center; justify-content: flex-end; gap: 8px;`}>
        <span className={css`font-size: 12px; color: #8ea2bd; min-width: 120px; text-align: right;`}>
          Alto JSON: {jsonEditorHeight}px
        </span>
        <Button size="sm" variant="secondary" onClick={() => adjustJsonHeight(-80)}>
          -80
        </Button>
        <Button size="sm" variant="secondary" onClick={() => adjustJsonHeight(80)}>
          +80
        </Button>
      </div>
      <CodeEditor
        language="json"
        height={`${jsonEditorHeight}px`}
        width="100%"
        value={effectiveJson}
        onBlur={onValueChange}
        onSave={onValueChange}
        showMiniMap
        showLineNumbers
      />
      {!hasUsableLocalConfig && configJsonEndpoint && (
        <div
          className={css`
            font-size: 12px;
            color: #5f6b7a;
          `}
        >
          {remoteLoading
            ? 'Cargando JSON desde endpoint alternativo...'
            : remoteJson
              ? 'Mostrando JSON desde endpoint alternativo. Si editas y guardas, se guardara en Panel JSON local.'
              : 'No se pudo usar el endpoint alternativo; corrige el endpoint o el JSON local.'}
        </div>
      )}

      <div className={css`display: flex; flex-direction: column; gap: 8px;`}>
        <div className={css`display: flex; align-items: center; justify-content: space-between; gap: 8px;`}>
          <div className={css`font-size: 12px; font-weight: 600; color: #cdd6e3;`}>
            {selectedEntry?.chartType === 'html'
              ? 'Editor de componente HTML'
              : selectedEntry?.chartType === 'widget'
                ? 'Editor de widget interactivo'
                : 'Editor de codigo de grafica'}
          </div>
          <div className={css`display: flex; align-items: center; gap: 8px;`}>
            <span className={css`font-size: 12px; color: #8ea2bd; min-width: 125px; text-align: right;`}>
              Alto codigo: {codeEditorHeight}px
            </span>
            <Button size="sm" variant="secondary" onClick={() => adjustCodeHeight(-80)}>
              -80
            </Button>
            <Button size="sm" variant="secondary" onClick={() => adjustCodeHeight(80)}>
              +80
            </Button>
            <Button size="sm" variant="secondary" onClick={onFormatCode} disabled={!selectedEntry}>
              Formatear codigo
            </Button>
          </div>
        </div>
        <Select
          options={chartEntries.map((entry) => ({ label: entry.label, value: entry.id }))}
          value={selectedId}
          onChange={(option) => setSelectedId(option?.value ?? '')}
          isClearable
          placeholder="Selecciona una grafica o componente"
        />
        {parseError && (
          <div className={css`font-size: 12px; color: #c0392b;`}>
            {parseError}
          </div>
        )}
        {codeError && (
          <div className={css`font-size: 12px; color: #c0392b;`}>
            {codeError}
          </div>
        )}
        {selectedEntry?.chartType === 'html' || selectedEntry?.chartType === 'widget' ? (
          <div className={css`display: flex; flex-direction: column; gap: 10px;`}>
            <div className={css`font-size: 12px; font-weight: 600; color: #cdd6e3;`}>HTML</div>
            <CodeEditor
              language="html"
              height={`${codeEditorHeight}px`}
              width="100%"
              value={selectedEntry?.html ?? ''}
              onBlur={(next) => onHtmlFieldChange('html', next)}
              onSave={(next) => onHtmlFieldChange('html', next)}
              showMiniMap
              showLineNumbers
            />
            <div className={css`font-size: 12px; font-weight: 600; color: #cdd6e3;`}>CSS</div>
            <CodeEditor
              language="css"
              height={`${codeEditorHeight}px`}
              width="100%"
              value={selectedEntry?.css ?? ''}
              onBlur={(next) => onHtmlFieldChange('css', next)}
              onSave={(next) => onHtmlFieldChange('css', next)}
              showMiniMap
              showLineNumbers
            />
            <div className={css`font-size: 12px; font-weight: 600; color: #cdd6e3;`}>JS</div>
            <CodeEditor
              language="javascript"
              height={`${codeEditorHeight}px`}
              width="100%"
              value={selectedEntry?.js ?? ''}
              onBlur={(next) => onHtmlFieldChange('js', next)}
              onSave={(next) => onHtmlFieldChange('js', next)}
              showMiniMap
              showLineNumbers
            />
          </div>
        ) : (
          <CodeEditor
            language="javascript"
            height={`${codeEditorHeight}px`}
            width="100%"
            value={selectedEntry?.code ?? ''}
            onBlur={onCodeChange}
            onSave={onCodeChange}
            showMiniMap
            showLineNumbers
          />
        )}
      </div>
    </div>
  );
};
