///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />

import {MetricsPanelCtrl} from 'app/plugins/sdk';

import _ from 'lodash';
import moment from 'moment';
import $ from 'jquery';

import {SeriesWrapper, SeriesWrapperSeries, SeriesWrapperTable} from './SeriesWrapper';
import {EditorHelper} from './editor';

import * as Plotly from './lib/plotly.min';

class PlotlyPanelCtrl extends MetricsPanelCtrl {
  static templateUrl = 'partials/module.html';
  static configVersion = 1; // An index to help config migration

  initalized: boolean;
  //$tooltip: any;

  static defaultTrace = {
    mapping: {
      x: null,
      y: null,
      z: null,
      text: null,
      color: null,
      size: null,
    },
    show: {
      line: true,
      markers: true,
    },
    settings: {
      line: {
        color: '#005f81',
        width: 6,
        dash: 'solid',
        shape: 'linear',
      },
      marker: {
        size: 15,
        symbol: 'circle',
        color: '#33B5E5',
        colorscale: 'YIOrRd',
        sizemode: 'diameter',
        sizemin: 3,
        sizeref: 0.2,
        line: {
          color: '#DDD',
          width: 0,
        },
        showscale: true,
      },
      color_option: 'ramp',
    },
  };
  static defaults = {
    pconfig: {
      traces: [PlotlyPanelCtrl.defaultTrace],
      settings: {
        type: 'scatter',
        displayModeBar: false,
      },
      layout: {
        showlegend: false,
        legend: {
          orientation: 'h',
        },
        dragmode: 'lasso', // (enumerated: "zoom" | "pan" | "select" | "lasso" | "orbit" | "turntable" )
        hovermode: 'closest',
        font: {
          family: '"Open Sans", Helvetica, Arial, sans-serif',
        },
        xaxis: {
          showgrid: true,
          zeroline: false,
          type: 'linear',
          rangemode: 'normal', // (enumerated: "normal" | "tozero" | "nonnegative" )
        },
        yaxis: {
          showgrid: true,
          zeroline: false,
          type: 'linear',
          rangemode: 'normal', // (enumerated: "normal" | "tozero" | "nonnegative" )
        },
        zaxis: {
          showgrid: true,
          zeroline: false,
          type: 'linear',
          rangemode: 'normal', // (enumerated: "normal" | "tozero" | "nonnegative" )
        },
      },
    },
  };

  graphDiv: any;
  series: SeriesWrapper[];
  seriesByKey: Map<string, SeriesWrapper> = new Map();
  seriesHash: string = '?';

  traces: Array<any>; // The data sent directly to Plotly -- with a special __copy element
  layout: any; // The layout used by Plotly

  mouse: any;
  cfg: any;

  // For editor
  editor: EditorHelper;
  dataWarnings: string[]; // warnings about loading data

  /** @ngInject **/
  constructor($scope, $injector, $window, private $rootScope, public uiSegmentSrv) {
    super($scope, $injector);

    this.initalized = false;

    //this.$tooltip = $('<div id="tooltip" class="graph-tooltip">');

    // defaults configs
    _.defaultsDeep(this.panel, PlotlyPanelCtrl.defaults);

    this.cfg = this.panel.pconfig;

    this.traces = [];

    // ?? This seems needed for tests?!!
    if (!this.events) {
      return;
    }

    this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
    this.events.on('render', this.onRender.bind(this));
    this.events.on('data-received', this.onDataReceived.bind(this));
    this.events.on('data-error', this.onDataError.bind(this));
    this.events.on('panel-initialized', this.onPanelInitalized.bind(this));
    this.events.on('panel-size-changed', this.onResize.bind(this));
    this.events.on('data-snapshot-load', this.onDataSnapshotLoad.bind(this));
    this.events.on('refresh', this.onRefresh.bind(this));
  }

  getCssRule(selectorText): CSSStyleRule | null {
    const styleSheets = document.styleSheets;
    for (let idx = 0; idx < styleSheets.length; idx += 1) {
      const styleSheet = styleSheets[idx] as CSSStyleSheet;
      const rules = styleSheet.cssRules;
      for (let ruleIdx = 0; ruleIdx < rules.length; ruleIdx += 1) {
        const rule = rules[ruleIdx] as CSSStyleRule;
        if (rule.selectorText === selectorText) {
          return rule;
        }
      }
    }
    return null;
  }

