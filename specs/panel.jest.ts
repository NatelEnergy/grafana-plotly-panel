///<reference path="../node_modules/@types/jest/index.d.ts" />

//import TemplateSrv from './lib/template_srv_stub';
import {PlotlyPanelCtrl} from '../src/module';

import * as panel_json_v004 from './res/panel_json_v004.json';
//import {MetricsPanelCtrl} from 'app/plugins/sdk';

describe('Plotly Panel', () => {
  const injector = {
    get: () => {
      return {
        timeRange: () => {
          return {
            from: '',
            to: '',
          };
        },
      };
    },
  };

  const scope = {
    $on: () => {},
  };

  PlotlyPanelCtrl.prototype.panel = {
    events: {
      on: () => {},
    },
    gridPos: {
      w: 100,
    },
  };

  const ctx = <any>{};
  beforeEach(() => {
    ctx.ctrl = new PlotlyPanelCtrl(scope, injector, null, null, null, null);
    ctx.ctrl.events = {
      emit: () => {},
    };
    ctx.ctrl.annotationsPromise = Promise.resolve({});
    ctx.ctrl.updateTimeRange();
  });

  const epoch = 1505800000000;
  Date.now = () => epoch;

  describe('check Defaults', () => {
    beforeEach(() => {
      // nothing specal
    });

    it('it should use default configs', () => {
      // console.log('SAME:', ctx.ctrl.panel.pconfig);
      // console.log(' >>>:', PlotlyPanelCtrl.defaults.pconfig);
      expect(JSON.stringify(ctx.ctrl.panel.pconfig)).toBe(
        JSON.stringify(PlotlyPanelCtrl.defaults.pconfig)
      );
    });
  });

  describe('check migration from 0.0.4', () => {
    beforeEach(() => {
      ctx.ctrl.panel = panel_json_v004;
      ctx.ctrl.onPanelInitialized();
    });

    it('it should now have have a version', () => {
      expect(ctx.ctrl.panel.version).toBe(PlotlyPanelCtrl.configVersion);
      expect(ctx.ctrl.cfg.layout.margin).toBeUndefined();
    });
  });
});
