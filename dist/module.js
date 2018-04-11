System.register(["app/plugins/sdk", "lodash", "moment", "jquery", "./lib/plotly.min"], function (exports_1, context_1) {
    "use strict";
    var __extends = (this && this.__extends) || (function () {
        var extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    var __moduleName = context_1 && context_1.id;
    var sdk_1, lodash_1, moment_1, jquery_1, Plotly, PlotlyPanelCtrl;
    return {
        setters: [
            function (sdk_1_1) {
                sdk_1 = sdk_1_1;
            },
            function (lodash_1_1) {
                lodash_1 = lodash_1_1;
            },
            function (moment_1_1) {
                moment_1 = moment_1_1;
            },
            function (jquery_1_1) {
                jquery_1 = jquery_1_1;
            },
            function (Plotly_1) {
                Plotly = Plotly_1;
            }
        ],
        execute: function () {
            PlotlyPanelCtrl = (function (_super) {
                __extends(PlotlyPanelCtrl, _super);
                function PlotlyPanelCtrl($scope, $injector, $window, $rootScope, uiSegmentSrv) {
                    var _this = _super.call(this, $scope, $injector) || this;
                    _this.$rootScope = $rootScope;
                    _this.uiSegmentSrv = uiSegmentSrv;
                    _this.defaults = {
                        pconfig: {
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
                            layout: {
                                autosize: false,
                                showlegend: false,
                                legend: { orientation: 'v' },
                                dragmode: 'lasso',
                                hovermode: 'closest',
                                plot_bgcolor: 'transparent',
                                paper_bgcolor: 'transparent',
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
                                    rangemode: 'normal',
                                },
                                yaxis: {
                                    showgrid: true,
                                    zeroline: false,
                                    type: 'linear',
                                    gridcolor: '#444444',
                                    rangemode: 'normal',
                                },
                                scene: {
                                    xaxis: { title: 'X AXIS' },
                                    yaxis: { title: 'Y AXIS' },
                                    zaxis: { title: 'Z AXIS' },
                                },
                            },
                        },
                    };
                    _this.sizeChanged = true;
                    _this.initalized = false;
                    _this.$tooltip = jquery_1.default('<div id="tooltip" class="graph-tooltip">');
                    lodash_1.default.defaultsDeep(_this.panel, _this.defaults);
                    _this.panel.pconfig.layout.paper_bgcolor = 'transparent';
                    _this.panel.pconfig.layout.plot_bgcolor = _this.panel.pconfig.layout.paper_bgcolor;
                    var labelStyle = _this.getCssRule('div.flot-text');
                    if (labelStyle) {
                        var color = labelStyle.style.color || _this.panel.pconfig.layout.font.color;
                        _this.panel.pconfig.layout.font.color = color;
                        color = jquery_1.default.color
                            .parse(color)
                            .scale('a', 0.22)
                            .toString();
                        _this.panel.pconfig.layout.xaxis.gridcolor = color;
                        _this.panel.pconfig.layout.yaxis.gridcolor = color;
                    }
                    var cfg = _this.panel.pconfig;
                    _this.trace = {};
                    _this.layout = jquery_1.default.extend(true, {}, _this.panel.pconfig.layout);
                    _this.events.on('init-edit-mode', _this.onInitEditMode.bind(_this));
                    _this.events.on('render', _this.onRender.bind(_this));
                    _this.events.on('data-received', _this.onDataReceived.bind(_this));
                    _this.events.on('data-error', _this.onDataError.bind(_this));
                    _this.events.on('panel-initialized', _this.onPanelInitalized.bind(_this));
                    _this.events.on('refresh', _this.onRefresh.bind(_this));
                    _this.events.on('panel-size-changed', _this.onResize.bind(_this));
                    return _this;
                }
                PlotlyPanelCtrl.prototype.getCssRule = function (selectorText) {
                    var styleSheets = document.styleSheets;
                    for (var idx = 0; idx < styleSheets.length; idx += 1) {
                        var styleSheet = styleSheets[idx];
                        var rules = styleSheet.cssRules;
                        for (var ruleIdx = 0; ruleIdx < rules.length; ruleIdx += 1) {
                            var rule = rules[ruleIdx];
                            if (rule.selectorText === selectorText) {
                                return rule;
                            }
                        }
                    }
                };
                PlotlyPanelCtrl.prototype.onResize = function () {
                    this.sizeChanged = true;
                };
                PlotlyPanelCtrl.prototype.onDataError = function (err) {
                    this.seriesList = [];
                    this.render([]);
                    console.log('onDataError', err);
                };
                PlotlyPanelCtrl.prototype.onRefresh = function () {
                    if (this.otherPanelInFullscreenMode()) {
                        return;
                    }
                    if (this.graph && this.initalized) {
                        Plotly.redraw(this.graph);
                    }
                };
                PlotlyPanelCtrl.prototype.onInitEditMode = function () {
                    this.addEditorTab('Display', 'public/plugins/natel-plotly-panel/partials/tab_display.html', 2);
                    this.refresh();
                    this.segs = {
                        symbol: this.uiSegmentSrv.newSegment({
                            value: this.panel.pconfig.settings.marker.symbol,
                        }),
                    };
                    this.subTabIndex = 0;
                    var cfg = this.panel.pconfig;
                    this.axis = [
                        {
                            disp: 'X Axis',
                            idx: 1,
                            config: cfg.layout.xaxis,
                            metric: function (name) {
                                if (name) {
                                    cfg.mapping.x = name;
                                }
                                return cfg.mapping.x;
                            },
                        },
                        {
                            disp: 'Y Axis',
                            idx: 2,
                            config: cfg.layout.yaxis,
                            metric: function (name) {
                                if (name) {
                                    cfg.mapping.y = name;
                                }
                                return cfg.mapping.y;
                            },
                        },
                        {
                            disp: 'Z Axis',
                            idx: 3,
                            config: cfg.layout.yaxis,
                            metric: function (name) {
                                if (name) {
                                    cfg.mapping.z = name;
                                }
                                return cfg.mapping.z;
                            },
                        },
                    ];
                };
                PlotlyPanelCtrl.prototype.isAxisVisible = function (axis) {
                    if (axis.idx === 3) {
                        return this.panel.pconfig.settings.type === 'scatter3d';
                    }
                    return true;
                };
                PlotlyPanelCtrl.prototype.onSegsChanged = function () {
                    this.panel.pconfig.settings.marker.symbol = this.segs.symbol.value;
                    this.onConfigChanged();
                    console.log(this.segs.symbol, this.panel.pconfig);
                };
                PlotlyPanelCtrl.prototype.onPanelInitalized = function () {
                    this.onConfigChanged();
                };
                PlotlyPanelCtrl.prototype.onRender = function () {
                    var _this = this;
                    if (this.otherPanelInFullscreenMode() || !this.graph) {
                        return;
                    }
                    if (!this.initalized) {
                        var s = this.panel.pconfig.settings;
                        var options = {
                            showLink: false,
                            displaylogo: false,
                            displayModeBar: s.displayModeBar,
                            modeBarButtonsToRemove: ['sendDataToCloud'],
                        };
                        var data = [this.trace];
                        var rect = this.graph.getBoundingClientRect();
                        var old = this.layout;
                        this.layout = jquery_1.default.extend(true, {}, this.panel.pconfig.layout);
                        this.layout.height = this.height;
                        this.layout.width = rect.width;
                        if (old) {
                            this.layout.xaxis.title = old.xaxis.title;
                            this.layout.yaxis.title = old.yaxis.title;
                        }
                        Plotly.newPlot(this.graph, data, this.layout, options);
                        this.graph.on('plotly_click', function (data) {
                            for (var i = 0; i < data.points.length; i++) {
                                var idx = data.points[i].pointNumber;
                                var ts = _this.trace.ts[idx];
                                var msg = data.points[i].x.toPrecision(4) + ', ' + data.points[i].y.toPrecision(4);
                                _this.$rootScope.appEvent('alert-success', [
                                    msg,
                                    '@ ' + _this.dashboard.formatDate(moment_1.default(ts)),
                                ]);
                            }
                        });
                        this.graph.on('plotly_selected', function (data) {
                            if (data.points.length === 0) {
                                console.log('Nothign Selected', data);
                                return;
                            }
                            console.log('SELECTED', data);
                            var min = Number.MAX_SAFE_INTEGER;
                            var max = Number.MIN_SAFE_INTEGER;
                            for (var i = 0; i < data.points.length; i++) {
                                var idx = data.points[i].pointNumber;
                                var ts = _this.trace.ts[idx];
                                min = Math.min(min, ts);
                                max = Math.max(max, ts);
                            }
                            min -= 1000;
                            max += 1000;
                            var range = { from: moment_1.default.utc(min), to: moment_1.default.utc(max) };
                            console.log('SELECTED!!!', min, max, data.points.length, range);
                            _this.timeSrv.setTime(range);
                            if (_this.graph) {
                                Plotly.Plots.purge(_this.graph);
                                _this.graph.innerHTML = '';
                                _this.initalized = false;
                            }
                        });
                    }
                    else {
                        Plotly.redraw(this.graph);
                    }
                    if (this.sizeChanged && this.graph && this.layout) {
                        var rect = this.graph.getBoundingClientRect();
                        this.layout.width = rect.width;
                        this.layout.height = this.height;
                        Plotly.Plots.resize(this.graph);
                    }
                    this.sizeChanged = false;
                    this.initalized = true;
                };
                PlotlyPanelCtrl.prototype.onDataReceived = function (dataList) {
                    this.trace.x = [];
                    this.trace.y = [];
                    this.trace.z = [];
                    this.data = {};
                    if (dataList.length < 1) {
                        console.log('No data', dataList);
                    }
                    else {
                        var dmapping = {
                            x: null,
                            y: null,
                            z: null,
                        };
                        var cfg = this.panel.pconfig;
                        var mapping = cfg.mapping;
                        var key = {
                            name: '@time',
                            type: 'ms',
                            missing: 0,
                            idx: -1,
                            points: [],
                        };
                        var idx = {
                            name: '@index',
                            type: 'number',
                            missing: 0,
                            idx: -1,
                            points: [],
                        };
                        this.data[key.name] = key;
                        this.data[idx.name] = idx;
                        for (var i = 0; i < dataList.length; i++) {
                            if ('table' === dataList[i].type) {
                                var table = dataList[i];
                                if (i > 0) {
                                    throw { message: 'Multiple tables not (yet) supported' };
                                }
                                for (var k = 0; k < table.rows.length; k++) {
                                    idx.points.push(k);
                                }
                                for (var j = 0; j < table.columns.length; j++) {
                                    var col = table.columns[j];
                                    var val = {
                                        name: col.text,
                                        type: col.type,
                                        missing: 0,
                                        idx: j,
                                        points: [],
                                    };
                                    if (j == 0 && val.type === 'time') {
                                        val = key;
                                    }
                                    if (!val.type) {
                                        val.type = 'number';
                                    }
                                    for (var k = 0; k < table.rows.length; k++) {
                                        val.points.push(table.rows[k][j]);
                                    }
                                    this.data[val.name] = val;
                                }
                            }
                            else {
                                var datapoints = dataList[i].datapoints;
                                if (datapoints.length > 0) {
                                    var val = {
                                        name: dataList[i].target,
                                        type: 'number',
                                        missing: 0,
                                        idx: i,
                                        points: [],
                                    };
                                    if (lodash_1.default.isString(datapoints[0][0])) {
                                        val.type = 'string';
                                    }
                                    else if (lodash_1.default.isBoolean(datapoints[0][0])) {
                                        val.type = 'boolean';
                                    }
                                    if (i === 0) {
                                        dmapping.x = val.name;
                                    }
                                    else if (i === 1) {
                                        dmapping.y = val.name;
                                    }
                                    else if (i === 2) {
                                        dmapping.z = val.name;
                                    }
                                    this.data[val.name] = val;
                                    if (key.points.length === 0) {
                                        for (var j = 0; j < datapoints.length; j++) {
                                            key.points.push(datapoints[j][1]);
                                            val.points.push(datapoints[j][0]);
                                            idx.points.push(j);
                                        }
                                    }
                                    else {
                                        for (var j = 0; j < datapoints.length; j++) {
                                            if (j >= key.points.length) {
                                                break;
                                            }
                                            if (key.points[j] === datapoints[j][1]) {
                                                val.points.push(datapoints[j][0]);
                                            }
                                            else {
                                                val.missing = val.missing + 1;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        if (!mapping.x) {
                            mapping.x = dmapping.x;
                        }
                        if (!mapping.y) {
                            mapping.y = dmapping.y;
                        }
                        if (!mapping.z) {
                            mapping.z = dmapping.z;
                        }
                        var dX = this.data[mapping.x];
                        var dY = this.data[mapping.y];
                        var dZ = null;
                        var dC = null;
                        var dS = null;
                        var dT = null;
                        if (!dX) {
                            throw { message: 'Unable to find X: ' + mapping.x };
                        }
                        if (!dY) {
                            dY = dX;
                            dX = '@time';
                        }
                        this.trace.ts = key.points;
                        this.trace.x = dX.points;
                        this.trace.y = dY.points;
                        if (cfg.settings.type === 'scatter3d') {
                            dZ = this.data[mapping.z];
                            if (!dZ) {
                                throw { message: 'Unable to find Z: ' + mapping.z };
                            }
                            this.layout.scene.xaxis.title = dX.name;
                            this.layout.scene.yaxis.title = dY.name;
                            this.layout.scene.zaxis.title = dZ.name;
                            this.trace.z = dZ.points;
                            console.log('3D', this.layout);
                        }
                        else {
                            this.layout.xaxis.title = dX.name;
                            this.layout.yaxis.title = dY.name;
                        }
                        this.trace.marker = jquery_1.default.extend(true, {}, cfg.settings.marker);
                        this.trace.line = jquery_1.default.extend(true, {}, cfg.settings.line);
                        if (mapping.size) {
                            dS = this.data[mapping.size];
                            if (!dS) {
                                throw { message: 'Unable to find Size: ' + mapping.size };
                            }
                            this.trace.marker.size = dS.points;
                        }
                        if (cfg.settings.color_option === 'ramp') {
                            if (!mapping.color) {
                                mapping.color = idx.name;
                            }
                            dC = this.data[mapping.color];
                            if (!dC) {
                                throw { message: 'Unable to find Color: ' + mapping.color };
                            }
                            this.trace.marker.color = dC.points;
                        }
                    }
                    this.render();
                };
                PlotlyPanelCtrl.prototype.onConfigChanged = function () {
                    if (this.graph && this.initalized) {
                        Plotly.Plots.purge(this.graph);
                        this.graph.innerHTML = '';
                        this.initalized = false;
                    }
                    var cfg = this.panel.pconfig;
                    this.trace.type = cfg.settings.type;
                    this.trace.mode = cfg.settings.mode;
                    var axis = [this.panel.pconfig.layout.xaxis, this.panel.pconfig.layout.yaxis];
                    for (var i = 0; i < axis.length; i++) {
                        if (axis[i].rangemode === 'between') {
                            if (axis[i].range == null) {
                                axis[i].range = [0, null];
                            }
                        }
                        else {
                            axis[i].range = null;
                        }
                    }
                    this.refresh();
                };
                PlotlyPanelCtrl.prototype.link = function (scope, elem, attrs, ctrl) {
                    var _this = this;
                    this.graph = elem.find('.plotly-spot')[0];
                    this.initalized = false;
                    elem.on('mousemove', function (evt) {
                        _this.mouse = evt;
                    });
                };
                PlotlyPanelCtrl.prototype.getSymbolSegs = function () {
                    var _this = this;
                    var txt = [
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
                    var segs = [];
                    lodash_1.default.forEach(txt, function (val) {
                        segs.push(_this.uiSegmentSrv.newSegment(val));
                    });
                    return this.$q.when(segs);
                };
                PlotlyPanelCtrl.templateUrl = 'partials/module.html';
                return PlotlyPanelCtrl;
            }(sdk_1.MetricsPanelCtrl));
            exports_1("PanelCtrl", PlotlyPanelCtrl);
        }
    };
});
//# sourceMappingURL=module.js.map