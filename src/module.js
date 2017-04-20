
import {MetricsPanelCtrl} from  'app/plugins/sdk';

import _ from 'lodash';
import moment from 'moment';
import angular from 'angular';

import * as Plotly from './external/plotly';

class PlotlyPanelCtrl extends MetricsPanelCtrl {

  constructor($scope, $injector, $q, $rootScope, $timeout, $window, timeSrv, uiSegmentSrv) {
    super($scope, $injector);

    this.$rootScope = $rootScope;
    this.timeSrv = timeSrv;
    this.uiSegmentSrv = uiSegmentSrv;
    this.q = $q;

    this.sizeChanged = true;
    this.initalized = false;

    this.$tooltip = $('<div id="tooltip" class="graph-tooltip">');


    var dcfg = {
      mapping: {
        x: null,
        y: null,
        z: null,
        color: null,
        size: null,
      },
      settings: {
        type: 'scatter',
        mode: 'lines+markers',
        displayModeBar: false,
        line: {
          color : '#005f81',
          width : 6,
          dash  : 'solid',
          shape : 'linear'
        },
        marker: {
          size: 30,
          symbol: 'circle',
          color: '#33B5E5',
          colorscale: 'YIOrRd',
          sizemode: 'diameter',
          sizemin: 3,
          sizeref: 0.2,
          line: {
            color: '#DDD',
            width: 0
          },
          showscale: true
        },
        color_option: 'ramp'
      },
      layout: {
        autosize: false,
        showlegend: false,
        legend: {"orientation": "v"},
        dragmode: 'lasso', // (enumerated: "zoom" | "pan" | "select" | "lasso" | "orbit" | "turntable" )
        hovermode: 'closest',
        plot_bgcolor: "#1f1d1d",
        paper_bgcolor: 'rgba(0,0,0,0)', // transparent?
        font: {
          color: '#D8D9DA',
          family: '"Open Sans", Helvetica, Arial, sans-serif'
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
          rangemode: 'normal' // (enumerated: "normal" | "tozero" | "nonnegative" )
        },
        yaxis: {
          showgrid: true,
          zeroline: false,
          type: 'linear',
          gridcolor: '#444444',
          rangemode: 'normal' // (enumerated: "normal" | "tozero" | "nonnegative" )
        },
        scene: {
          xaxis:{title: 'X AXIS'},
          yaxis:{title: 'Y AXIS'},
          zaxis:{title: 'Z AXIS'},
        },
      }
    };

    // Make sure it has the default settings (may have more!)
    this.panel.pconfig = $.extend(true, dcfg, this.panel.pconfig );

    var cfg = this.panel.pconfig;
    this.trace = { };
    this.layout = $.extend(true, {}, this.panel.pconfig.layout );

    this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
    this.events.on('render', this.onRender.bind(this));
    this.events.on('data-received', this.onDataReceived.bind(this));
    this.events.on('data-error', this.onDataError.bind(this));
    this.events.on('panel-initialized', this.onPanelInitalized.bind(this));
    this.events.on('refresh', this.onRefresh.bind(this));

    angular.element($window).bind('resize', this.onResize.bind(this) );
  }

  onResize() {
    this.sizeChanged = true;
  }

  onDataError(err) {
    this.seriesList = [];
    this.render([]);
    console.log("onDataError", err);
  }

  onRefresh() {
    if(this.graph && this.initalized) {
      Plotly.redraw(this.graph);
    }
  }

  onInitEditMode() {
    this.addEditorTab('Display', 'public/plugins/natel-plotly-panel/tab_display.html',2);
  //  this.editorTabIndex = 1;
    this.refresh();
    this.segs = {
      symbol: this.uiSegmentSrv.newSegment({value: this.panel.pconfig.settings.marker.symbol })
    };
    this.subTabIndex = 0; // select the options

    var cfg = this.panel.pconfig;
    this.axis = [
      { disp: 'X Axis', idx: 1, config: cfg.layout.xaxis, metric: (name) => { if(name) { cfg.mapping.x=name; } return cfg.mapping.x; }},
      { disp: 'Y Axis', idx: 2, config: cfg.layout.yaxis, metric: (name) => { if(name) { cfg.mapping.y=name; } return cfg.mapping.y; }},
      { disp: 'Z Axis', idx: 3, config: cfg.layout.yaxis, metric: (name) => { if(name) { cfg.mapping.z=name; } return cfg.mapping.z; }}
    ];
  }

