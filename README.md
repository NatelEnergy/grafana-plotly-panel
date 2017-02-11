## Plot.ly Panel for Grafana

Render metrics using the plot.ly javascript framework

This is the first working version with some config but still needs a lot of work
to to feel ready for prime time.  In particular it currently assumes the first three 
values it gets are x, y, anx z.  They must all be the same size and we assume they
are on the same point.  



### Screenshots

- [Screenshot of scatter plot](https://raw.githubusercontent.com/NatelEnergy/grafana-plotly-panel/master/src/img/screenshot-scatter.png)
- [Screenshot of 3d scatter plot](https://raw.githubusercontent.com/NatelEnergy/grafana-plotly-panel/master/src/img/screenshot-scatter-3d.png)
- [Screenshot of the options screen](https://raw.githubusercontent.com/NatelEnergy/grafana-plotly-panel/master/src/img/screenshot-options.png)

#### Changelog

##### v0.0.1

- First working version



### Roadmap... hopefully soon
 - Better metric resolution
 - Map metric names to x,y (z), color, and text
 - Support plotly timeseries
 - load plotly.js from CDN?  (1.8mb! and grafana adds &bust=random to it)


