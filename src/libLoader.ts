import $script from 'scriptjs';

let loaded: any; // Plotly Library
let isFull = false;
let wasCDN = false;

export function loadPlotly(cfg: any): Promise<any> {
  if (loaded) {
    console.log('using already loaded value');
    return Promise.resolve(loaded);
  }

  const needsFull = cfg.settings.type !== 'scatter';
  let url = 'public/plugins/natel-plotly-panel/lib/plotly-cartesian.min.js';
  if (cfg.loadFromCDN) {
    url = needsFull
      ? 'https://cdn.plot.ly/plotly-latest.min.js'
      : 'https://cdn.plot.ly/plotly-cartesian-latest.min.js';
  } else if (needsFull) {
    url = 'public/plugins/natel-plotly-panel/lib/plotly.min.js';
  }
  return new Promise((resolve, reject) => {
    $script(url, resolve);
  }).then(res => {
    isFull = needsFull;
    wasCDN = cfg.loadFromCDN;
    loaded = window['Plotly'];
    return loaded;
  });
}

export function loadIfNecessary(cfg: any): Promise<any> {
  if (!loaded) {
    return loadPlotly(cfg);
  }

  if (wasCDN !== cfg.loadFromCDN) {
    console.log('Use CDN', cfg.loadFromCDN);
    loaded = null;
    return loadPlotly(cfg);
  }

  const needsFull = cfg.settings.type !== 'scatter';
  if (needsFull && !isFull) {
    console.log('Switching to the full plotly library');
    loaded = null;
    return loadPlotly(cfg);
  }

  // No changes
  return Promise.resolve(null);
}