  isAxisVisible(axis) {
    if(axis.idx==3) {
      return this.panel.pconfig.settings.type === 'scatter3d';
    }
    return true;
  }

  onSegsChanged() {
    this.panel.pconfig.settings.marker.symbol = this.segs.symbol.value;
    this.onConfigChanged();

    console.log( this.segs.symbol, this.panel.pconfig );
  }

  onPanelInitalized() {
    this.onConfigChanged();
  }

  onRender() {

    if(!this.initalized) {
      var s = this.panel.pconfig.settings;

      var options = {
        showLink: false,
        displaylogo: false,
        displayModeBar: s.displayModeBar,
        modeBarButtonsToRemove: ['sendDataToCloud'] //, 'select2d', 'lasso2d']
      }

      var data = [this.trace];
      var rect = this.graph.getBoundingClientRect();

      var old = this.layout;
      this.layout = $.extend(true, {}, this.panel.pconfig.layout );
      this.layout.height = this.height;
      this.layout.width = rect.width;
      if(old) {
        this.layout.xaxis.title = old.xaxis.title;
        this.layout.yaxis.title = old.yaxis.title;
      }

      Plotly.newPlot(this.graph, data, this.layout, options);

      this.graph.on('plotly_click', (data) => {
        for(var i=0; i < data.points.length; i++){
          var idx = data.points[i].pointNumber;
          var ts = this.trace.ts[idx];
         // console.log( 'CLICK!!!', ts, data );
          var msg = data.points[i].x.toPrecision(4) + ", "+data.points[i].y.toPrecision(4);
          this.$rootScope.appEvent('alert-success', [msg, '@ ' + this.dashboard.formatDate(moment(ts))]);
        }
      });

      if(false) {
        this.graph.on('plotly_hover', (data, xxx) => {
          console.log( 'HOVER!!!', data, xxx, this.mouse );
          if(data.points.length>0) {
            var idx = 0;
            var pt = data.points[idx];

            var body = '<div class="graph-tooltip-time">'+ pt.pointNumber +'</div>';
            body += "<center>";
            body += pt.x + ', '+pt.y;
            body += "</center>";

            this.$tooltip.html( body ).place_tt( this.mouse.pageX + 10, this.mouse.pageY );
          }
        }).on('plotly_unhover', (data) => {
          this.$tooltip.detach();
        });
      }

      this.graph.on('plotly_selected',  (data) => {

        if(data.points.length == 0) {
          console.log( "Nothign Selected", data)
          return;
        }

        console.log( "SELECTED", data)

        var min = Number.MAX_SAFE_INTEGER;
        var max = Number.MIN_SAFE_INTEGER;

        for(var i=0; i < data.points.length; i++){
          var idx = data.points[i].pointNumber;
          var ts = this.trace.ts[idx];
          min = Math.min( min, ts);
          max = Math.max( max, ts);
        }

        min -= 1000;
        max += 1000;

        var range = {from: moment.utc(min), to: moment.utc(max) };

        console.log( 'SELECTED!!!', min, max, data.points.length, range );

        this.timeSrv.setTime(range);

        // rebuild the graph after query
        if(this.graph) {
          Plotly.Plots.purge(this.graph);
          this.graph.innerHTML = '';
          this.initalized = false;
        }
      });
    }
    else {
      Plotly.redraw(this.graph);
    }

    if(this.sizeChanged && this.graph && this.layout) {
      var rect = this.graph.getBoundingClientRect();
      this.layout.width = rect.width;
      Plotly.Plots.resize(this.graph);
    }
    this.sizeChanged = false;
    this.initalized = true;
  }

