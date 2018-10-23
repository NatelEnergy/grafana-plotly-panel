// This allows typescript to import json files and not complain
// See: https://hackernoon.com/import-json-into-typescript-8d465beded79
declare module '*.json' {
  const value: any;
  export default value;
}
