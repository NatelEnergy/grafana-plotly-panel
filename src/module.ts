///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />

import {MetricsPanelCtrl} from 'app/plugins/sdk';

import _ from 'lodash';
import moment from 'moment';
import $ from 'jquery';

import * as Plotly from './lib/plotly.min';

class PlotlyPanelCtrl extends MetricsPanelCtrl {
  static templateUrl = 'partials/module.html';

  initalized: boolean;
  $tooltip: any;

  defaults = {
    pconfig: {
      traces: [
        {
          name: 'trace 1',
          mapping: {
            x: 'A@index',
            y: 'A@index',
            z: null,
            color: 'A@index',
            size: null,
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
        },
      ],
      settings: {
        type: 'scatter',
        mode: 'lines+markers',
        displayModeBar: false,
      },
      layout: {
        showlegend: false,
        legend: {orientation: 'v'},
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

  plotlyData: Array<any>;
  layout: any;
  graphDiv: any;
  traces: Array<any>;
  segs: any;
  mouse: any;
  data: any;
  cfg: any;

  // For editor
  axis: Array<any> = [];

  // Used for the editor control
  traceTabIndex: number;

  /** @ngInject **/
  constructor($scope, $injector, $window, private $rootScope, private uiSegmentSrv) {
    super($scope, $injector);

    this.initalized = false;

    this.$tooltip = $('<div id="tooltip" class="graph-tooltip">');

    // defaults configs
    _.defaultsDeep(this.panel, this.defaults);

    this.cfg = this.panel.pconfig;

    this.plotlyData = [{}];
    this.traces = [];
    this.segs = [];

    this._updateTraces();

    this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
    this.events.on('render', this.onRender.bind(this));
    this.events.on('data-received', this.onDataReceived.bind(this));
    this.events.on('data-error', this.onDataError.bind(this));
    this.events.on('panel-initialized', this.onPanelInitalized.bind(this));
    this.events.on('panel-size-changed', this.onResize.bind(this));
    this.events.on('data-snapshot-load', this.onDataSnapshotLoad.bind(this));
    this.events.on('refresh', this.onRefresh.bind(this));
  }

  getCssRule(selectorText) {
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
    this.render([]);
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
    this.traceTabIndex = 0; // select the options
    this.onConfigChanged(); // Sets up the axis info
    this.onResize();
  }

  onSegsChanged(idx) {
    this.getTraceConfig(idx).settings.marker.symbol = this.segs[idx].symbol.value;
    this.onConfigChanged();

    console.log(this.segs[idx].symbol, this.cfg);
  }

  onPanelInitalized() {}

  deepCopyWithTeplates = obj => {
    if (_.isArray(obj)) {
      return obj.map(val => this.deepCopyWithTeplates(val));
    } else if (_.isString(obj)) {
      return this.templateSrv.replace(obj, this.panel.scopedVars);
    } else if (_.isObject(obj)) {
      let copy = {};
      _.forEach(obj, (v, k) => {
        copy[k] = this.deepCopyWithTeplates(v);
      });
      return copy;
    }
    return obj;
  };

  getProcessedLayout() {
    // Remove some things that should not be saved
    delete this.cfg.layout.plot_bgcolor;
    delete this.cfg.layout.paper_bgcolor;
    delete this.cfg.layout.autosize;
    delete this.cfg.layout.height;
    delete this.cfg.layout.width;
    if (!this.is3d()) {
      delete this.cfg.layout.zaxis;
    }

    // Copy from config
    let layout = this.deepCopyWithTeplates(this.cfg.layout);
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

      layout.scene.xaxis.title = layout.xaxis.title;
      layout.scene.yaxis.title = layout.yaxis.title;
      layout.scene.zaxis.title = layout.zaxis.title;
      layout.margin = {
        l: 0,
        r: 0,
        t: 0,
        b: 5,
        pad: 0,
      };
    } else {
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

      Plotly.react(this.graphDiv, this.plotlyData, this.layout, options);

      this.graphDiv.on('plotly_click', data => {
        if (data === undefined || data.points === undefined) {
          return;
        }
        for (let i = 0; i < data.points.length; i++) {
          let idx = data.points[i].pointNumber;
          let ts = this.plotlyData[0].ts[idx];
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
          let ts = this.plotlyData[0].ts[idx];
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

  private _rebuildMetrics(dataList: any[]) {
    this.plotlyData.forEach((trace, i) => {
      let dmapping = {
        x: null,
        y: null,
        z: null,
      };

      let traceConfig = this.getTraceConfig(i);
      trace.name = traceConfig.name;

      //   console.log( "plotly data", dataList);
      let mapping = traceConfig.mapping;

      // TODO: maybe move dataList parsing to separate method?

      for (let i = 0; i < dataList.length; i++) {
        let query = this.panel.targets[i];
        let refId = query.refId || 'A';

        let idxMetric = {
          name: refId + '@index',
          type: 'number',
          missing: 0,
          idx: -1,
          points: [],
        };
        this.data[idxMetric.name] = idxMetric;

        if ('table' === dataList[i].type) {
          const table = dataList[i];
          if (i > 0) {
            throw {message: 'Multiple tables not (yet) supported'};
          }

          for (let k = 0; k < table.rows.length; k++) {
            idxMetric.points.push(k);
          }

          for (let j = 0; j < table.columns.length; j++) {
            const col = table.columns[j];
            let valMetric = {
              name: refId + '.' + col.text,
              type: col.type,
              missing: 0,
              idx: j,
              points: [],
            };

            if (!valMetric.type) {
              valMetric.type = 'number';
            }
            for (let k = 0; k < table.rows.length; k++) {
              valMetric.points.push(table.rows[k][j]);
            }
            this.data[valMetric.name] = valMetric;
          }
        } else {
          let timeMetric = {
            name: refId + '@time',
            type: 'ms',
            missing: 0,
            idx: -1,
            points: [],
          };
          this.data[timeMetric.name] = timeMetric;

          let datapoints: any[] = dataList[i].datapoints;
          if (datapoints.length > 0) {
            let valMetric = {
              name: refId + '.' + dataList[i].target,
              type: 'number',
              missing: 0,
              idx: i,
              points: [],
            };
            if (_.isString(datapoints[0][0])) {
              valMetric.type = 'string';
            } else if (_.isBoolean(datapoints[0][0])) {
              valMetric.type = 'boolean';
            }

            // Set the default mapping values
            if (i === 0) {
              dmapping.x = valMetric.name;
            } else if (i === 1) {
              dmapping.y = valMetric.name;
            } else if (i === 2) {
              dmapping.z = valMetric.name;
            }

            this.data[valMetric.name] = valMetric;
            if (timeMetric.points.length === 0) {
              for (let j = 0; j < datapoints.length; j++) {
                timeMetric.points.push(datapoints[j][1]);
                valMetric.points.push(datapoints[j][0]);
                idxMetric.points.push(j);
              }
            } else {
              for (let j = 0; j < datapoints.length; j++) {
                if (j >= timeMetric.points.length) {
                  break;
                }
                // Make sure it is from the same timestamp
                if (timeMetric.points[j] === datapoints[j][1]) {
                  valMetric.points.push(datapoints[j][0]);
                } else {
                  valMetric.missing = valMetric.missing + 1;
                }
              }
            }
          }
        }
      }

      // Maybe overwrite?
      if (!mapping.x) {
        mapping.x = dmapping.x;
      }
      if (!mapping.y) {
        mapping.y = dmapping.y;
      }
      if (!mapping.z) {
        mapping.z = dmapping.z;
      }

      // console.log( "GOT", this.data, mapping );

      let dX = this.data[mapping.x];
      let dY = this.data[mapping.y];
      let dZ = null;
      let dC = null;
      let dS = null;

      let timeMetric = this.data['A.Time'] !== undefined ? 'A.Time' : 'A@time';

      if (!dX) {
        throw {message: 'Unable to find X: ' + mapping.x};
      }
      if (!dY) {
        dY = dX;
        dX = timeMetric;
      }

      trace.ts = this.data[timeMetric].points;
      trace.x = dX.points;
      trace.y = dY.points;

      if (this.is3d()) {
        dZ = this.data[mapping.z];
        if (!dZ) {
          throw {message: 'Unable to find Z: ' + mapping.z};
        }
        trace.z = dZ.points;
      }

      trace.marker = this.deepCopyWithTeplates(traceConfig.settings.marker) || {};
      trace.line = this.deepCopyWithTeplates(traceConfig.settings.line) || {};

      if (mapping.size) {
        dS = this.data[mapping.size];
        if (!dS) {
          throw {message: 'Unable to find Size: ' + mapping.size};
        }
        trace.marker.size = dS.points;
      }

      if (mapping.text) {
        trace.text = this.data[mapping.text].points;
        if (trace.text && traceConfig.settings.textposition) {
          trace.mode += '+text';
          trace.textposition = traceConfig.settings.textposition;
        }
      } else {
        trace.text = null;
      }

      // Set the marker colors
      if (traceConfig.settings.color_option === 'ramp') {
        if (!mapping.color) {
          mapping.color = 'A@index';
        }
        dC = this.data[mapping.color];
        if (!dC) {
          throw {message: 'Unable to find Color: ' + mapping.color};
        }
        trace.marker.color = dC.points;
      } else {
        delete trace.marker.showscale;
      }
    });
  }

  onDataReceived(dataList) {
    this.traces.forEach((trace, idx) => {
      if (this.plotlyData.length <= idx) {
        this.plotlyData.push({});
      }
      this.plotlyData[idx].x = [];
      this.plotlyData[idx].y = [];
      this.plotlyData[idx].z = [];

      this.plotlyData[idx].type = this.cfg.settings.type;
      this.plotlyData[idx].mode = this.cfg.settings.mode;
    });

    this.data = {};
    this.dataList = dataList;
    if (dataList.length < 1) {
      console.log('No data', dataList);
    } else {
      this._rebuildMetrics(dataList);
    }
    this.render();
  }

  _updateTraces() {
    this.traces = this.cfg.traces.map((trace, idx) => {
      let traceClone = _.cloneDeep(trace);
      traceClone.x = val => {
        if (val) {
          trace.mapping.x = val;
        }
        return trace.mapping.x;
      };
      traceClone.y = val => {
        if (val) {
          trace.mapping.y = val;
        }
        return trace.mapping.y;
      };
      traceClone.z = val => {
        if (val) {
          trace.mapping.z = val;
        }
        return trace.mapping.z;
      };

      if (this.segs.length <= idx) {
        this.segs.push({
          symbol: this.uiSegmentSrv.newSegment({
            value: this.getTraceConfig(idx).settings.marker.symbol,
          }),
        });
      }
      return traceClone;
    });
    this.refresh();
  }

  createTrace() {
    let trace: any = {};
    if (this.cfg.traces.length > 0) {
      trace = _.cloneDeep(this.cfg.traces[this.cfg.traces.length - 1]);
    } else {
      trace = {
        mapping: {
          x: 'A@index',
          y: 'A@index',
          z: 'A@index',
          color: 'A@index',
          size: null,
        },
      };
    }
    trace.name = PlotlyPanelCtrl.createTraceName(this.traces.length);
    this.cfg.traces.push(trace);
    this._updateTraces();
    this.traceTabIndex = this.traces.length - 1;
  }

  removeCurrentTrace() {
    this.cfg.traces.splice(this.traceTabIndex, 1);
    this.traces.splice(this.traceTabIndex, 1);
    this.plotlyData.splice(this.traceTabIndex, 1);
    this.segs.splice(this.traceTabIndex, 1);
    this.traceTabIndex = Math.min(this.traces.length - 1, this.traceTabIndex);
    this.refresh();
  }

  onChangeName(idx: number, name: string) {
    if (name === '') {
      name = PlotlyPanelCtrl.createTraceName(idx);
      this.traces[idx].name = name;
    }
    this.getTraceConfig(idx).name = name;
    this.refresh();
  }

  static createTraceName(idx: number) {
    return 'Trace ' + (idx + 1);
  }

  onConfigChanged() {
    this.cfg.layout.xaxis.label = 'X Axis';
    this.cfg.layout.yaxis.label = 'Y Axis';

    this.axis = [];
    this.axis.push(this.cfg.layout.xaxis);
    this.axis.push(this.cfg.layout.yaxis);
    if (this.is3d()) {
      if (!this.cfg.layout.zaxis) {
        this.cfg.layout.zaxis = {};
      }
      this.cfg.layout.zaxis.label = 'Z Axis';
      this.axis.push(this.cfg.layout.zaxis);
    }

    for (let i = 0; i < this.axis.length; i++) {
      if (this.axis[i].rangemode === 'between') {
        if (this.axis[i].range == null) {
          this.axis[i].range = [0, null];
        }
      } else {
        this.axis[i].range = null;
      }
    }

    if (this.initalized && this.graphDiv) {
      let s = this.cfg.settings;

      let options = {
        showLink: false,
        displaylogo: false,
        displayModeBar: s.displayModeBar,
        modeBarButtonsToRemove: ['sendDataToCloud'], //, 'select2d', 'lasso2d']
      };
      this.layout = this.getProcessedLayout();
      Plotly.react(this.graphDiv, this.plotlyData, this.layout, options);
    }

    // Will query and then update metrics
    this.refresh();
  }

  is3d() {
    return this.cfg.settings.type === 'scatter3d';
  }

  getTraceConfig(idx) {
    if (this.cfg.traces[idx] === undefined) {
      this.createTrace();
    }

    this.cfg.traces[idx] = _.defaultsDeep(this.cfg.traces[idx], {
      mapping: {
        x: null,
        y: null,
        z: null,
        color: null,
        size: null,
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
    });

    return this.cfg.traces[idx];
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

  //---------------------------

  getSymbolSegs() {
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
      segs.push(this.uiSegmentSrv.newSegment(val));
    });
    return this.$q.when(segs);
  }
}

export {PlotlyPanelCtrl as PanelCtrl};
