import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanelProps } from '@grafana/data';
import { SimpleOptions } from 'types';
import { css } from '@emotion/css';

import * as echarts from "echarts";
interface Props extends PanelProps<SimpleOptions> { }

type ChartConfig = {
  key: string;
  title: string;
  height: number;
  option: echarts.EChartsOption;
};

type AccordionConfig = {
  key: string;
  title: string;
  subtitle?: string;
  charts: ChartConfig[];
};

type CategoryKey = "abstencionismo" | "votoduro";

const chartsConfigAbstencionismo: AccordionConfig[] = [
  {
    key: "abst_nacional",
    title: "Abstencionismo Nacional",
    subtitle: "Datos generales y tendencia",
    charts: [
      {
        key: "abst_line",
        title: "Tendencia nacional",
        height: 280,
        option: {
          grid: { left: 32, right: 16, top: 24, bottom: 28 },
          tooltip: { trigger: "axis" },
          xAxis: { type: "category", data: ["2006", "2012", "2018", "2024"] },
          yAxis: { type: "value", min: 0, max: 100, axisLabel: { formatter: "{value}%" } },
          series: [{ type: "line", data: [38, 37, 36, 41], smooth: true, areaStyle: {} }],
        },
      },
      {
        key: "abst_scatter",
        title: "Relacion participacion",
        height: 280,
        option: {
          grid: { left: 36, right: 16, top: 24, bottom: 28 },
          tooltip: { trigger: "item" },
          xAxis: { type: "value", name: "Abstencionismo (%)" },
          yAxis: { type: "value", name: "Participacion (%)" },
          series: [
            {
              type: "scatter",
              data: [
                [35, 65],
                [40, 60],
                [45, 55],
                [50, 50],
                [55, 45],
              ],
            },
          ],
        },
      },
    ],
  },
  {
    key: "abst_partidos",
    title: "Abstencionismo por Partidos",
    subtitle: "Comparativos y composicion",
    charts: [
      {
        key: "abst_party_bar",
        title: "Comparativo por partido",
        height: 280,
        option: {
          grid: { left: 32, right: 16, top: 24, bottom: 28 },
          tooltip: { trigger: "axis" },
          xAxis: { type: "category", data: ["Partido Azul", "Partido Verde", "Partido Rojo", "Partido Naranja"] },
          yAxis: { type: "value", axisLabel: { formatter: "{value}%" } },
          series: [{ type: "bar", data: [42, 35, 47, 39], barMaxWidth: 36 }],
        },
      },
      {
        key: "abst_pie",
        title: "Composicion por partido",
        height: 280,
        option: {
          tooltip: { trigger: "item" },
          legend: { top: "bottom" },
          series: [
            {
              type: "pie",
              radius: ["40%", "70%"],
              data: [
                { name: "Partido Azul", value: 28 },
                { name: "Partido Verde", value: 22 },
                { name: "Partido Rojo", value: 30 },
                { name: "Partido Naranja", value: 20 },
              ],
              label: { formatter: "{b}: {d}%" },
            },
          ],
        },
      },
    ],
  },
];

