///<reference path="../node_modules/@types/jest/index.d.ts" />

import moment from 'moment';

import TemplateSrv from './lib/template_srv_stub';

import {PlotlyPanelCtrl} from '../src/module';

describe('Plotly Panel', () => {
  // $scope, $injector, $window, private $rootScope, public uiSegmentSrv
  const ds = new PlotlyPanelCtrl(null, null, null, null, null);

  // Skip those for now because they rely on real template expansion
  describe('check Defaults', () => {
    it('it should use default configs', () => {
      expect(ds.panel).toBe(PlotlyPanelCtrl.defaults);
    });
  });
});
