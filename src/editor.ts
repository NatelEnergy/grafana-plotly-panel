import _ from 'lodash';

import {PlotlyPanelCtrl} from './module';

class AxisInfo {
  label: string;
  layout: any; // The config saved in layout
  property: string; // mapping property to check in a trace
  segment: any; // The Grafana <metric-segment
}

export class EditorHelper {
  axis = new Array<AxisInfo>();
  trace: any; // Trace Config
  traceIndex: number = 0;
  traces: any[]; // array of configs;

  symbol: any; // The Grafana <metric-segment for this symbol
  mapping: any = {}; // The Grafana <metric-segment for this symbol

  /** @ngInject */
  constructor(public ctrl: PlotlyPanelCtrl) {
    this.selectTrace(0);
  }

  onConfigChanged() {
    this.onUpdateAxis(); // Every time????

    //
    for (let i = 0; i < this.axis.length; i++) {
      if (this.axis[i].layout.rangemode === 'between') {
        if (this.axis[i].layout.range == null) {
          this.axis[i].layout.range = [0, null];
        }
      } else {
        this.axis[i].layout.range = null;
      }
    }

    this.ctrl.onConfigChanged();
  }

  onUpdateAxis() {
    let mapping = this.trace.mapping;
    if (!mapping) {
      console.error('Missing mappings for trace', this.trace);
      return;
    }

    const layout = this.ctrl.cfg.layout;
    if (!layout.xaxis) {
      layout.xaxis = {};
    }
    if (!layout.yaxis) {
      layout.yaxis = {};
    }

    this.axis = [];
    this.axis.push({
      label: 'X Axis',
      layout: layout.xaxis,
      property: 'x',
      segment: this.mapping.x,
    });
    this.axis.push({
      label: 'Y Axis',
      layout: layout.yaxis,
      property: 'y',
      segment: this.mapping.y,
    });

    if (this.ctrl.is3d()) {
      if (!layout.zaxis) {
        layout.zaxis = {};
      }
      this.axis.push({
        label: 'Z Axis',
        layout: layout.zaxis,
        property: 'z',
        segment: this.mapping.z,
      });
    }
  }

  //-----------------------------------------------------------------------
  // Manage Traces
  //-----------------------------------------------------------------------

  selectTrace(index: number) {
    this.traces = this.ctrl.cfg.traces;
    if (!this.traces || this.traces.length < 1) {
      this.traces = this.ctrl.cfg.traces = [_.deepClone(PlotlyPanelCtrl.defaultTrace)];
    }
    this.trace = this.ctrl.cfg.traces[index];
    this.traceIndex = index;

    _.defaults(this.trace, PlotlyPanelCtrl.defaultTrace);
    if (!this.trace.name) {
      this.trace.name = EditorHelper.createTraceName(index);
    }

    // The _defaults makes sure this is taken care of
    this.symbol = this.ctrl.uiSegmentSrv.newSegment({
      value: this.trace.settings.marker.symbol,
    });

    // Now set one for each key
    this.mapping = {};
    _.forEach(this.trace.mapping, (value, key) => {
      if (value) {
        let s = this.ctrl.seriesByKey.get(value);
        let opts: any = {
          value: value,
          series: s,
          fake: s == null,
        };
        this.mapping[key] = this.ctrl.uiSegmentSrv.newSegment(opts);
      } else {
        this.mapping[key] = this.ctrl.uiSegmentSrv.newSegment({
          value: 'Select Metric',
          fake: true,
        });
      }
    });

    console.log('Editor Info', this);

    this.onConfigChanged();
    this.ctrl.refresh();
  }

  createTrace() {
    let trace: any = {};
    if (this.ctrl.cfg.traces.length > 0) {
      trace = _.cloneDeep(this.ctrl.cfg.traces[this.ctrl.cfg.traces.length - 1]);
    } else {
      trace = _.deepClone(PlotlyPanelCtrl.defaultTrace);
    }
    trace.name = EditorHelper.createTraceName(this.ctrl.traces.length);
    this.ctrl.cfg.traces.push(trace);
    this.selectTrace(this.ctrl.cfg.traces.length - 1);
  }

  removeCurrentTrace() {
    // TODO... better behavior
    if (this.traces.length <= 1) {
      console.error('Wont remove a single trace', this);
      return;
    }

    for (let i = 0; i < this.traces.length; i++) {
      if (this.trace === this.traces[i]) {
        this.traces.splice(i, 1);
        if (i >= this.traces.length) {
          i = this.traces.length - 1;
        }
        this.ctrl._updateTraceData(true);
        this.ctrl.refresh();
        return;
      }
    }

    console.error('Could not find', this);
  }

  static createTraceName(idx: number) {
    return 'Trace ' + (idx + 1);
  }

  //-----------------------------------------------------------------------
  // SERIES
  //-----------------------------------------------------------------------