  onResize() {
    setTimeout(() => {
      if (this.graphDiv && this.layout) {
        // https://github.com/alonho/angular-plotly/issues/26
        let e = window.getComputedStyle(this.graphDiv).display;
        if (!e || 'none' === e) {
          // not drawn!
          console.warn('resize a plot that is not drawn yet');
        } else {
          let rect = this.graphDiv.getBoundingClientRect();
          this.layout.width = rect.width;
          this.layout.height = this.height;
          Plotly.redraw(this.graphDiv);
        }
      }
    }, 75);
  }

  onDataError(err) {
    console.log('onDataError', err);
  }

  onRefresh() {
    // ignore fetching data if another panel is in fullscreen
    if (this.otherPanelInFullscreenMode()) {
      return;
    }

    if (this.graphDiv && this.initalized) {
      Plotly.redraw(this.graphDiv);
    }
  }

  onInitEditMode() {
    this.editor = new EditorHelper(this);
    this.addEditorTab(
      'Display',
      'public/plugins/natel-plotly-panel/partials/tab_display.html',
      2
    );
    this.addEditorTab(
      'Traces',
      'public/plugins/natel-plotly-panel/partials/tab_traces.html',
      3
    );
    //  this.editorTabIndex = 1;
    this.onConfigChanged(); // Sets up the axis info
    this.onResize();
  }

  processConfigMigration() {
    console.log(
      'Migrating Plotly Configuration to version: ' + PlotlyPanelCtrl.configVersion
    );

    // Remove some things that should not be saved
    let cfg = this.panel.pconfig;
    delete cfg.layout.plot_bgcolor;
    delete cfg.layout.paper_bgcolor;
    delete cfg.layout.autosize;
    delete cfg.layout.height;
    delete cfg.layout.width;
    delete cfg.layout.margin;
    delete cfg.layout.scene;
    if (!this.is3d()) {
      delete cfg.layout.zaxis;
    }

    // Move from 'markers-lines' to checkbox
    if (cfg.settings.mode) {
      const old = cfg.settings.mode;
      const show = {
        markers: old.indexOf('markers') >= 0,
        lines: old.indexOf('lines') >= 0,
      };
      _.forEach(cfg.traces, trace => {
        trace.show = show;
      });
      delete cfg.settings.mode;
    }

    // TODO... MORE Migrations
    console.log('After Migration:', cfg);
    this.cfg = cfg;
    this.panel.version = PlotlyPanelCtrl.configVersion;
  }

  onPanelInitalized() {
    if (!this.panel.version || PlotlyPanelCtrl.configVersion > this.panel.version) {
      this.processConfigMigration();
    }
    this._updateTraceData(true);
  }

  deepCopyWithTemplates = obj => {
    if (_.isArray(obj)) {
      return obj.map(val => this.deepCopyWithTemplates(val));
    } else if (_.isString(obj)) {
      return this.templateSrv.replace(obj, this.panel.scopedVars);
    } else if (_.isObject(obj)) {
      let copy = {};
      _.forEach(obj, (v, k) => {
        copy[k] = this.deepCopyWithTemplates(v);
      });
      return copy;
    }
    return obj;
  };

  getProcessedLayout() {
    // Copy from config
    let layout = this.deepCopyWithTemplates(this.cfg.layout);
    layout.plot_bgcolor = 'transparent';
    layout.paper_bgcolor = layout.plot_bgcolor;

    // Update the size
    let rect = this.graphDiv.getBoundingClientRect();
    layout.autosize = false; // height is from the div
    layout.height = this.height;
    layout.width = rect.width;

    // Make sure it is something
    if (!layout.xaxis) layout.xaxis = {};
    if (!layout.yaxis) layout.yaxis = {};

    if (this.is3d()) {
      if (!layout.zaxis) layout.zaxis = {};

      // 3d uses 'scene' for the axis names
      layout.scene = {
        xaxis: {title: layout.xaxis.title},
        yaxis: {title: layout.yaxis.title},
        zaxis: {title: layout.zaxis.title},
      };
      layout.margin = {
        l: 0,
        r: 0,
        t: 0,
        b: 5,
        pad: 0,
      };
    } else {
      delete layout.zaxis;
      delete layout.scene;
      layout.margin = {
        l: layout.yaxis.title ? 50 : 35,
        r: 5,
        t: 0,
        b: layout.xaxis.title ? 65 : 30,
        pad: 2,
      };

      // get the css rule of grafana graph axis text
      const labelStyle = this.getCssRule('div.flot-text');
      if (labelStyle) {
        let color = labelStyle.style.color;
        if (!layout.font) layout.font = {};
        layout.font.color = color;

        // make the grid a little more transparent
        color = $.color
          .parse(color)
          .scale('a', 0.22)
          .toString();

        // set gridcolor (like grafana graph)
        layout.xaxis.gridcolor = color;
        layout.yaxis.gridcolor = color;
      }
    }
    return layout;
  }

