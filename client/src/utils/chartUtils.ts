export function normalizeToEChartsOption(data: any): any {
  if (!data) return data;
  if (typeof data === 'object' && (data.series || data.xAxis || data.yAxis || (data.dataset && data.dataset.source))) {
    return data;
  }
  if (data && typeof data === 'object' && Array.isArray(data.labels) && Array.isArray(data.datasets)) {
    const labels = data.labels as any[];
    const datasets = data.datasets as any[];
    const series = datasets.map((ds: any) => ({
      name: ds.label || 'Series',
      type: 'bar',
      data: Array.isArray(ds.data) ? ds.data : [],
    }));
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: series.map((s: any) => s.name) },
      xAxis: { type: 'category', data: labels },
      yAxis: { type: 'value' },
      series,
    };
  }
  if (Array.isArray(data)) {
    const arr = data as any[];
    if (arr.length === 0) {
      return { xAxis: { type: 'category', data: [] }, yAxis: { type: 'value' }, series: [{ type: 'bar', data: [] }] };
    }
    if (typeof arr[0] === 'number') {
      return {
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: arr.map((_, i) => String(i + 1)) },
        yAxis: { type: 'value' },
        series: [{ name: 'Series 1', type: 'bar', data: arr }],
      };
    }
    if (Array.isArray(arr[0]) && arr[0].length >= 2 && typeof arr[0][0] === 'number' && typeof arr[0][1] === 'number') {
      return {
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'value' },
        yAxis: { type: 'value' },
        series: [{ name: 'Series 1', type: 'line', data: arr }],
      };
    }
    if (typeof arr[0] === 'object') {
      const first = arr[0];
      const keys = Object.keys(first);
      const numericKeys = keys.filter(k => typeof first[k] === 'number');
      let categoryKey = keys.find(k => typeof first[k] === 'string');
      if (!categoryKey) categoryKey = keys.find(k => typeof first[k] !== 'number');
      const xData = categoryKey ? arr.map((row: any, i: number) => row[categoryKey] ?? String(i + 1)) : arr.map((_: any, i: number) => String(i + 1));
      const seriesKeys = numericKeys.length > 0 ? numericKeys : keys.filter(k => k !== categoryKey).slice(0, 1);
      const series = seriesKeys.map(k => ({ name: k, type: 'bar', data: arr.map((row: any) => row[k]) }));
      return {
        tooltip: { trigger: 'axis' },
        legend: { data: series.map(s => s.name) },
        xAxis: { type: 'category', data: xData },
        yAxis: { type: 'value' },
        series,
      };
    }
  }
  return data;
}
