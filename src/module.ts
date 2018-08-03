///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />

import {MetricsPanelCtrl} from 'app/plugins/sdk';

import _ from 'lodash';
import moment from 'moment';
import $ from 'jquery';

import * as Plotly from './lib/plotly.min';

class PlotlyPanelCtrl extends MetricsPanelCtrl {
  static templateUrl = 'partials/module.html';

  sizeChanged: boolean;
  initalized: boolean;
  $tooltip: any;

  defaults = {
    pconfig: {
      series: [],
      settings: {
        type: 'scatter',
        mode: 'lines+markers',
        displayModeBar: false
      },
      layout: {
        autosize: false,
        showlegend: false,
        legend: {orientation: 'v'},
        dragmode: 'lasso', // (enumerated: "zoom" | "pan" | "select" | "lasso" | "orbit" | "turntable" )
        hovermode: 'closest',
        plot_bgcolor: 'transparent',
        paper_bgcolor: 'transparent', // transparent?
        font: {
          color: '#D8D9DA',
          family: '"Open Sans", Helvetica, Arial, sans-serif',
        },
        margin: {
          t: 0,
          b: 45,
          l: 65,
          r: 20,
        },
        xaxis: {
          showgrid: true,
          zeroline: false,
          type: 'linear',
          gridcolor: '#444444',
          rangemode: 'normal', // (enumerated: "normal" | "tozero" | "nonnegative" )
        },
        yaxis: {
          showgrid: true,
          zeroline: false,
          type: 'linear',
          gridcolor: '#444444',
          rangemode: 'normal', // (enumerated: "normal" | "tozero" | "nonnegative" )
        },
        zaxis: {
          showgrid: true,
          zeroline: false,
          type: 'linear',
          gridcolor: '#444444',
          rangemode: 'normal', // (enumerated: "normal" | "tozero" | "nonnegative" )
        },
        scene: {
          xaxis: {title: 'X AXIS'},
          yaxis: {title: 'Y AXIS'},
          zaxis: {title: 'Z AXIS'},
        },
      },
    },
  };

  traces: Array<any>;
  layout: any;
  graph: any;
  series: Array<any>;
  segs: any;
  mouse: any;
  data: any;
  cfg: any;

  // Used for the editor control
  subTabIndex: number;

  /** @ngInject **/
  constructor($scope, $injector, $window, private $rootScope, private uiSegmentSrv) {
    super($scope, $injector);

    this.sizeChanged = true;
    this.initalized = false;

    this.$tooltip = $('<div id="tooltip" class="graph-tooltip">');

    // defaults configs
    _.defaultsDeep(this.panel, this.defaults);

    this.cfg = this.panel.pconfig;

    // Update existing configurations
    this.cfg.layout.paper_bgcolor = 'transparent';
    this.cfg.layout.plot_bgcolor = this.cfg.layout.paper_bgcolor;

    // get the css rule of grafana graph axis text
    const labelStyle = this.getCssRule('div.flot-text');
    if (labelStyle) {
      let color = labelStyle.style.color || this.cfg.layout.font.color;
      // set the panel font color to grafana graph axis text color
      this.cfg.layout.font.color = color;

      // make color more transparent
      color = $.color
        .parse(color)
        .scale('a', 0.22)
        .toString();

      // set gridcolor (like grafana graph)
      this.cfg.layout.xaxis.gridcolor = color;
      this.cfg.layout.yaxis.gridcolor = color;
    }

    this.traces = [{}];
    this.series = [];
    this.segs = [];

    this._updateSeries();

    this.layout = $.extend(true, {}, this.cfg.layout);

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
    this.sizeChanged = true;
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

    if (this.graph && this.initalized) {
      Plotly.redraw(this.graph);
    }
  }

  onInitEditMode() {
    this.addEditorTab(
      'Display',
      'public/plugins/natel-plotly-panel/partials/tab_display.html',
      2
    );
    //  this.editorTabIndex = 1;
    this.refresh();
    this.subTabIndex = 0; // select the options
  }

  onSegsChanged(idx) {
    this.getSerieConfig(idx).settings.marker.symbol = this.segs[idx].symbol.value;
    this.onConfigChanged();

    console.log(this.segs[idx].symbol, this.cfg);
  }

  onPanelInitalized() {
    this.onConfigChanged();
  }