const chartsConfigVotoDuroExtras: Record<string, ChartConfig[]> = {
  abst_nacional: [
    {
      key: "vd_line",
      title: "Tendencia voto duro",
      height: 280,
      option: {
        grid: { left: 32, right: 16, top: 24, bottom: 28 },
        tooltip: { trigger: "axis" },
        xAxis: { type: "category", data: ["2006", "2012", "2018", "2024"] },
        yAxis: { type: "value", min: 0, max: 100, axisLabel: { formatter: "{value}%" } },
        series: [{ type: "line", data: [28, 30, 33, 31], smooth: true, areaStyle: {} }],
      },
    },
    {
      key: "vd_bar",
      title: "Comparativo voto duro por region",
      height: 280,
      option: {
        grid: { left: 32, right: 16, top: 24, bottom: 28 },
        tooltip: { trigger: "axis" },
        xAxis: { type: "category", data: ["Norte", "Centro", "Sur", "Occidente"] },
        yAxis: { type: "value", axisLabel: { formatter: "{value}%" } },
        series: [{ type: "bar", data: [29, 34, 27, 32], barMaxWidth: 36 }],
      },
    },
    {
      key: "vd_gauge",
      title: "Indice voto duro",
      height: 280,
      option: {
        series: [
          {
            type: "gauge",
            min: 0,
            max: 100,
            detail: { formatter: "{value}%" },
            data: [{ value: 31, name: "Voto duro" }],
          },
        ],
      },
    },
  ],
  abst_partidos: [
    {
      key: "vd_party_bar",
      title: "Fuerza voto duro por partido",
      height: 280,
      option: {
        grid: { left: 32, right: 16, top: 24, bottom: 28 },
        tooltip: { trigger: "axis" },
        xAxis: { type: "category", data: ["Partido Azul", "Partido Verde", "Partido Rojo", "Partido Naranja"] },
        yAxis: { type: "value", axisLabel: { formatter: "{value}%" } },
        series: [{ type: "bar", data: [35, 25, 30, 20], barMaxWidth: 36 }],
      },
    },
    {
      key: "vd_pie",
      title: "Composicion voto duro",
      height: 280,
      option: {
        tooltip: { trigger: "item" },
        legend: { top: "bottom" },
        series: [
          {
            type: "pie",
            radius: ["40%", "70%"],
            data: [
              { name: "Partido Azul", value: 35 },
              { name: "Partido Verde", value: 25 },
              { name: "Partido Rojo", value: 30 },
              { name: "Partido Naranja", value: 10 },
            ],
            label: { formatter: "{b}: {d}%" },
          },
        ],
      },
    },
  ],
};

const chartsConfigVotoDuro: AccordionConfig[] = chartsConfigAbstencionismo.reduce<AccordionConfig[]>(
  (acc, group) => {
    const extraCharts = chartsConfigVotoDuroExtras[group.key] ?? [];
    if (extraCharts.length === 0) {
      return acc;
    }
    acc.push({
      key: `vd_${group.key}`,
      title: `Voto duro `,
      subtitle: "Analisis de voto duro",
      charts: extraCharts,
    });
    return acc;
  },
  []
);

const getVarCalculo = (): string => {
  if (typeof window === "undefined") return "abstencionismo";
  const params = new URLSearchParams(window.location.search);
  return params.get("var-calculo") ?? "abstencionismo";
};

const normalizeCalculo = (value: string) => value.trim().toLowerCase();

const getGroupCategory = (groupKey: string): CategoryKey =>
  groupKey.startsWith("vd_") ? "votoduro" : "abstencionismo";

