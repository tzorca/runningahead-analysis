/*jslint browser: true*/
/*global $, moment, console*/
/*global OriginalHeaders, AddedHeaders*/
/*global renderTwoDecimalPlaces*/

var ActivityLogTableManager = function (datatableSelector) {
  'use strict';
  var self = this;
  
  self.ColumnDefs = [{
    data: OriginalHeaders.Date,
    title: 'Date',
    render: function (data, type, row) {
      return data.format('YYYY-MM-DD');
    }
  }, {
    data: OriginalHeaders.TimeOfDay,
    title: 'Time',
    render: function (data, type, row) {
      if (data) {
        return data.format('h:mm a');
      } else {
        return '';
      }
    }
  }, {
    data: OriginalHeaders.SubType,
    title: 'Sub Type'
  }, {
    data: AddedHeaders.DistanceInMiles,
    title: 'Distance (mi)',
    render: renderTwoDecimalPlaces
  }, {
    data: AddedHeaders.DurationInMinutes,
    title: 'Duration',
    render: function (minutes, type, row) {
      if (minutes) {
        var ms = minutes * 60 * 1000;
        return moment.utc(ms).format('HH:mm:ss');
      } else {
        return '';
      }
    }
  }, {
    data: OriginalHeaders.Course,
    title: 'Course'
  }, {
    data: OriginalHeaders.Temperature,
    title: 'Temperature'
  }];

  
  self.logDatatable = $(datatableSelector).DataTable({
    data: [],
    columns: self.ColumnDefs,
    deferRender: true,
    pageLength: 10,
    dom: 'tifp'
  });
  
  self.setData = function (newDataset) {
    console.log(self.logDatatable.add);
    self.logDatatable.clear();
    
    self.logDatatable.rows.add(newDataset);
    self.logDatatable.draw();
  };
};