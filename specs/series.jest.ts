///<reference path="../node_modules/@types/jest/index.d.ts" />

import {
  SeriesWrapper,
  SeriesWrapperSeries,
  //  SeriesWrapperTable,
} from '../src/SeriesWrapper';

describe('Check Series Helper', () => {
  // $scope, $injector, $window, private $rootScope, public uiSegmentSrv

  // Skip those for now because they rely on real template expansion
  describe('check Series Helper', () => {
    const series = {
      datapoints: [[1.23, 100], [2.24, 101], [3.45, 102]],
    };
    const helperValue: SeriesWrapper = new SeriesWrapperSeries('AAA', series, 'value');
    const helperTime: SeriesWrapper = new SeriesWrapperSeries('AAA', series, 'time');
    const helperIndex: SeriesWrapper = new SeriesWrapperSeries('AAA', series, 'index');

    const arrValue = helperValue.toArray();
    const arrTime = helperTime.toArray();
    const arrIndex = helperIndex.toArray();

    it('They should all have the same length', () => {
      expect(arrValue.length).toBe(series.datapoints.length);
      expect(arrTime.length).toBe(series.datapoints.length);
      expect(arrIndex.length).toBe(series.datapoints.length);
    });
  });
});