  onRender() {
    // ignore fetching data if another panel is in fullscreen
    if (this.otherPanelInFullscreenMode() || !this.graphDiv) {
      return;
    }

    if (!this.initalized) {
      let s = this.cfg.settings;

      let options = {
        showLink: false,
        displaylogo: false,
        displayModeBar: s.displayModeBar,
        modeBarButtonsToRemove: ['sendDataToCloud'], //, 'select2d', 'lasso2d']
      };

      this.layout = this.getProcessedLayout();

      Plotly.react(this.graphDiv, this.traces, this.layout, options);

      this.graphDiv.on('plotly_click', data => {
        if (data === undefined || data.points === undefined) {
          return;
        }
        for (let i = 0; i < data.points.length; i++) {
          let idx = data.points[i].pointNumber;
          let ts = this.traces[0].ts[idx];
          // console.log( 'CLICK!!!', ts, data );
          let msg =
            data.points[i].x.toPrecision(4) + ', ' + data.points[i].y.toPrecision(4);
          this.$rootScope.appEvent('alert-success', [
            msg,
            '@ ' + this.dashboard.formatDate(moment(ts)),
          ]);
        }
      });

      // if(false) {
      //   this.graph.on('plotly_hover', (data, xxx) => {
      //     console.log( 'HOVER!!!', data, xxx, this.mouse );
      //     if(data.points.length>0) {
      //       var idx = 0;
      //       var pt = data.points[idx];

      //       var body = '<div class="graph-tooltip-time">'+ pt.pointNumber +'</div>';
      //       body += "<center>";
      //       body += pt.x + ', '+pt.y;
      //       body += "</center>";

      //       this.$tooltip.html( body ).place_tt( this.mouse.pageX + 10, this.mouse.pageY );
      //     }
      //   }).on('plotly_unhover', (data) => {
      //     this.$tooltip.detach();
      //   });
      // }

      this.graphDiv.on('plotly_selected', data => {
        if (data === undefined || data.points === undefined) {
          return;
        }

        if (data.points.length === 0) {
          console.log('Nothing Selected', data);
          return;
        }

        console.log('SELECTED', data);

        let min = Number.MAX_SAFE_INTEGER;
        let max = Number.MIN_SAFE_INTEGER;

        for (let i = 0; i < data.points.length; i++) {
          let idx = data.points[i].pointNumber;
          let ts = this.traces[0].ts[idx];
          min = Math.min(min, ts);
          max = Math.max(max, ts);
        }

        // At least 2 seconds
        min -= 1000;
        max += 1000;

        let range = {from: moment.utc(min), to: moment.utc(max)};

        console.log('SELECTED!!!', min, max, data.points.length, range);

        this.timeSrv.setTime(range);

        // rebuild the graph after query
        if (this.graphDiv) {
          Plotly.Plots.purge(this.graphDiv);
          this.graphDiv.innerHTML = '';
          this.initalized = false;
        }
      });
    } else {
      Plotly.redraw(this.graphDiv);
    }
    this.initalized = true;
  }

  onDataSnapshotLoad(snapshot) {
    this.onDataReceived(snapshot);
  }

  onDataReceived(dataList) {
    let finfo: SeriesWrapper[] = [];
    let seriesHash = '/';
    dataList.forEach((series, sidx) => {
      let refId = _.get(this.panel, 'targets[' + sidx + '].refId');
      if (!refId) {
        console.log('Missing Targets: ', this.panel.targets);
        refId = String.fromCharCode('A'.charCodeAt(0) + sidx);
      }
      if (series.columns) {
        for (let i = 0; i < series.columns.length; i++) {
          finfo.push(new SeriesWrapperTable(refId, series, i));
        }
      } else if (series.target) {
        finfo.push(new SeriesWrapperSeries(refId, series, 'value'));
        finfo.push(new SeriesWrapperSeries(refId, series, 'time'));
        finfo.push(new SeriesWrapperSeries(refId, series, 'index'));
      } else {
        console.error('Unsupported Series response', sidx, series);
      }
    });
    this.seriesByKey.clear();
    finfo.forEach(s => {
      const key = s.getRelativeKey();
      this.seriesByKey.set(key, s);
      s.getNamedKeys().forEach(k => {
        this.seriesByKey.set(k, s);
      });
      seriesHash += '$' + key;
    });
    this.series = finfo;

    // Now Process the loaded data
    const hchanged = this.seriesHash !== seriesHash;
    if (hchanged && EditorHelper.updateMappings(this)) {
      if (this.editor) {
        this.editor.selectTrace(this.editor.traceIndex);
        this.editor.onConfigChanged();
      }
    }
    if (hchanged || !this.initalized) {
      this.onConfigChanged();
      this.seriesHash = seriesHash;
    }

    // Load the real data changes
    this._updateTraceData();
    this.render();
  }

