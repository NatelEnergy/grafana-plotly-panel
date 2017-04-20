## Plot.ly Panel for Grafana

Render metrics using the plot.ly javascript framework

This is the first working version with some config but still needs a lot of work
to to feel ready for prime time.  In particular it currently assumes the first three
values it gets are x, y, anx z.  They must all be the same size and we assume they
are on the same point.



### Screenshots

![Screenshot of scatter plot](https://raw.githubusercontent.com/NatelEnergy/grafana-plotly-panel/master/src/img/screenshot-scatter.png)
![Screenshot of scatter plot](https://raw.githubusercontent.com/NatelEnergy/grafana-plotly-panel/master/src/img/screenshot-scatter-1.png)
![Screenshot of 3d scatter plot](https://raw.githubusercontent.com/NatelEnergy/grafana-plotly-panel/master/src/img/screenshot-scatter-3d.png)
![Screenshot of the options screen](https://raw.githubusercontent.com/NatelEnergy/grafana-plotly-panel/master/src/img/screenshot-options.png)

#### Changelog


##### v0.0.3

- Improve options UI
- Added range mode: "tozero" and "nonnegative"
- Map metrics to X,Y,Z and color


##### v0.0.2

- Added ability to set color from a metric query.  (#4, @lzgrablic01)
- Show 3D axis names properly
- Fix initalization to work with 4.2+ (isPanelVisible undefined)


##### v0.0.1

- First working version


### Roadmap

Nice things to have
 - change marker size with response value
 - support 'table' response format
 - support text
 - load plotly.js from CDN?


