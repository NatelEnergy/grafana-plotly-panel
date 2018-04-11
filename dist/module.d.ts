/// <reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
import { MetricsPanelCtrl } from 'app/plugins/sdk';
declare class PlotlyPanelCtrl extends MetricsPanelCtrl {
    private $rootScope;
    private uiSegmentSrv;
    static templateUrl: string;
    sizeChanged: boolean;
    initalized: boolean;
    $tooltip: any;
    defaults: {
        pconfig: {
            mapping: {
                x: any;
                y: any;
                z: any;
                color: any;
                size: any;
            };
            settings: {
                type: string;
                mode: string;
                displayModeBar: boolean;
                line: {
                    color: string;
                    width: number;
                    dash: string;
                    shape: string;
                };
                marker: {
                    size: number;
                    symbol: string;
                    color: string;
                    colorscale: string;
                    sizemode: string;
                    sizemin: number;
                    sizeref: number;
                    line: {
                        color: string;
                        width: number;
                    };
                    showscale: boolean;
                };
                color_option: string;
            };
            layout: {
                autosize: boolean;
                showlegend: boolean;
                legend: {
                    orientation: string;
                };
                dragmode: string;
                hovermode: string;
                plot_bgcolor: string;
                paper_bgcolor: string;
                font: {
                    color: string;
                    family: string;
                };
                margin: {
                    t: number;
                    b: number;
                    l: number;
                    r: number;
                };
                xaxis: {
                    showgrid: boolean;
                    zeroline: boolean;
                    type: string;
                    gridcolor: string;
                    rangemode: string;
                };
                yaxis: {
                    showgrid: boolean;
                    zeroline: boolean;
                    type: string;
                    gridcolor: string;
                    rangemode: string;
                };
                scene: {
                    xaxis: {
                        title: string;
                    };
                    yaxis: {
                        title: string;
                    };
                    zaxis: {
                        title: string;
                    };
                };
            };
        };
    };
    trace: any;
    layout: any;
    graph: any;
    seriesList: Array<any>;
    axis: Array<any>;
    segs: any;
    mouse: any;
    data: any;
    subTabIndex: 0;
    constructor($scope: any, $injector: any, $window: any, $rootScope: any, uiSegmentSrv: any);
    getCssRule(selectorText: any): CSSStyleRule;
    onResize(): void;
    onDataError(err: any): void;
    onRefresh(): void;
    onInitEditMode(): void;
    isAxisVisible(axis: any): boolean;
    onSegsChanged(): void;
    onPanelInitalized(): void;
    onRender(): void;
    onDataSnapshotLoad(snapshot: any): void;
    onDataReceived(dataList: any): void;
    onConfigChanged(): void;
    link(scope: any, elem: any, attrs: any, ctrl: any): void;
    getSymbolSegs(): any;
}
export { PlotlyPanelCtrl as PanelCtrl };
