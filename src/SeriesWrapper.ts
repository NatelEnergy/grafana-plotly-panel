import _ from 'lodash';

// This gives a standard way to get a value for a given field
export abstract class SeriesWrapper {
  refId: string; // From Query Target
  name: string;

  type?: 'string' | 'date' | 'boolean' | 'epoch' | 'number';
  first?: any;
  count: number;

  /** @ngInject */
  constructor(refId: string) {
    this.refId = refId;
  }

  protected setFirst(v: any) {
    this.first = v;
    if (_.isNumber(v)) {
      this.type = 'number';
    } else if (_.isString(v)) {
      this.type = 'string';
    } else if (typeof v === typeof true) {
      this.type = 'boolean';
    }
  }

  abstract getRelativeKey(): string;
  abstract getNamedKeys(): string[];

  abstract toArray(): Array<string | number | boolean>;
}

export class SeriesWrapperSeries extends SeriesWrapper {
  value: 'value' | 'index' | 'time';

  /** @ngInject */
  constructor(refId: string, public series: any, val: 'value' | 'index' | 'time') {
    super(refId);
    this.value = val;
    this.count = series.datapoints.length;
    this.name = series.target;

    if ('index' === val) {
      this.first = 0;
      this.type = 'number';
      this.name += '@index';
      return;
    }
    if ('value' === val) {
      _.forEach(series.datapoints, arr => {
        if (arr[0] !== null) {
          // 0 is an ok value so cant use if(arr[0])
          this.setFirst(arr[0]);
          return false;
        }
        return true; // continue
      });
      return;
    }
    if ('time' === val) {
      this.type = 'epoch';
      this.first = series.datapoints[0][1];
      this.name += '@time';
      return;
    }
  }

  toArray(): any[] {
    if ('index' == this.value) {
      let arr = new Array(this.count);
      for (let i = 0; i < this.count; i++) {
        arr[i] = i;
      }
      return arr;
    }
    const idx = 'time' === this.value ? 1 : 0;
    return _.map(this.series.datapoints, arr => {
      return arr[idx];
    });
  }

  getRelativeKey(): string {
    return this.refId + '@' + this.value;
  }

  getNamedKeys(): string[] {
    return [this.name, this.refId + '/' + this.name];
  }
}

export class SeriesWrapperTable extends SeriesWrapper {
  /** @ngInject */
  constructor(refId: string, public table: any, public index: number) {
    super(refId);
    this.count = table.rows.length;

    const col = table.columns[index];
    if (!col) {
      throw 'Unkonwn Column: ' + index;
    }

    this.name = col.text;
    if ('time' === col.type) {
      this.type = 'epoch';
      this.first = table.rows[0][index];
    } else {
      for (let i = 0; i < this.count; i++) {
        let v = table.rows[i][index];
        if (v !== null) {
          // 0 is an ok value so cant use if(v)
          this.setFirst(v);
          return;
        }
      }
    }
  }

  toArray(): any[] {
    return _.map(this.table.rows, row => {
      return row[this.index];
    });
  }

  getRelativeKey(): string {
    return this.refId + '/' + this.name;
  }

  getNamedKeys(): string[] {
    return [this.name, this.refId + '[' + this.index + ']'];
  }
}