  onDataReceived(dataList) {
    this.trace.x = [];
    this.trace.y = [];
    this.trace.z = [];

    this.data = {};
    if(dataList.length < 2) {
      console.log( "No data", dataList );
    }
    else {
      let dmapping = {
        x:null,
        y:null,
        z:null
      };

   //   console.log( "plotly data", dataList);
      let cfg = this.panel.pconfig;
      let mapping = cfg.mapping;
      let key = {
        name: "@time",
        type: 'ms',
        missing: 0,
        idx: -1,
        points: []
      };
      let idx = {
        name: "@index",
        type: 'number',
        missing: 0,
        idx: -1,
        points: []
      };
      this.data[key.name] = key;
      this.data[idx.name] = idx;
      for(let i=0; i<dataList.length; i++) {
        let datapoints = dataList[i].datapoints;
        if(datapoints.length > 0) {
          let val = {
            name: dataList[i].target,
            type: 'number',
            missing: 0,
            idx: i,
            points: []
          };
          if(_.isString(datapoints[0][0])) {
            val.type = 'string';
          }
          else if(_.isBoolean(datapoints[0][0])) {
            val.type = 'boolean';
          }

          // Set the default mapping values
          if(i==0) {
            dmapping.x = val.name;
          }
          else if(i==1) {
            dmapping.y = val.name;
          }
          else if(i==2) {
            dmapping.z = val.name;
          }

          this.data[val.name] = val;
          if(key.points.length==0) {
            for(var j=0; j<datapoints.length; j++) {
              key.points.push( datapoints[j][1] );
              val.points.push( datapoints[j][0] );
              idx.points.push( j );
            }
          }
          else {
            for(var j=0; j<datapoints.length; j++) {
              if(j >= key.points.length ) {
                break;
              }
              // Make sure it is from the same timestamp
              if(key.points[j] == datapoints[j][1]) {
                val.points.push( datapoints[j][0] );
              }
              else {
                val.missing = val.missing+1;
              }
            }
          }
        }
      }

      // Maybe overwrite?
      if(!mapping.x) mapping.x = dmapping.x;
      if(!mapping.y) mapping.y = dmapping.y;
      if(!mapping.z) mapping.z = dmapping.z;

     // console.log( "GOT", this.data, mapping );

      var dX = this.data[mapping.x];
      var dY = this.data[mapping.y];
      var dZ = null;
      var dC = null;
      var dS = null;
      var dT = null;

      if(!dX) {
        throw { message: "Unable to find X: "+mapping.x };
      }
      if(!dY) {
        throw { message: "Unable to find Y: "+mapping.y };
      }


      this.trace.ts = key.points;
      this.trace.x = dX.points;
      this.trace.y = dY.points;

      if(cfg.settings.type == 'scatter3d') {
        dZ = this.data[mapping.z];
        if(!dZ) {
          throw { message: "Unable to find Z: "+mapping.z };
        }
        this.layout.scene.xaxis.title = dX.name;
        this.layout.scene.yaxis.title = dY.name;
        this.layout.scene.zaxis.title = dZ.name;

        this.trace.z = dZ.points;
        console.log( "3D", this.layout);
      }
      else {
        this.layout.xaxis.title = dX.name;
        this.layout.yaxis.title = dY.name;
      }


      this.trace.marker = $.extend(true, {}, cfg.settings.marker);
      this.trace.line = $.extend(true, {}, cfg.settings.line);

      if(mapping.size) {
        dS = this.data[mapping.size];
        if(!dS) {
          throw { message: "Unable to find Size: "+mapping.size };
        }
        this.trace.marker.size = dS.points;
      }

      // Set the marker colors
      if( cfg.settings.color_option == 'ramp' ) {
        if(!mapping.color) {
          mapping.color = idx.name;
        }
        dC = this.data[mapping.color];
        if(!dC) {
          throw { message: "Unable to find Color: "+mapping.color };
        }
        this.trace.marker.color = dC.points;
      }

      console.log( "TRACE", this.trace );
    }
    this.render();
  }

  onConfigChanged() {
    console.log( "Config changed...");
    if(this.graph) {
      Plotly.Plots.purge(this.graph);
      this.graph.innerHTML = '';
      this.initalized = false;
    }

    var cfg = this.panel.pconfig;
    this.trace.type = cfg.settings.type;
    this.trace.mode = cfg.settings.mode;

    var axis = [ this.panel.pconfig.layout.xaxis, this.panel.pconfig.layout.yaxis];
    for(let i=0; i<axis.length; i++) {
      if( axis[i].rangemode === 'between' ) {
        if( axis[i].range == null) {
          axis[i].range = [0, null];
        }
      }
      else {
        axis[i].range = null;
      }
    }
    this.refresh();
  }