  __addCopyPath(trace: any, key: string, path: string): boolean {
    if (key) {
      let s: SeriesWrapper = this.seriesByKey.get(key);
      if (s) {
        trace.__set.push({
          key: s.getRelativeKey(),
          path: path,
        });
        return true;
      }
      this.dataWarnings.push(
        'Unable to find: ' + key + ' for ' + trace.name + ' // ' + path
      );
    }
    return false;
  }

  // This will update all trace settings *except* the data
  _updateTracesFromConfigs() {
    this.dataWarnings = [];

    // Make sure we have a trace
    if (this.cfg.traces == null || this.cfg.traces.length < 1) {
      this.cfg.traces = [_.cloneDeep(PlotlyPanelCtrl.defaultTrace)];
    }

    const is3D = this.is3d();
    this.traces = this.cfg.traces.map((tconfig, idx) => {
      const config = this.deepCopyWithTemplates(tconfig) || {};
      _.defaults(config, PlotlyPanelCtrl.defaults);
      let mapping = config.mapping;

      let trace: any = {
        name: config.name || EditorHelper.createTraceName(idx),
        type: this.cfg.settings.type,
        mode: 'markers+lines', // really depends on config settings
        __set: [], // { key:? property:? }
      };

      let mode: string = '';
      if (config.show.markers) {
        mode += '+markers';
        trace.marker = config.settings.marker;

        delete trace.marker.sizemin;
        delete trace.marker.sizemode;
        delete trace.marker.sizeref;

        if (config.settings.color_option === 'ramp') {
          this.__addCopyPath(trace, mapping.color, 'marker.color');
        } else {
          delete trace.marker.colorscale;
          delete trace.marker.showscale;
        }
      }

      if (config.show.lines) {
        mode += '+lines';
        trace.line = config.settings.line;
      }

      // Set the text
      this.__addCopyPath(trace, mapping.text, 'text');
      this.__addCopyPath(trace, mapping.x, 'x');
      this.__addCopyPath(trace, mapping.y, 'y');

      if (is3D) {
        this.__addCopyPath(trace, mapping.z, 'z');
      }

      // Set the trace mode
      if (mode) {
        trace.mode = mode.substring(1);
      }
      return trace;
    });
    console.log('Set-Traces', this.traces);
    this.refresh();
  }

  // Fills in the required data into the trace values
  _updateTraceData(force: boolean = false) {
    if (!this.series) {
      // console.log('NO Series data yet!');
      return;
    }

    if (force || !this.traces) {
      this._updateTracesFromConfigs();
    } else if (this.traces.length != this.cfg.traces.length) {
      console.log(
        'trace number mismatch.  Found: ' +
          this.traces.length +
          ', expect: ' +
          this.cfg.traces.length
      );
      this._updateTracesFromConfigs();
    }

    // Update the metric values
    this.traces.forEach(trace => {
      if (trace.__set) {
        trace.__set.forEach(v => {
          const s = this.seriesByKey.get(v.key);
          if (s) {
            _.set(trace, v.path, s.toArray());
          } else {
            console.warn('Can not set', v);
          }
        });
      }
    });

    //console.log('SetDATA', this.traces);
  }

  onConfigChanged() {
    // Force reloading the traces
    this._updateTraceData(true);

    // Updates the layout and redraw
    if (this.initalized && this.graphDiv) {
      let s = this.cfg.settings;
      let options = {
        showLink: false,
        displaylogo: false,
        displayModeBar: s.displayModeBar,
        modeBarButtonsToRemove: ['sendDataToCloud'], //, 'select2d', 'lasso2d']
      };
      this.layout = this.getProcessedLayout();
      console.log('Update-LAYOUT', this.layout, this.traces);
      Plotly.react(this.graphDiv, this.traces, this.layout, options);
    }

    // Will query and then update metrics
    this.refresh();
  }

  is3d() {
    return this.cfg.settings.type === 'scatter3d';
  }

  link(scope, elem, attrs, ctrl) {
    this.graphDiv = elem.find('.plotly-spot')[0];
    this.initalized = false;
    elem.on('mousemove', evt => {
      this.mouse = evt;
    });

    //let p = $(this.graphDiv).parent().parent()[0];
    //console.log( 'PLOT', this.graphDiv, p );
  }
}

export {PlotlyPanelCtrl, PlotlyPanelCtrl as PanelCtrl};
