/* -*- Mode: typescript; indent-tabs-mode: nil; typescript-indent-level: 2 -*- */

///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />

import {MetricsPanelCtrl} from 'app/plugins/sdk';

import _ from 'lodash';
import moment from 'moment';
import $ from 'jquery';

import {
  SeriesWrapper,
  SeriesWrapperSeries,
  SeriesWrapperTable,
  SeriesWrapperTableRow,
} from './SeriesWrapper';
import {EditorHelper} from './editor';

import {loadPlotly, loadIfNecessary} from './libLoader';
import {AnnoInfo} from './anno';
import {Axis} from 'plotly.js';

let Plotly: any; // Loaded dynamically!

class PlotlyPanelCtrl extends MetricsPanelCtrl {
  static templateUrl = 'partials/module.html';
  static configVersion = 1; // An index to help config migration

  initialized: boolean;
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
        colorscale: 'YlOrRd',
        sizemode: 'diameter',
        sizemin: 3,
        sizeref: 0.2,
        line: {
          color: '#DDD',
          width: 0,
        },
        showscale: false,
      },
      barmarker: {
        color: '#33B5E5',
        width: 1,
      },
      color_option: 'ramp',
    },
  };

  static yaxis2: Partial<Axis> = {
    title: 'Annotations',
    type: 'linear',
    range: [0, 1],
    visible: false,
  };

  static defaults = {
    pconfig: {
      loadFromCDN: false,
      showAnnotations: true,
      fixScale: '',
      traces: [PlotlyPanelCtrl.defaultTrace],
      settings: {
        type: 'scatter',
        displayModeBar: false,
        orientation: 'v',
        autotrace: false,
      },
      layout: {
        barmode: 'group',
        showlegend: false,
        legend: {
          orientation: 'h',
          traceorder: 'normal',
          font: {
            family: 'Roboto, Helvetica, Arial, sans-serif',
            size: 11,
          },
        },
        dragmode: 'lasso', // (enumerated: "zoom" | "pan" | "select" | "lasso" | "orbit" | "turntable" )
        hovermode: 'closest',
        font: {
          family: 'Roboto, Helvetica, Arial, sans-serif',
          size: 10.8,
        },
        xaxis: {
          showgrid: true,
          zeroline: false,
          type: 'auto',
          rangemode: 'normal', // (enumerated: "normal" | "tozero" | "nonnegative" ),
          tickangle: 0,
          tickmargin: 30,
          autotick: true,
          ticks: 'outside',
          tick0: 0,
          dtick: 1,
          titlefont: {
            family: 'Roboto, Helvetica, Arial, sans-serif',
            size: 12,
          },
        },
        yaxis: {
          showgrid: true,
          zeroline: false,
          type: 'linear',
          rangemode: 'normal', // (enumerated: "normal" | "tozero" | "nonnegative" ),
          tickangle: 0,
          tickmargin: 45,
          autotick: true,
          ticks: 'outside',
          tick0: 0,
          dtick: 1,
          titlefont: {
            family: 'Roboto, Helvetica, Arial, sans-serif',
            size: 12,
          },
        },
        zaxis: {
          showgrid: true,
          zeroline: false,
          type: 'linear',
          rangemode: 'normal', // (enumerated: "normal" | "tozero" | "nonnegative" ),
          tickangle: 0,
          tickmargin: 30,
          autotick: true,
          ticks: 'outside',
          tick0: 0,
          dtick: 1,
          titlefont: {
            family: 'Roboto, Helvetica, Arial, sans-serif',
            size: 12,
          },
        },
      },
    },
  };

  graphDiv: any;
  annotations = new AnnoInfo();
  series: SeriesWrapper[];
  seriesByKey: Map<string, SeriesWrapper> = new Map();
  seriesHash = '?';
  seriesIsTimeseries = true;

  traces: any[]; // The data sent directly to Plotly -- with a special __copy element
  layout: any; // The layout used by Plotly

  mouse: any;
  cfg: any;

  // For editor
  editor: EditorHelper;
  dataWarnings: string[]; // warnings about loading data

  /** @ngInject **/
  constructor(
    $scope,
    $injector,
    $window,
    private $rootScope,
    public uiSegmentSrv,
    private annotationsSrv
  ) {
    super($scope, $injector);

    this.initialized = false;

    //this.$tooltip = $('<div id="tooltip" class="graph-tooltip">');

    // defaults configs
    _.defaultsDeep(this.panel, PlotlyPanelCtrl.defaults);

    this.cfg = this.panel.pconfig;

    this.traces = [];

    // ?? This seems needed for tests?!!
    if (!this.events) {
      return;
    }

    loadPlotly(this.cfg).then(v => {
      Plotly = v;
      console.log('Plotly', v);

      // Wait till plotly exists has loaded before we handle any data
      this.events.on('render', this.onRender.bind(this));
      this.events.on('data-received', this.onDataReceived.bind(this));
      this.events.on('data-error', this.onDataError.bind(this));
      this.events.on('panel-size-changed', this.onResize.bind(this));
      this.events.on('data-snapshot-load', this.onDataSnapshotLoad.bind(this));
      this.events.on('refresh', this.onRefresh.bind(this));

      // Refresh after plotly is loaded
      this.refresh();
    });

    // Standard handlers
    this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
    this.events.on('panel-initialized', this.onPanelInitialized.bind(this));
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

  // Don't call resize too quickly
  doResize = _.debounce(() => {
    // https://github.com/alonho/angular-plotly/issues/26
    const e = window.getComputedStyle(this.graphDiv).display;
    if (!e || 'none' === e) {
      // not drawn!
      console.warn('resize a plot that is not drawn yet');
    } else {
      const rect = this.graphDiv.getBoundingClientRect();
      this.layout.width = rect.width;
      this.layout.height = this.height;
      Plotly.redraw(this.graphDiv);
    }
  }, 50);

  onResize() {
    if (this.graphDiv && this.layout && Plotly) {
      this.doResize(); // Debounced
    }
  }

  onDataError(err) {
    this.series = [];
    this.annotations.clear();
    this.render();
  }

  onRefresh() {
    // ignore fetching data if another panel is in fullscreen
    if (this.otherPanelInFullscreenMode()) {
      return;
    }

    if (this.graphDiv && this.initialized && Plotly) {
      Plotly.redraw(this.graphDiv);
    }
  }

  onInitEditMode() {
    this.editor = new EditorHelper(this);
    this.addEditorTab('Display', 'public/plugins/natel-plotly-panel/partials/tab_display.html', 2);
    this.addEditorTab('Traces', 'public/plugins/natel-plotly-panel/partials/tab_traces.html', 3);
    //  this.editorTabIndex = 1;
    this.onConfigChanged(); // Sets up the axis info

    // Check the size in a little bit
    setTimeout(() => {
      console.log('RESIZE in editor');
      this.onResize();
    }, 500);
  }

  processConfigMigration() {
    console.log('Migrating Plotly Configuration to version: ' + PlotlyPanelCtrl.configVersion);

    // Remove some things that should not be saved
    const cfg = this.panel.pconfig;
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

  onPanelInitialized() {
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
      const copy = {};
      _.forEach(obj, (v, k) => {
        copy[k] = this.deepCopyWithTemplates(v);
      });
      return copy;
    }
    return obj;
  };

  getProcessedLayout() {
    // Copy from config
    const layout = this.deepCopyWithTemplates(this.cfg.layout);
    layout.plot_bgcolor = 'transparent';
    layout.paper_bgcolor = layout.plot_bgcolor;

    // Update the size
    const rect = this.graphDiv.getBoundingClientRect();
    layout.autosize = false; // height is from the div
    layout.height = this.height;
    layout.width = rect.width;

    // Make sure it is something
    if (!layout.xaxis) {
      layout.xaxis = {};
    }
    if (!layout.yaxis) {
      layout.yaxis = {};
    }

    // If tickangle is 0, remove it to enable default behaviour,
    // which is to use 0 if it fits and otherwise 90.
    if (layout.tickangle === 0) {
      delete layout.tickangle;
    }

    // Fixed scales
    if (this.cfg.fixScale) {
      if ('x' === this.cfg.fixScale) {
        layout.yaxis.scaleanchor = 'x';
      } else if ('y' === this.cfg.fixScale) {
        layout.xaxis.scaleanchor = 'y';
      } else if ('z' === this.cfg.fixScale) {
        layout.xaxis.scaleanchor = 'z';
        layout.yaxis.scaleanchor = 'z';
      }
    }

    if (this.is3d()) {
      if (!layout.zaxis) {
        layout.zaxis = {};
      }

      // 3d uses 'scene' for the axis
      layout.scene = {
        xaxis: layout.xaxis,
        yaxis: layout.yaxis,
        zaxis: layout.zaxis,
      };

      delete layout.xaxis;
      delete layout.yaxis;
      delete layout.zaxis;

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

      // Check if the X axis should be a date
      if (!layout.xaxis.type || layout.xaxis.type === 'auto') {
        const mapping = _.get(this.cfg, 'traces[0].mapping.x');
        if (mapping && mapping.indexOf('time') >= 0) {
          layout.xaxis.type = 'date';
        }
      }

      layout.margin = {
        l: layout.yaxis.tickmargin,
        r: 5,
        t: 0,
        b: layout.xaxis.tickmargin,
        pad: 2,
      };

      // Add a bit more margin if there is an axis title.
      if (layout.xaxis.title)
        layout.margin.b += 25;
      if (layout.yaxis.title)
        layout.margin.l += 25;

      // Set the range to the query window
      const isDate = layout.xaxis.type === 'date';
      if (isDate && !layout.xaxis.range) {
        const range = this.timeSrv.timeRange();
        layout.xaxis.range = [range.from.valueOf(), range.to.valueOf()];
      }

      // get the css rule of grafana graph axis text
      const labelStyle = this.getCssRule('div.flot-text');
      if (labelStyle) {
        let color = labelStyle.style.color;
        if (!layout.font) {
          layout.font = {};
        }
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

      // Set the second axis
      layout.yaxis2 = PlotlyPanelCtrl.yaxis2;
    }
    return layout;
  }

  onRender() {
    // ignore fetching data if another panel is in fullscreen
    if (this.otherPanelInFullscreenMode() || !this.graphDiv) {
      return;
    }

    if (!Plotly) {
      return;
    }

    if (!this.initialized) {
      const s = this.cfg.settings;

      const options = {
        showLink: false,
        displaylogo: false,
        displayModeBar: s.displayModeBar,
        modeBarButtonsToRemove: ['sendDataToCloud'], //, 'select2d', 'lasso2d']
      };

      this.layout = this.getProcessedLayout();
      this.layout.shapes = this.annotations.shapes;
      let traces = this.traces;
      if (this.annotations.shapes.length > 0) {
        traces = this.traces.concat(this.annotations.trace);
      }
      Plotly.react(this.graphDiv, traces, this.layout, options);

      this.graphDiv.on('plotly_click', data => {
        if (data === undefined || data.points === undefined) {
          return;
        }
        for (let i = 0; i < data.points.length; i++) {
          const idx = data.points[i].pointNumber;
          const ts = this.traces[0].ts[idx];
          // console.log( 'CLICK!!!', ts, data );
          const msg = data.points[i].x.toPrecision(4) + ', ' + data.points[i].y.toPrecision(4);
          this.$rootScope.appEvent('alert-success', [
            msg,
            '@ ' + this.dashboard.formatDate(moment(ts)),
          ]);
        }
      });

      // if(true) {
      //   this.graphDiv.on('plotly_hover', (data, xxx) => {
      //     console.log( 'HOVER!!!', data, xxx, this.mouse );
      //     if(data.points.length>0) {
      //       var idx = 0;
      //       var pt = data.points[idx];

      //       var body = '<div class="graph-tooltip-time">'+ pt.pointNumber +'</div>';
      //       body += "<center>";
      //       body += pt.x + ', '+pt.y;
      //       body += "</center>";

      //       //this.$tooltip.html( body ).place_tt( this.mouse.pageX + 10, this.mouse.pageY );
      //     }
      //   }).on('plotly_unhover', (data) => {
      //     //this.$tooltip.detach();
      //   });
      // }

      this.graphDiv.on('plotly_selected', data => {
        if (data === undefined || data.points === undefined) {
          return;
        }

        if (!this.seriesIsTimeseries) {
          console.log('Not timeseries data, time zoom disabled');
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
          const found = data.points[i];
          const idx = found.pointNumber;
          const ts = found.fullData.x[idx];
          min = Math.min(min, ts);
          max = Math.max(max, ts);
        }

        // At least 2 seconds
        min -= 1000;
        max += 1000;

        const range = {from: moment.utc(min), to: moment.utc(max)};

        console.log('SELECTED!!!', min, max, data.points.length, range);

        this.timeSrv.setTime(range);

        // rebuild the graph after query
        if (this.graphDiv) {
          Plotly.Plots.purge(this.graphDiv);
          this.graphDiv.innerHTML = '';
          this.initialized = false;
        }
      });
      this.initialized = true;
    } else if (this.initialized) {
      Plotly.redraw(this.graphDiv).then(() => {
        this.renderingCompleted();
      });
    } else {
      console.log('Not initialized yet!');
    }
  }

  onDataSnapshotLoad(snapshot) {
    this.onDataReceived(snapshot);
  }

  _hadAnno = false;

  onDataReceived(dataList) {
    const finfo: SeriesWrapper[] = [];
    const autotrace = this.cfg.settings.autotrace;
    let seriesHash = '/';
    let autotraceDataSeries = {};
    if (dataList && dataList.length > 0) {
      if (autotrace) {
        // Check input is of expected form.
        dataList.forEach((series, sidx) => {
          if (series.columns && series.columns.length === 3 && series.type === 'table') {
            series.rows.forEach((val) => {
              const sname = val[0];
              if (!(sname in autotraceDataSeries)) {
                autotraceDataSeries[sname] = {
                  columns: series.columns,
                  rows: [],
                  type: 'table',
                  name: sname,
                }
              };
              autotraceDataSeries[sname].rows.push(val);
            });
          } else {
            console.error('Autotrace needs table input with 3 columns', sidx, series);
            throw new Error('Autotrace needs table input with 3 columns');
          }
        });

        let autotraceDataList: any = [];
        for (var key in autotraceDataSeries) {
          autotraceDataList.push(autotraceDataSeries[key]);
        }
        this._updateAutoTraces(autotraceDataSeries);
        dataList = autotraceDataList;
      }

      const useRefID = dataList.length === this.panel.targets.length;
      this.seriesIsTimeseries = true;
      dataList.forEach((series, sidx) => {
        let refId = '';
        if (autotrace) {
          refId = series.name;
        } else {
          if (useRefID) {
            refId = _.get(this.panel, 'targets[' + sidx + '].refId');
            if (!refId) {
              refId = String.fromCharCode('A'.charCodeAt(0) + sidx);
            }
          }
        }
        if (series.columns) {
          for (let i = 0; i < series.columns.length; i++) {
            finfo.push(new SeriesWrapperTable(refId, series, i));
          }
          finfo.push(new SeriesWrapperTableRow(refId, series));
        } else if (series.target) {
          finfo.push(new SeriesWrapperSeries(refId, series, 'value'));
          finfo.push(new SeriesWrapperSeries(refId, series, 'time'));
          finfo.push(new SeriesWrapperSeries(refId, series, 'index'));
        } else {
          console.error('Unsupported Series response', sidx, series);
        }
        if (series.type === 'table')
          this.seriesIsTimeseries = false;
      });
    }
    this.seriesByKey.clear();
    finfo.forEach(s => {
      s.getAllKeys().forEach(k => {
        this.seriesByKey.set(k, s);
        seriesHash += '$' + k;
      });
    });
    this.series = finfo;

    // Now Process the loaded data
    const hchanged = this.seriesHash !== seriesHash;
    if (hchanged && this.editor) {
      EditorHelper.updateMappings(this);
      this.editor.selectTrace(this.editor.traceIndex);
      this.editor.onConfigChanged();
    }

    if (hchanged || !this.initialized) {
      this.onConfigChanged();
      this.seriesHash = seriesHash;
    }

    // Support Annotations
    let annotationPromise = Promise.resolve();
    if (!this.cfg.showAnnotations || this.is3d()) {
      this.annotations.clear();
      if (this.layout) {
        if (this.layout.shapes) {
          this.onConfigChanged();
        }
        this.layout.shapes = [];
      }
    } else {
      annotationPromise = this.annotationsSrv
        .getAnnotations({
          dashboard: this.dashboard,
          panel: this.panel,
          range: this.range,
        })
        .then(results => {
          const hasAnno = this.annotations.update(results);
          if (this.layout) {
            if (hasAnno !== this._hadAnno) {
              this.onConfigChanged();
            }
            this.layout.shapes = this.annotations.shapes;
          }
          this._hadAnno = hasAnno;
        });
    }

    // Load the real data changes
    annotationPromise.then(() => {
      this._updateTraceData();
      this.render();
    });
  }

  __addCopyPath(trace: any, key: string, path: string) {
    if (key) {
      trace.__set.push({
        key: key,
        path: path,
      });
      const s: SeriesWrapper = this.seriesByKey.get(key);
      if (!s) {
        this.dataWarnings.push('Unable to find: ' + key + ' for ' + trace.name + ' // ' + path);
      }
    }
  }

  // This will update all trace settings *except* the data
  _updateTracesFromConfigs() {
    // If we're in autotrace mode, trace creation happens elsewhere.
    if (this.cfg.settings.autotrace)
      return;

    this.dataWarnings = [];

    // Make sure we have a trace
    if (this.cfg.traces == null || this.cfg.traces.length < 1) {
      this.cfg.traces = [_.cloneDeep(PlotlyPanelCtrl.defaultTrace)];
    }

    const is3D = this.is3d();
    const isBar = this.isBar();
    this.traces = this.cfg.traces.map((tconfig, idx) => {
      const config = this.deepCopyWithTemplates(tconfig) || {};
      _.defaults(config, PlotlyPanelCtrl.defaults);
      const mapping = config.mapping;

      const trace: any = {
        name: config.name || EditorHelper.createTraceName(idx),
        type: this.cfg.settings.type,
        orientation: this.cfg.settings.orientation,
        __set: [], // { key:? property:? }
      };

      if (isBar) {
        trace.marker = config.settings.barmarker;
      } else {
        let mode = '';
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

        if (is3D) {
          this.__addCopyPath(trace, mapping.z, 'z');
        }

        // Set the trace mode
        if (mode) {
          trace.mode = mode.substring(1);
        }
      }

      // Set the text
      this.__addCopyPath(trace, mapping.text, 'text');
      this.__addCopyPath(trace, mapping.x, 'x');
      this.__addCopyPath(trace, mapping.y, 'y');

      return trace;
    });
  }

  // Autotrace. Recreate the traces to those found in the data.
  _updateAutoTraces(series) {
    this.dataWarnings = [];

    delete this.traces;

    this.traces = [];

    for (var key in series) {
      const trace: any = {
        name: key,
        type: this.cfg.settings.type,
        orientation: this.cfg.settings.orientation,
        __set: [], // { key:? property:? }
      };

      // Set the text
      this.__addCopyPath(trace, key + '/' + series[key].columns[1].text, 'x');
      this.__addCopyPath(trace, key + '/' + series[key].columns[2].text, 'y');
      if (trace.orientation === 'v')
        this.__addCopyPath(trace, key + '/' + series[key].columns[2].text, 'text');
      else
        this.__addCopyPath(trace, key + '/' + series[key].columns[1].text, 'text');

      this.traces.push(trace);
    }

    if (this.traces.length < 1) {
      this.traces = [_.cloneDeep(PlotlyPanelCtrl.defaultTrace)];
    }
  }

  // Fills in the required data into the trace values
  _updateTraceData(force = false): boolean {
    if (!this.series) {
      // console.log('No series data yet!');
      return false;
    }

    if (force || !this.traces) {
      this._updateTracesFromConfigs();
    } else if (!this.cfg.settings.autotrace && this.traces.length !== this.cfg.traces.length) {
      console.log(
        'trace number mismatch.  Found: ' +
          this.traces.length +
          ', expect: ' +
          this.cfg.traces.length
      );
      this._updateTracesFromConfigs();
    }

    // Use zero when the metric value is missing
    // Plotly gets lots of errors when the values are missing
    let zero: any = [];
    this.traces.forEach(trace => {
      if (trace.__set) {
        trace.__set.forEach(v => {
          const s = this.seriesByKey.get(v.key);
          let vals: any[] = zero;
          if (s) {
            vals = s.toArray();
            if (vals && vals.length > zero.length) {
              zero = Array.from(Array(3), () => 0);
            }
          } else {
            if (!this.error) {
              this.error = '';
            }
            this.error += 'Unable to find: ' + v.key + ' (using zeros).  ';
          }
          if (!vals) {
            vals = zero;
          }
          _.set(trace, v.path, vals);
        });
      }
    });

    //console.log('SetDATA', this.traces);
    return true;
  }

  onConfigChanged() {
    // Force reloading the traces
    this._updateTraceData(true);

    if (!Plotly) {
      return;
    }

    // Check if the plotly library changed
    loadIfNecessary(this.cfg).then(res => {
      if (res) {
        if (Plotly) {
          Plotly.purge(this.graphDiv);
        }
        Plotly = res;
      }

      // Updates the layout and redraw
      if (this.initialized && this.graphDiv) {
        if (!this.cfg.showAnnotations) {
          this.annotations.clear();
        }

        const s = this.cfg.settings;
        const options = {
          showLink: false,
          displaylogo: false,
          displayModeBar: s.displayModeBar,
          modeBarButtonsToRemove: ['sendDataToCloud'], //, 'select2d', 'lasso2d']
        };
        this.layout = this.getProcessedLayout();
        this.layout.shapes = this.annotations.shapes;
        let traces = this.traces;
        if (this.annotations.shapes.length > 0) {
          traces = this.traces.concat(this.annotations.trace);
        }
        Plotly.react(this.graphDiv, traces, this.layout, options);
      }

      this.render(); // does not query again!
    });
  }

  is3d() {
    return this.cfg.settings.type === 'scatter3d';
  }

  isBar() {
    return this.cfg.settings.type === 'bar';
  }

  link(scope, elem, attrs, ctrl) {
    this.graphDiv = elem.find('.plotly-spot')[0];
    this.initialized = false;
    elem.on('mousemove', evt => {
      this.mouse = evt;
    });

    //let p = $(this.graphDiv).parent().parent()[0];
    //console.log( 'PLOT', this.graphDiv, p );
  }
}

export {PlotlyPanelCtrl, PlotlyPanelCtrl as PanelCtrl};
