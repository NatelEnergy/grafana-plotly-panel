import {Shape, Data} from 'plotly.js';

export class AnnoInfo {
  trace: Data;
  shapes: Shape[];

  constructor() {
    this.clear();
  }

  clear() {
    this.shapes = [];
    this.trace = {
      mode: 'markers',
      type: 'scatter',
      hoverinfo: 'x+text',
      x: [],
      y: [],
      text: [],
      yaxis: 'y2',
      marker: {
        size: 15,
        symbol: 'triangle-up',
        color: [],
      },
    };
  }

  update(results: any): boolean {
    if (!results || !results.annotations) {
      this.clear();
      return false;
    }

    const x: number[] = [];
    const y: number[] = [];
    const text: string[] = [];
    const color: string[] = [];

    this.shapes = results.annotations.map(a => {
      x.push(a.time);
      y.push(0);
      text.push('XXXX');
      color.push(a.annotation.iconColor);

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
          width: 1,
          dash: 'dash',
        },
      } as Shape;
    });

    // Overwrite it with new points
    this.trace = {...this.trace, x, y, text};
    this.trace.marker!.color = color;
    return x.length > 0;
  }
}
