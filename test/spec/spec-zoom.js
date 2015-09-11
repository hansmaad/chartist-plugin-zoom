/* global Chartist */
describe('zoom', function () {
  'use strict';

  var chart;

  
  beforeEach(function () {

    jasmine.getFixtures().set('<div class="ct-chart ct-golden-section"></div>');
    var data  = {
      series: [[
        {x: 1, y: 100},
        {x: 2, y: 50},
        {x: 3, y: 25}
      ]]
    };
    
    var options = {
      axisX: {
        type: Chartist.AutoScaleAxis
      },
      axisY: {
        type: Chartist.AutoScaleAxis
      },
      plugins : [
        Chartist.plugins.zoom({})
      ]
    };
      
    chart = new Chartist.Line('.ct-chart', data, options);
  });


  it('should be defined in chartist', function () {
    expect(window.Chartist.plugins.zoom).toBeDefined();
  });
});