export const SimplePanel: React.FC<Props> = ({ options, data, width, height, fieldConfig, id }) => {
  const [calculo, setCalculo] = useState<string>(() => getVarCalculo());
  const chartsConfig = useMemo<AccordionConfig[]>(() => {
    const normalized = normalizeCalculo(calculo);
    if (normalized === "votoduro") {
      return [...chartsConfigVotoDuro, ...chartsConfigAbstencionismo];
    }
    return chartsConfigAbstencionismo;
  }, [calculo]);
  const chartsConfigAll = useMemo<AccordionConfig[]>(
    () => [...chartsConfigVotoDuro, ...chartsConfigAbstencionismo],
    []
  );
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>("abstencionismo");
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set());
  const [activeCharts, setActiveCharts] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    chartsConfig.forEach((group) => {
      initial[group.key] = group.charts[0]?.key ?? "";
    });
    return initial;
  });
  const [hiddenCharts, setHiddenCharts] = useState<Record<string, Set<string>>>(() => ({}));

  const chartInstancesRef = useRef<Record<string, echarts.ECharts | null>>({});
  const domRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    return () => {
      Object.values(chartInstancesRef.current).forEach((chart) => chart?.dispose());
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateFromUrl = () => {
      const next = getVarCalculo();
      setCalculo((prev) => (prev === next ? prev : next));
    };

    updateFromUrl();
    window.addEventListener("popstate", updateFromUrl);
    window.addEventListener("hashchange", updateFromUrl);
    const timer = window.setInterval(updateFromUrl, 1000);

    return () => {
      window.removeEventListener("popstate", updateFromUrl);
      window.removeEventListener("hashchange", updateFromUrl);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    Object.values(chartInstancesRef.current).forEach((chart) => chart?.dispose());
    chartInstancesRef.current = {};
    domRefs.current = {};
    const initialOpen = new Set<string>();
    if (normalizeCalculo(calculo) === "votoduro") {
      chartsConfigVotoDuro.forEach((group) => initialOpen.add(group.key));
      setSelectedCategory("votoduro");
    } else if (chartsConfig[0]?.key) {
      initialOpen.add(chartsConfig[0].key);
      setSelectedCategory("abstencionismo");
    }
    setOpenKeys(initialOpen);
    const initial: Record<string, string> = {};
    chartsConfig.forEach((group) => {
      initial[group.key] = group.charts[0]?.key ?? "";
    });
    setActiveCharts(initial);
    setHiddenCharts({});
  }, [chartsConfig]);

  const displayConfig = useMemo(
    () => chartsConfigAll.filter((group) => getGroupCategory(group.key) === selectedCategory),
    [chartsConfigAll, selectedCategory]
  );

  useEffect(() => {
    if (displayConfig.length === 0) {
      setOpenKeys(new Set());
      return;
    }

    setOpenKeys((prev) => {
      const next = new Set<string>();
      displayConfig.forEach((group) => {
        if (prev.has(group.key)) {
          next.add(group.key);
        }
      });
      if (next.size === 0 && displayConfig[0]?.key) {
        next.add(displayConfig[0].key);
      }
      return next;
    });

    setActiveCharts((prev) => {
      const next = { ...prev };
      displayConfig.forEach((group) => {
        const current = next[group.key];
        if (!current || !group.charts.some((c) => c.key === current)) {
          next[group.key] = group.charts[0]?.key ?? "";
        }
      });
      return next;
    });
  }, [displayConfig]);

  const wrapperClass = useMemo(
    () => css`
      width: ${width}px;
      height: ${height}px;
      overflow: auto;
      padding: 12px;
      background: linear-gradient(135deg, rgba(235, 241, 247, 0.75), rgba(255, 255, 255, 0.9));
      border-radius: 14px;
    `,
    [width, height]
  );

  const onToggleCategory = useCallback((category: CategoryKey) => {
    setSelectedCategory(category);
  }, []);

  const ensureChart = useCallback(
    (compositeKey: string, option: echarts.EChartsOption) => {
      const el = domRefs.current[compositeKey];
      if (!el) return;

      const existingByDom = echarts.getInstanceByDom(el);
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w === 0 || h === 0) {
        requestAnimationFrame(() => ensureChart(compositeKey, option));
        return;
      }

      let chart = chartInstancesRef.current[compositeKey];
      if (existingByDom) {
        Object.entries(chartInstancesRef.current).forEach(([key, value]) => {
          if (value === existingByDom) {
            chartInstancesRef.current[key] = null;
          }
        });
      }
      if (existingByDom && existingByDom !== chart) {
        existingByDom.dispose();
      }
      if (!chart || chart.isDisposed?.() || chart.getDom?.() !== el) {
        chart = echarts.init(el);
        chartInstancesRef.current[compositeKey] = chart;
      }
      chart.setOption(option as any, { notMerge: true, lazyUpdate: true });
      chart.resize();
    },
    []
  );

  useEffect(() => {
    if (displayConfig.length === 0) {
      return;
    }

    displayConfig.forEach((group) => {
      if (!openKeys.has(group.key)) {
        return;
      }
      const activeKey = activeCharts[group.key] ?? group.charts[0]?.key;
      const activeChart = group.charts.find((c) => c.key === activeKey);
      if (!activeChart) return;
      const compositeKey = `${group.key}::${activeChart.key}`;
      requestAnimationFrame(() => ensureChart(compositeKey, activeChart.option));
    });
  }, [activeCharts, displayConfig, ensureChart, openKeys]);

  const onToggle = useCallback(
    (key: string, open: boolean) => {
      setOpenKeys((prev) => {
        const next = new Set(prev);
        if (open) {
          next.add(key);
        } else {
          next.delete(key);
        }
        return next;
      });

      if (open) {
        const group = chartsConfig.find((c) => c.key === key);
        if (!group) return;
        const activeKey = activeCharts[key] ?? group.charts[0]?.key;
        const activeChart = group.charts.find((c) => c.key === activeKey);
        if (!activeChart) return;
        const compositeKey = `${key}::${activeChart.key}`;
        requestAnimationFrame(() => ensureChart(compositeKey, activeChart.option));
      }
    },
    [activeCharts, chartsConfig, ensureChart]
  );

  const onSwitchChart = useCallback(
    (groupKey: string, chartKey: string) => {
      setActiveCharts((prev) => ({ ...prev, [groupKey]: chartKey }));
      const group = chartsConfig.find((c) => c.key === groupKey);
      const activeChart = group?.charts.find((c) => c.key === chartKey);
      if (!activeChart) return;
      const compositeKey = `${groupKey}::${activeChart.key}`;
      requestAnimationFrame(() => ensureChart(compositeKey, activeChart.option));
    },
    [chartsConfig, ensureChart]
  );

  const onRemoveChart = useCallback(
    (groupKey: string, chartKey: string) => {
      setHiddenCharts((prev) => {
        const next = new Set(prev[groupKey] ?? []);
        next.add(chartKey);
        return { ...prev, [groupKey]: next };
      });

      setActiveCharts((prev) => {
        if (prev[groupKey] !== chartKey) {
          return prev;
        }
        const group = chartsConfig.find((c) => c.key === groupKey);
        if (!group) return prev;
        const hidden = hiddenCharts[groupKey] ?? new Set<string>();
        const nextChart = group.charts.find((c) => c.key !== chartKey && !hidden.has(c.key));
        return { ...prev, [groupKey]: nextChart?.key ?? "" };
      });
    },
    [chartsConfig, hiddenCharts]
  );

  const makeChartRef = useCallback(
    (compositeKey: string, option: echarts.EChartsOption) => (node: HTMLDivElement | null) => {
      if (node) {
        domRefs.current[compositeKey] = node;
        requestAnimationFrame(() => ensureChart(compositeKey, option));
      }
    },
    [ensureChart]
  );

  return (
    <div className={wrapperClass}>
      <div
        className={css`
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          margin-bottom: 12px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.85);
          border: 1px solid rgba(31, 45, 61, 0.12);
          box-shadow: 0 4px 12px rgba(18, 38, 63, 0.06);
        `}
      >
        <span className={css`font-size: 12px; font-weight: 700; color: #1f2d3d;`}>
          Mostrar:
        </span>
        {(["abstencionismo", "votoduro"] as CategoryKey[]).map((category) => {
          const isActive = selectedCategory === category;
          const label = category === "abstencionismo" ? "Abstencionismo" : "Voto duro";
          return (
            <button
              key={category}
              type="button"
              onClick={() => onToggleCategory(category)}
              aria-pressed={isActive}
              className={css`
                border: 1px solid ${isActive ? "#1f2d3d" : "rgba(31, 45, 61, 0.2)"};
                background: ${isActive ? "#1f2d3d" : "#ffffff"};
                color: ${isActive ? "#ffffff" : "#1f2d3d"};
                font-size: 12px;
                font-weight: 600;
                padding: 6px 12px;
                border-radius: 999px;
                cursor: pointer;
              `}
            >
              {label}
            </button>
          );
        })}
      </div>

      {displayConfig.length === 0 && (
        <div
          className={css`
            padding: 16px;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.9);
            border: 1px dashed rgba(31, 45, 61, 0.25);
            color: #1f2d3d;
            font-size: 12px;
            text-align: center;
          `}
        >
          Selecciona al menos una categoria para ver los accordiones.
        </div>
      )}

      {displayConfig.map((cfg) => {
        const hidden = hiddenCharts[cfg.key] ?? new Set<string>();
        const visibleCharts = cfg.charts.filter((c) => !hidden.has(c.key));
        const fallbackKey = visibleCharts[0]?.key ?? "";
        const activeKey = activeCharts[cfg.key] ?? fallbackKey;
        const activeChart = visibleCharts.find((c) => c.key === activeKey) ?? visibleCharts[0];
        const compositeKey = `${cfg.key}::${activeChart?.key ?? ""}`;
        return (
        <details
          key={cfg.key}
          open={openKeys.has(cfg.key)}
          onToggle={(e) => onToggle(cfg.key, (e.currentTarget as HTMLDetailsElement).open)}
          className={css`
            margin-bottom: 12px;
            border-radius: 12px;
            border: 1px solid rgba(35, 55, 90, 0.12);
            background: #ffffff;
            box-shadow:
              0 6px 18px rgba(18, 38, 63, 0.08),
              0 2px 6px rgba(18, 38, 63, 0.06);
            overflow: hidden;
          `}
        >
          <summary
            className={css`
              cursor: pointer;
              user-select: none;
              padding: 12px 14px;
              font-weight: 700;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 10px;
              background: linear-gradient(90deg, #1f2d3d 0%, #2c3e50 100%);
              color: #f7fbff;
            `}
          >
            <span className={css`display: flex; flex-direction: column; gap: 2px;`}>
              <span className={css`font-size: 14px;`}>{cfg.title}</span>
              {cfg.subtitle && (
                <span className={css`font-size: 12px; font-weight: 500; opacity: 0.8;`}>
                  {cfg.subtitle}
                </span>
              )}
            </span>
            <span className={css`font-size: 12px; opacity: 0.8;`}>Ver grafica</span>
          </summary>

          <div
            className={css`
              display: flex;
              gap: 8px;
              flex-wrap: wrap;
              padding: 10px 12px 0;
            `}
          >
            {visibleCharts.map((chart) => {
              const isActive = chart.key === activeKey;
              return (
                <button
                  key={chart.key}
                  type="button"
                  onClick={() => onSwitchChart(cfg.key, chart.key)}
                  className={css`
                    border: 1px solid ${isActive ? "#1f2d3d" : "rgba(31, 45, 61, 0.2)"};
                    background: ${isActive ? "#1f2d3d" : "#ffffff"};
                    color: ${isActive ? "#ffffff" : "#1f2d3d"};
                    font-size: 12px;
                    font-weight: 600;
                    padding: 6px 10px;
                    border-radius: 999px;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                  `}
                >
                  <span>{chart.title}</span>
                  <span
                    role="button"
                    aria-label={`Eliminar ${chart.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveChart(cfg.key, chart.key);
                    }}
                    className={css`
                      display: inline-flex;
                      align-items: center;
                      justify-content: center;
                      width: 16px;
                      height: 16px;
                      border-radius: 50%;
                      font-size: 12px;
                      line-height: 12px;
                      background: ${isActive ? "rgba(255, 255, 255, 0.2)" : "rgba(31, 45, 61, 0.12)"};
                      color: ${isActive ? "#ffffff" : "#1f2d3d"};
                      cursor: pointer;
                    `}
                  >
                    ×
                  </span>
                </button>
              );
            })}
          </div>

          <div
            ref={activeChart ? makeChartRef(compositeKey, activeChart.option) : undefined}
            style={{ width: "100%", height: activeChart?.height ?? 280 }}
            className={css`padding: 10px 12px 16px;`}
          />
        </details>
      );
      })}
    </div>
  );
};
