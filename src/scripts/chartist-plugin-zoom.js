/**
 * Chartist.js zoom plugin.
 * 
 */
(function (window, document, Chartist) {
  'use strict';

  var defaultOptions = {
    // onZoom
    // resetOnRightMouseBtn
    pointClipOffset: 5,
    noClipY: false,
    autoZoomY: {high: false, low: false},
  };

  Chartist.plugins = Chartist.plugins || {};
  Chartist.plugins.zoom = function (options) {
    options = Chartist.extend({}, defaultOptions, options);
    
    return function zoom(chart) {
      if (!(chart instanceof Chartist.Line)) {
        return;
      }

      var rect, svg, axisX, axisY, chartRect;
      var downPosition;
      var onZoom = options.onZoom;
      var ongoingTouches = [];
      if(options.autoZoomY === true){
        options.autoZoomY = {high: true, low: true};
      }
      
      chart.on('draw', function (data) {
        var type = data.type;
        var mask = type === 'point' ? 'point-mask' : 'line-mask';
        if (type === 'line' || type === 'bar' || type === 'area' || type === 'point') {
          data.element.attr({ 'clip-path': 'url(#' + mask + ')' });
        }
      });

      chart.on('created', function (data) {
        axisX = data.axisX;
        axisY = data.axisY;
        chartRect = data.chartRect;
        svg = data.svg._node;
        rect = data.svg.elem('rect', {
          x: 10,
          y: 10,
          width: 100,
          height: 100,
        }, 'ct-zoom-rect');
        hide(rect);

        var defs = data.svg.querySelector('defs') || data.svg.elem('defs');
        var width = chartRect.width();
        var height = chartRect.height();

        function addMask(id, offset) {
          defs
            .elem('clipPath', {
              id: id
            })
            .elem('rect', {
              x: chartRect.x1 - offset,
              y: chartRect.y2 - offset,
              width: width + offset + offset,
              height: height + offset + offset,
              fill: 'white'
            });
        }
        addMask('line-mask', 0);
        addMask('point-mask', options.pointClipOffset);

        function on(event, handler) {
          svg.addEventListener(event, handler);
        }

        on('mousedown', onMouseDown);
        on('mouseup', onMouseUp);
        on('mousemove', onMouseMove);
        on('touchstart', onTouchStart);
        on('touchmove', onTouchMove);
        on('touchend', onTouchEnd);
        on('touchcancel', onTouchCancel);
      });



      function copyTouch(touch) {
        var p = position(touch, svg);
        p.id = touch.identifier;
        return p;
      }

      function ongoingTouchIndexById(idToFind) {
        for (var i = 0; i < ongoingTouches.length; i++) {
          var id = ongoingTouches[i].id;
          if (id === idToFind) {
            return i;
          }
        }
        return -1;
      }

      function onTouchStart(event) {
        var touches = event.changedTouches;
        for (var i = 0; i < touches.length; i++) {
          ongoingTouches.push(copyTouch(touches[i]));
        }

        if (ongoingTouches.length > 1) {
          rect.attr(getRect(ongoingTouches[0], ongoingTouches[1]));
          show(rect);
        }
      }

      function onTouchMove(event) {
        var touches = event.changedTouches;
        for (var i = 0; i < touches.length; i++) {
          var idx = ongoingTouchIndexById(touches[i].identifier);
          ongoingTouches.splice(idx, 1, copyTouch(touches[i]));
        }

        if (ongoingTouches.length > 1) {
          rect.attr(getRect(ongoingTouches[0], ongoingTouches[1]));
          show(rect);
          event.preventDefault();
        }
      }

      function onTouchCancel(event) {
        removeTouches(event.changedTouches);
      }

      function removeTouches(touches) {
        for (var i = 0; i < touches.length; i++) {
          var idx = ongoingTouchIndexById(touches[i].identifier);
          if (idx >= 0) {
            ongoingTouches.splice(idx, 1);
          }
        }
      }

      function onTouchEnd(event) {
        if (ongoingTouches.length > 1) {
          zoomIn(getRect(ongoingTouches[0], ongoingTouches[1]));
        }
        removeTouches(event.changedTouches);
        hide(rect);
      }

      function onMouseDown(event) {
        if (event.button === 0) {
          var point = position(event, svg);
          if (isInRect(point, chartRect)) {
            downPosition = point;
            rect.attr(getRect(downPosition, downPosition));
            show(rect);
            event.preventDefault();
          }
        }
      }

      function isInRect(point, rect) {
        return point.x >= rect.x1 && point.x <= rect.x2 && point.y >= rect.y2 && point.y <= rect.y1;
      }

      var reset = function () {
        chart.options.axisX.highLow = null;
        chart.options.axisY.highLow = null;
        chart.update(chart.data, chart.options);
      };

      function onMouseUp(event) {
        if (event.button === 0 && downPosition) {
          var box = getRect(downPosition, position(event, svg));
          zoomIn(box);
          downPosition = null;
          hide(rect);
        }
        else if (options.resetOnRightMouseBtn && event.button === 2) {
          reset();
          event.preventDefault();
        }
      }

      function zoomIn(rect) {
        if (rect.width > 5 && rect.height > 5) {
            var x1 = Math.max(0, rect.x - chartRect.x1);
            var x2 = Math.min(chartRect.width(), x1 + rect.width);
            var y2 = Math.min(chartRect.height(), chartRect.y1 - rect.y);
            var y1 = Math.max(0, y2 - rect.height);

            chart.options.axisX.highLow = { low: project(x1, axisX), high: project(x2, axisX) };
            chart.options.axisY.highLow = { low: project(y1, axisY), high: project(y2, axisY) };

            if(options.noClipY && (options.autoZoomY.high || options.autoZoomY.low)){
              var x_low = chart.options.axisX.highLow.low;
              var x_high = chart.options.axisX.highLow.high;
              var max_y = null;
              var min_y = null;
              var series = chart.data.series;
              for(var i=0; i < series.length; ++i){
                var points = series[i].data;
                var l = binarySearch_x(points, x_low) + 1;
                for(var j=l; j < points.length; ++j){
                  if(points[j].x > x_high) break;
                  if(points[j].y > max_y || min_y == null) max_y = points[j].y;
                  if(points[j].y < min_y || min_y == null) min_y = points[j].y;
                }
                var prev_j = Math.max(l-1, 0);
                if(min_y === max_y){
                  max_y = Math.max(points[l].y, points[prev_j].y);
                  min_y = Math.min(points[l].y, points[prev_j].y);
                  if(min_y == max_y) max_y = min_y + 0.1; // prevents chartist from creating NaNs when range == 0 
                }
              }
              if( options.autoZoomY.high ) chart.options.axisY.highLow.high = max_y; 
              if( options.autoZoomY.low ) chart.options.axisY.highLow.low = min_y;
            }
            chart.update(chart.data, chart.options);
            onZoom && onZoom(chart, reset);
          }
      }

      function onMouseMove(event) {
        if (downPosition) {
          var point = position(event, svg);
          if (isInRect(point, chartRect)) {
            rect.attr(getRect(downPosition, point));
            event.preventDefault();
          }
        }
      }
      
      function hide(rect) {
        rect.attr({ style: 'display:none' });
      }
      
      function show(rect) {
        rect.attr({ style: 'display:block' });
      }
      
      function getRect(firstPoint, secondPoint) {
        var x = firstPoint.x;
        var y = firstPoint.y;
        var width = secondPoint.x - x;
        var height = secondPoint.y - y;
        if (width < 0) {
          width = -width;
          x = secondPoint.x;
        }
        if(options.noClipY){
          y = chartRect.y2;
          height = chartRect.y1 - y;
        }
        else if (height < 0) {
          height = -height;
          y = secondPoint.y;
        }
        return {
          x: x,
          y: y,
          width: width,
          height: height
        };
      }
      
      function position(event, svg) {
        return transform(event.clientX, event.clientY, svg);
      }
      
      function transform(x, y, svgElement) {
        var svg = svgElement.tagName === 'svg' ? svgElement : svgElement.ownerSVGElement;
        var matrix = svg.getScreenCTM();
        var point = svg.createSVGPoint();
        point.x = x;
        point.y = y;
        point = point.matrixTransform(matrix.inverse());
        return point || { x: 0, y: 0 };
      }
      
      function project(value, axis) {
        var max = axis.bounds.max;
        var min = axis.bounds.min;
        if (axis.scale && axis.scale.type === 'log') {
          var base = axis.scale.base;
          return Math.pow(base,
              value * baseLog(max / min, base) / axis.axisLength) * min;
        }
        return (value * axis.bounds.range / axis.axisLength) + min;
      }
      
      function baseLog(val, base) {
        return Math.log(val) / Math.log(base);
      }
      
      function binarySearch_x(ar, el) {
        var m = 0;
        var n = ar.length - 1;
        while (m <= n) {
          var k = (n + m) >> 1;
          if (el > ar[k].x) {
            m = k + 1;
          } else if(el < ar[k].x) {
            n = k - 1;
          } else {
            return k;
          }
        }
        return m - 1;
      }
    };
  };
} (window, document, Chartist));
