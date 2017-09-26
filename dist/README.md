## Plot.ly Panel for Grafana

Render metrics using the plot.ly javascript framework


### Screenshots

![Screenshot of scatter plot](https://raw.githubusercontent.com/NatelEnergy/grafana-plotly-panel/master/src/img/screenshot-scatter.png)
![Screenshot of scatter plot](https://raw.githubusercontent.com/NatelEnergy/grafana-plotly-panel/master/src/img/screenshot-scatter-1.png)
![Screenshot of 3d scatter plot](https://raw.githubusercontent.com/NatelEnergy/grafana-plotly-panel/master/src/img/screenshot-scatter-3d.png)
![Screenshot of the options screen](https://raw.githubusercontent.com/NatelEnergy/grafana-plotly-panel/master/src/img/screenshot-options.png)

#### Changelog

##### v0.0.4  (not released yet)
- Update to plotly v1.30.0

##### v0.0.3

- Improve options UI
- Added range mode: "tozero" and "nonnegative"
- Map metrics to X,Y,Z and color
- Can now select 'date' type for each axis to support time
- basic support to size marker with data


##### v0.0.2

- Added ability to set color from a metric query.  (#4, @lzgrablic01)
- Show 3D axis names properly
- Fix initalization to work with 4.2+ (isPanelVisible undefined)


##### v0.0.1

- First working version


### Roadmap

Nice things to have
 - sizeref helper.  I think this depends on the data.  likely need to find the range and pick a good value?
 - support 'table' response format
 - support text
 - load plotly.js from CDN?
 - nice to have: https://plot.ly/javascript/parallel-coordinates-plot/


