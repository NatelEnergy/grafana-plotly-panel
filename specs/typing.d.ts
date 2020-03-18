// Load generic JSON
declare module '*.json' {
  const value: any;
  export default value;
}

declare module 'app/features/dashboard/panel_model' {
  var config: any;
  export default config;
}
