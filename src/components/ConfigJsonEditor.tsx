import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PanelOptionsEditorProps } from '@grafana/data';
import { Button, CodeEditor, Select } from '@grafana/ui';
import { css } from '@emotion/css';
import prettier from 'prettier/standalone';
import babel from 'prettier/plugins/babel';
import estree from 'prettier/plugins/estree';
import { SimpleOptions } from 'types';

type Props = PanelOptionsEditorProps<string>;

type ChartEntry = {
  id: string;
  label: string;
  code: string;
  codeKey: 'code' | 'codigo' | 'funcion';
  categoryIndex: number;
  sectionIndex: number;
  chartIndex: number;
  categoriesKey: 'categories' | 'categorias' | null;
  sectionsKey: 'sections' | 'secciones';
  chartsKey: 'charts' | 'graficas' | 'graficos';
  rootIsArray: boolean;
};

const getCodeKey = (chart: any): ChartEntry['codeKey'] => {
  if (typeof chart?.code === 'string') return 'code';
  if (typeof chart?.codigo === 'string') return 'codigo';
  if (typeof chart?.funcion === 'string') return 'funcion';
  return 'codigo';
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
        const codeKey = getCodeKey(chart);
        const code = chart?.[codeKey] ?? '';
        const label = `${category?.title ?? category?.titulo ?? category?.key ?? category?.clave ?? categoryIndex} / ${
          section?.title ?? section?.titulo ?? section?.key ?? section?.clave ?? sectionIndex
        } / ${chart?.title ?? chart?.titulo ?? chart?.key ?? chart?.clave ?? chartIndex}`;
        entries.push({
          id: `${categoryIndex}.${sectionIndex}.${chartIndex}`,
          label,
          code,
          codeKey,
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

const updateChartCode = (parsed: any, entry: ChartEntry, nextCode: string) => {
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
  chart[entry.codeKey] = nextCode;
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

export const ConfigJsonEditor: React.FC<Props> = ({ value, onChange, context }) => {
  const [localJson, setLocalJson] = useState(value ?? '');
  const [remoteJson, setRemoteJson] = useState<string>('');
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(false);
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
  const hasUsableLocalConfig = useMemo(() => (localParsed ? isUsablePanelConfig(localParsed) : false), [localParsed]);

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
        if (!parsedPayload.ok || !isUsablePanelConfig(parsedPayload.value)) {
          throw new Error('El endpoint debe responder un JSON con "categories" o "categorias" como arreglo.');
        }
        if (isCancelled) return;
        setRemoteJson(JSON.stringify(parsedPayload.value, null, 2));
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
      const updated = updateChartCode(parsed, selectedEntry, next ?? '');
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
      const raw = selectedEntry.code ?? '';
      const wrapped = `function __chart(data, echarts, vars) {\n${raw}\n}`;
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
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo formatear el codigo';
      setCodeError(message);
    }
  }, [onCodeChange, parsed, selectedEntry]);

  return (
    <div className={css`display: flex; flex-direction: column; gap: 12px;`}>
      <CodeEditor
        language="json"
        height="320px"
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
            Editor de codigo de grafica
          </div>
          <Button size="sm" variant="secondary" onClick={onFormatCode} disabled={!selectedEntry}>
            Formatear codigo
          </Button>
        </div>
        <Select
          options={chartEntries.map((entry) => ({ label: entry.label, value: entry.id }))}
          value={selectedId}
          onChange={(option) => setSelectedId(option?.value ?? '')}
          isClearable
          placeholder="Selecciona una grafica con codigo"
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
        <CodeEditor
          language="javascript"
          height="260px"
          width="100%"
          value={selectedEntry?.code ?? ''}
          onBlur={onCodeChange}
          onSave={onCodeChange}
          showMiniMap
          showLineNumbers
        />
      </div>
    </div>
  );
};
