# Zoom plugin for Chartist.js

Please visit http://gionkunz.github.io/chartist-js/plugins.html for more information.

Axes of type AutoScaleAxis and FixedScaleAxis are supported.

## Available options and their defaults

```javascript
var defaultOptions = {
  onZoom: undefined            // A callback (chart, resetFnc) => void which will be called on zoom.
                               // resetFnc() will reset zoom.
  pointClipOffset: 5           // Offset from chart rect that will be used for the point clip mask.
                               // Should be equal to the radius of .ct-point points.
  resetOnRightMouseBtn: false  // If set to true, a right click in the zoom area, will reset zoom.
};
```

## Sample usage in Chartist.js

    
```javascript
var chart = new Chartist.Line('.ct-chart', {
  series: [/* */]
}, {
  axisX : {
    type: Chartist.AutoScaleAxis,
  },
  plugins: [
    Chartist.plugins.zoom({
      onZoom : function(chart, reset) { storeReset(reset); };
    })
  ]
});
```

```css
/* style the svg rect */
.ct-zoom-rect {
  fill: rgba(200, 100, 100, 0.3);
  stroke: red;
}
```
