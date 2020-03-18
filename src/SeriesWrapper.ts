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

  // The best key for this field
  getKey(): string {
    return this.name;
  }

  // All ways to access this field
  getAllKeys(): string[] {
    return [this.getKey()];
  }

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
    if ('index' === this.value) {
      const arr = new Array(this.count);
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

  getAllKeys(): string[] {
    if (this.refId) {
      const vals = [this.name, this.refId + '@' + this.value, this.refId + '/' + this.name];

      if ('A' === this.refId) {
        vals.push('@' + this.value);
      }
      return vals;
    }
    return [this.name];
  }
}

export class SeriesWrapperTableRow extends SeriesWrapper {
  /** @ngInject */
  constructor(refId: string, public table: any) {
    super(refId);

    this.name = refId + '@row';
  }

  toArray(): any[] {
    const count = this.table.rows.length;
    const arr = new Array(count);
    for (let i = 0; i < count; i++) {
      arr[i] = i;
    }
    return arr;
  }
}

export class SeriesWrapperTable extends SeriesWrapper {
  /** @ngInject */
  constructor(refId: string, public table: any, public index: number) {
    super(refId);
    this.count = table.rows.length;

    const col = table.columns[index];
    if (!col) {
      throw new Error('Unkonwn Column: ' + index);
    }

    this.name = col.text;
    if ('time' === col.type) {
      this.type = 'epoch';
      this.first = table.rows[0][index];
    } else {
      for (let i = 0; i < this.count; i++) {
        const v = table.rows[i][index];
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

  getAllKeys(): string[] {
    if (this.refId) {
      return [this.getKey(), this.refId + '/' + this.name, this.refId + '[' + this.index + ']'];
    }
    return [this.getKey()];
  }
}
