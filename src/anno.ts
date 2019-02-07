import {Shape} from 'plotly.js';

export function processAnnotations(results: any): Shape[] {
  return results.annotations.map(a => {
    return {
      type: 'line', // rect
      xref: 'x',
      yref: 'paper',
      x0: a.time,
      y0: 0,
      x1: a.time,
      y1: 1,

      visible: true,
      layer: 'above',

      fillcolor: a.annotation.iconColor,
      opacity: 0.8,
      line: {
        color: a.annotation.iconColor,
        width: 2,
        dash: 'dash',
      },
    } as Shape;
  });
}