  onRender() {
    // ignore fetching data if another panel is in fullscreen
    if (this.otherPanelInFullscreenMode() || !this.graph) {
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

      let rect = this.graph.getBoundingClientRect();

      let old = this.layout;
      this.layout = $.extend(true, {}, this.cfg.layout);
      this.layout.height = this.height;
      this.layout.width = rect.width;
      if (old) {
        this.layout.xaxis.title = old.xaxis.title;
        this.layout.yaxis.title = old.yaxis.title;
      }
      Plotly.newPlot(this.graph, this.traces, this.layout, options);

      this.graph.on('plotly_click', data => {
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

      this.graph.on('plotly_selected', data => {
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

        let range = { from: moment.utc(min), to: moment.utc(max) };

        console.log('SELECTED!!!', min, max, data.points.length, range);

        this.timeSrv.setTime(range);

        // rebuild the graph after query
        if (this.graph) {
          Plotly.Plots.purge(this.graph);
          this.graph.innerHTML = '';
          this.initalized = false;
        }
      });
    } else {
      Plotly.redraw(this.graph);
    }

    if (this.sizeChanged && this.graph && this.layout) {
      let rect = this.graph.getBoundingClientRect();
      this.layout.width = rect.width;
      this.layout.height = this.height;
      Plotly.Plots.resize(this.graph);
    }
    this.sizeChanged = false;
    this.initalized = true;
  }

  onDataSnapshotLoad(snapshot) {
    this.onDataReceived(snapshot);
  }

  onDataReceived(dataList) {
    this.series.forEach((serie, idx) => {
      if (this.traces.length <= idx) {
        this.traces.push({});
      }
      this.traces[idx].x = [];
      this.traces[idx].y = [];
      this.traces[idx].z = [];

      this.traces[idx].type = this.cfg.settings.type;
      this.traces[idx].mode = this.cfg.settings.mode;
    });

    this.data = {};
    if (dataList.length < 1) {
      console.log('No data', dataList);
    } else {
      this.traces.forEach((trace, i) => {
        let dmapping = {
          x: null,
          y: null,
          z: null,
        };

        let traceConfig = this.getSerieConfig(i);
        trace.name = traceConfig.name || `trace ${i + 1}`;

        //   console.log( "plotly data", dataList);
        let mapping = traceConfig.mapping;
        let key = {
          name: '@time',
          type: 'ms',
          missing: 0,
          idx: -1,
          points: []
        };
        let idx = {
          name: '@index',
          type: 'number',
          missing: 0,
          idx: -1,
          points: []
        };
        this.data[key.name] = key;
        this.data[idx.name] = idx;
        // TODO: maybe move dataList parsing to separate method?
        for (let i = 0; i < dataList.length; i++) {
          if ('table' === dataList[i].type) {
            const table = dataList[i];
            if (i > 0) {
              throw { message: 'Multiple tables not (yet) supported' };
            }

            for (let k = 0; k < table.rows.length; k++) {
              idx.points.push(k);
            }

            for (let j = 0; j < table.columns.length; j++) {
              const col = table.columns[j];
              let val = {
                name: col.text,
                type: col.type,
                missing: 0,
                idx: j,
                points: [],
              };
              if (j == 0 && val.type === 'time') {
                // InfluxDB time
                val = key; // will overwrite the time field
              }

              if (!val.type) {
                val.type = 'number';
              }
              for (let k = 0; k < table.rows.length; k++) {
                val.points.push(table.rows[k][j]);
              }
              this.data[val.name] = val;
            }
          } else {
            let datapoints: any[] = dataList[i].datapoints;
            if (datapoints.length > 0) {
              let val = {
                name: dataList[i].target,
                type: 'number',
                missing: 0,
                idx: i,
                points: [],
              };
              if (_.isString(datapoints[0][0])) {
                val.type = 'string';
              } else if (_.isBoolean(datapoints[0][0])) {
                val.type = 'boolean';
              }

              // Set the default mapping values
              if (i === 0) {
                dmapping.x = val.name;
              } else if (i === 1) {
                dmapping.y = val.name;
              } else if (i === 2) {
                dmapping.z = val.name;
              }

              this.data[val.name] = val;
              if (key.points.length === 0) {
                for (let j = 0; j < datapoints.length; j++) {
                  key.points.push(datapoints[j][1]);
                  val.points.push(datapoints[j][0]);
                  idx.points.push(j);
                }
              } else {
                for (let j = 0; j < datapoints.length; j++) {
                  if (j >= key.points.length) {
                    break;
                  }
                  // Make sure it is from the same timestamp
                  if (key.points[j] === datapoints[j][1]) {
                    val.points.push(datapoints[j][0]);
                  } else {
                    val.missing = val.missing + 1;
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

        if (!dX) {
          throw { message: 'Unable to find X: ' + mapping.x };
        }
        if (!dY) {
          dY = dX;
          dX = '@time';
        }

        trace.ts = key.points;
        trace.x = dX.points;
        trace.y = dY.points;

        if (this.is3d()) {
          dZ = this.data[mapping.z];
          if (!dZ) {
            throw { message: 'Unable to find Z: ' + mapping.z };
          }
          this.layout.scene.xaxis.title = this.cfg.layout.xaxis.title || dX.name;
          this.layout.scene.yaxis.title = this.cfg.layout.yaxis.title || dY.name;
          this.layout.scene.zaxis.title = this.cfg.layout.zaxis.title || dZ.name;

          trace.z = dZ.points;
          console.log('3D', this.layout);
        } else {
          this.layout.xaxis.title = this.cfg.layout.xaxis.title || dX.name;
          this.layout.yaxis.title = this.cfg.layout.yaxis.title || dY.name;
        }

        trace.marker = $.extend(true, {}, traceConfig.settings.marker);
        trace.line = $.extend(true, {}, traceConfig.settings.line);

        if (mapping.size) {
          dS = this.data[mapping.size];
          if (!dS) {
            throw { message: 'Unable to find Size: ' + mapping.size };
          }
          trace.marker.size = dS.points;
        }

        // Set the marker colors
        if (traceConfig.settings.color_option === 'ramp') {
          if (!mapping.color) {
            mapping.color = idx.name;
          }
          dC = this.data[mapping.color];
          if (!dC) {
            throw { message: 'Unable to find Color: ' + mapping.color };
          }
          trace.marker.color = dC.points;
        }
      });
    }
    this.render();
  }

  _updateSeries() {
    this.series = this.cfg.series.map((serie, idx) => {
      let serieClone = _.cloneDeep(serie);
      serieClone.x = val => {
        if (val) {
          serie.mapping.x = val;
        }
        return serie.mapping.x;
      };
      serieClone.y = val => {
        if (val) {
          serie.mapping.y = val;
        }
        return serie.mapping.y;
      };
      serieClone.z = val => {
        if (val) {
          serie.mapping.z = val;
        }
        return serie.mapping.z;
      };

      if (this.segs.length <= idx) {
        this.segs.push({
          symbol: this.uiSegmentSrv.newSegment({
            value: this.getSerieConfig(idx).settings.marker.symbol,
          }),
        });
      }

      return serieClone;
    });
    this.refresh();
  }

  createSerie() {
    this.cfg.series.push({
      name: ''
    });
    this._updateSeries();
    this.subTabIndex = this.series.length;
  }

  removeSerie(idx) {
    this.cfg.series.splice(idx, 1);
    this.series.splice(idx, 1);
    this.traces.splice(idx, 1);
    this.segs.splice(idx, 1);
    this.subTabIndex = this.series.length;
    this.refresh();
  }

  onChangeName(idx, name) {
    this.getSerieConfig(idx).name = name;
    this.refresh();
  }

  onConfigChanged() {
    if (this.graph && this.initalized) {
      Plotly.Plots.purge(this.graph);
      this.graph.innerHTML = '';
      this.initalized = false;
    }

    let axis = [this.cfg.layout.xaxis, this.cfg.layout.yaxis];
    for (let i = 0; i < axis.length; i++) {
      if (axis[i].rangemode === 'between') {
        if (axis[i].range == null) {
          axis[i].range = [0, null];
        }
      } else {
        axis[i].range = null;
      }
    }
    this.refresh();
  }

  is3d() {
    return this.cfg.settings.type === 'scatter3d';
  }

  getSerieConfig(idx) {
    if (this.cfg.series[idx] === undefined) {
      this.createSerie();
    }

    this.cfg.series[idx] = _.defaultsDeep(this.cfg.series[idx], {
      mapping: {
        x: null,
        y: null,
        z: null,
        color: null,
        size: null
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
        color_option: 'ramp'
      }
    });

    return this.cfg.series[idx];
  }

  link(scope, elem, attrs, ctrl) {
    this.graph = elem.find('.plotly-spot')[0];
    this.initalized = false;
    elem.on('mousemove', evt => {
      this.mouse = evt;
    });
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
