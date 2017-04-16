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
    render: renderMinutesDuration,
  }, {
    data: AddedHeaders.EquivalentDurationFor5K,
    title: '5K Equivalent',
    render: renderMinutesDuration
  }, {
    data: OriginalHeaders.Course,
    title: 'Course'
  }, {
    data: OriginalHeaders.AvgHR,
    title: 'Avg HR'
  }, {
    data: AddedHeaders.RelativeRunningEconomy,
    title: 'Economy',
    render: renderTwoDecimalPlaces
  }];
  
  self.logDatatable = $(datatableSelector).DataTable({
    data: [],
    columns: self.ColumnDefs,
    deferRender: true,
    pageLength: 10,
    dom: 'fpti'
  });
  
  self.setData = function (newDataset) {
    self.logDatatable.clear();
    
    self.logDatatable.rows.add(newDataset);
    self.logDatatable.draw();
  };
};