  getSeriesSegs(withRemove = false): Promise<any[]> {
    return new Promise((resolve, reject) => {
      let series = [];
      if (false && withRemove) {
        series.push(
          this.ctrl.uiSegmentSrv.newSegment({
            fake: false,
            value: null,
            html: '<i class="fa fa-cross "></i> Remove',
            series: null,
            cssClass: 'query-part',
          })
        );
      }
      this.ctrl.series.forEach(s => {
        series.push(
          this.ctrl.uiSegmentSrv.newSegment({
            value: s.getRelativeKey(),
            series: s,
          })
        );
      });
      console.log('GET Series', series, this.ctrl.series);
      resolve(series);
    });
  }

  onAxisSeriesChanged(axis: AxisInfo) {
    console.log('CHANGE', axis);
    this.trace.mapping[axis.property] = axis.segment.value;
    this.onConfigChanged();
  }

  onTextMetricChanged() {
    const seg = this.mapping.text;
    this.trace.mapping.text = seg.value;
    this.onConfigChanged();
  }

  onColorChanged() {
    const seg = this.mapping.color;
    this.trace.mapping.color = seg.value;
    this.onConfigChanged();
  }

  //-----------------------------------------------------------------------
  // SYMBOLS
  //-----------------------------------------------------------------------

  onSymbolChanged() {
    this.trace.settings.marker.symbol = this.symbol.value;
    this.onConfigChanged();
  }

  getSymbolSegs(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      let txt = [
        'circle',
        'circle-open',
        'circle-dot',
        'circle-open-dot',
        'square',
        'square-open',
        'square-dot',
        'square-open-dot',
        'diamond',
        'diamond-open',
        'diamond-dot',
        'diamond-open-dot',
        'cross',
        'cross-open',
        'cross-dot',
        'cross-open-dot',
        'x',
        'x-open',
        'x-dot',
        'x-open-dot',
        'triangle-up',
        'triangle-up-open',
        'triangle-up-dot',
        'triangle-up-open-dot',
        'triangle-down',
        'triangle-down-open',
        'triangle-down-dot',
        'triangle-down-open-dot',
        'triangle-left',
        'triangle-left-open',
        'triangle-left-dot',
        'triangle-left-open-dot',
        'triangle-right',
        'triangle-right-open',
        'triangle-right-dot',
        'triangle-right-open-dot',
        'triangle-ne',
        'triangle-ne-open',
        'triangle-ne-dot',
        'triangle-ne-open-dot',
        'triangle-se',
        'triangle-se-open',
        'triangle-se-dot',
        'triangle-se-open-dot',
        'triangle-sw',
        'triangle-sw-open',
        'triangle-sw-dot',
        'triangle-sw-open-dot',
        'triangle-nw',
        'triangle-nw-open',
        'triangle-nw-dot',
        'triangle-nw-open-dot',
        'pentagon',
        'pentagon-open',
        'pentagon-dot',
        'pentagon-open-dot',
        'hexagon',
        'hexagon-open',
        'hexagon-dot',
        'hexagon-open-dot',
        'hexagon2',
        'hexagon2-open',
        'hexagon2-dot',
        'hexagon2-open-dot',
        'octagon',
        'octagon-open',
        'octagon-dot',
        'octagon-open-dot',
        'star',
        'star-open',
        'star-dot',
        'star-open-dot',
        'hexagram',
        'hexagram-open',
        'hexagram-dot',
        'hexagram-open-dot',
        'star-triangle-up',
        'star-triangle-up-open',
        'star-triangle-up-dot',
        'star-triangle-up-open-dot',
        'star-triangle-down',
        'star-triangle-down-open',
        'star-triangle-down-dot',
        'star-triangle-down-open-dot',
        'star-square',
        'star-square-open',
        'star-square-dot',
        'star-square-open-dot',
        'star-diamond',
        'star-diamond-open',
        'star-diamond-dot',
        'star-diamond-open-dot',
        'diamond-tall',
        'diamond-tall-open',
        'diamond-tall-dot',
        'diamond-tall-open-dot',
        'diamond-wide',
        'diamond-wide-open',
        'diamond-wide-dot',
        'diamond-wide-open-dot',
        'hourglass',
        'hourglass-open',
        'bowtie',
        'bowtie-open',
        'circle-cross',
        'circle-cross-open',
        'circle-x',
        'circle-x-open',
        'square-cross',
        'square-cross-open',
        'square-x',
        'square-x-open',
        'diamond-cross',
        'diamond-cross-open',
        'diamond-x',
        'diamond-x-open',
        'cross-thin',
        'cross-thin-open',
        'x-thin',
        'x-thin-open',
        'asterisk',
        'asterisk-open',
        'hash',
        'hash-open',
        'hash-dot',
        'hash-open-dot',
        'y-up',
        'y-up-open',
        'y-down',
        'y-down-open',
        'y-left',
        'y-left-open',
        'y-right',
        'y-right-open',
        'line-ew',
        'line-ew-open',
        'line-ns',
        'line-ns-open',
        'line-ne',
        'line-ne-open',
        'line-nw',
        'line-nw-open',
      ];

      let segs = [];
      _.forEach(txt, val => {
        segs.push(this.ctrl.uiSegmentSrv.newSegment(val));
      });
      resolve(segs);
    });
  }
}