  link(scope, elem, attrs, ctrl) {
    this.graph = elem.find('.plotly-spot')[0];
    this.initalized = false;
    elem.on( 'mousemove', (evt) => {
      this.mouse = evt;
    });
  }

  //---------------------------


  getSymbolSegs()
  {
    var txt = [
"circle","circle-open","circle-dot","circle-open-dot",
"square","square-open","square-dot","square-open-dot",
"diamond","diamond-open",
"diamond-dot","diamond-open-dot",
"cross","cross-open",
"cross-dot","cross-open-dot",
"x","x-open","x-dot","x-open-dot",
"triangle-up",
"triangle-up-open",
"triangle-up-dot",
"triangle-up-open-dot",
"triangle-down",
"triangle-down-open",
"triangle-down-dot",
"triangle-down-open-dot",
"triangle-left",
"triangle-left-open",
"triangle-left-dot",
"triangle-left-open-dot",
"triangle-right",
"triangle-right-open",
"triangle-right-dot",
"triangle-right-open-dot",
"triangle-ne",
"triangle-ne-open",
"triangle-ne-dot",
"triangle-ne-open-dot",
"triangle-se",
"triangle-se-open",
"triangle-se-dot",
"triangle-se-open-dot",
"triangle-sw",
"triangle-sw-open",
"triangle-sw-dot",
"triangle-sw-open-dot",
"triangle-nw",
"triangle-nw-open",
"triangle-nw-dot",
"triangle-nw-open-dot",
"pentagon",
"pentagon-open",
"pentagon-dot",
"pentagon-open-dot",
"hexagon",
"hexagon-open",
"hexagon-dot",
"hexagon-open-dot",
"hexagon2",
"hexagon2-open",
"hexagon2-dot",
"hexagon2-open-dot",
"octagon",
"octagon-open",
"octagon-dot",
"octagon-open-dot",
"star",
"star-open",
"star-dot",
"star-open-dot",
"hexagram",
"hexagram-open",
"hexagram-dot",
"hexagram-open-dot",
"star-triangle-up",
"star-triangle-up-open",
"star-triangle-up-dot",
"star-triangle-up-open-dot",
"star-triangle-down",
"star-triangle-down-open",
"star-triangle-down-dot",
"star-triangle-down-open-dot",
"star-square",
"star-square-open",
"star-square-dot",
"star-square-open-dot",
"star-diamond",
"star-diamond-open",
"star-diamond-dot",
"star-diamond-open-dot",
"diamond-tall",
"diamond-tall-open",
"diamond-tall-dot",
"diamond-tall-open-dot",
"diamond-wide",
"diamond-wide-open",
"diamond-wide-dot",
"diamond-wide-open-dot",
"hourglass",
"hourglass-open",
"bowtie",
"bowtie-open",
"circle-cross",
"circle-cross-open",
"circle-x",
"circle-x-open",
"square-cross",
"square-cross-open",
"square-x",
"square-x-open",
"diamond-cross",
"diamond-cross-open",
"diamond-x",
"diamond-x-open",
"cross-thin",
"cross-thin-open",
"x-thin",
"x-thin-open",
"asterisk",
"asterisk-open",
"hash",
"hash-open",
"hash-dot",
"hash-open-dot",
"y-up",
"y-up-open",
"y-down",
"y-down-open",
"y-left",
"y-left-open",
"y-right",
"y-right-open",
"line-ew",
"line-ew-open",
"line-ns",
"line-ns-open",
"line-ne",
"line-ne-open",
"line-nw",
"line-nw-open"
    ];

    var segs = [];
    _.forEach(txt, (val) => {
      segs.push( this.uiSegmentSrv.newSegment( val ) );
    });
    return this.q.when( segs );
  }
}
PlotlyPanelCtrl.templateUrl = 'module.html';

export {
  PlotlyPanelCtrl as PanelCtrl
};


