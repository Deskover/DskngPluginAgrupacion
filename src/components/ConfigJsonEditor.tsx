import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PanelOptionsEditorProps } from '@grafana/data';
import { Button, CodeEditor, Select } from '@grafana/ui';
import { css } from '@emotion/css';
import prettier from 'prettier/standalone';
import babel from 'prettier/plugins/babel';
import estree from 'prettier/plugins/estree';

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

export const ConfigJsonEditor: React.FC<Props> = ({ value, onChange }) => {
  const [localJson, setLocalJson] = useState(value ?? '');
  const [selectedId, setSelectedId] = useState<string>('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);

  useEffect(() => {
    setLocalJson(value ?? '');
  }, [value]);

  const parsed = useMemo(() => {
    if (!localJson) {
      setParseError(null);
      return null;
    }
    try {
      const obj = JSON.parse(localJson);
      setParseError(null);
      return obj;
    } catch {
      setParseError('JSON invalido. Corrige antes de editar el codigo.');
      return null;
    }
  }, [localJson]);

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
        value={localJson}
        onBlur={onValueChange}
        onSave={onValueChange}
        showMiniMap
        showLineNumbers
      />

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
