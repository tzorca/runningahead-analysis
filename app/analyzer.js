/*jslint browser: true, nomen: true*/
/*global $, moment, _, Qty, CSV*/
/*global OriginalHeaders, AddedHeaders, ActivityTypes, DistanceUnits*/
/*global renderTwoDecimalPlaces, sumByKeyInObject, StatsCalculator*/

var analyzerApp = {
  fullDataset: [],
  runsDataset: [],
  logDatatable: {}
};


var LogTableColumnDefs = [{
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


function getFirstDateInDataset(dataset) {
  return _.min(dataset, function (row) { return row.Date; }).Date;
}


function getLastDateInDataset(dataset) {
  return _.max(dataset, function (row) { return row.Date; }).Date;
}


function reloadTableAndStats() {
  var startDate, endDate, runsDatasetForPeriod, stats;
  // Determine start and end date
  startDate = $('#log-start-date').val() || getFirstDateInDataset(analyzerApp.runsDataset);
  endDate = $('#log-end-date').val() || getLastDateInDataset(analyzerApp.runsDataset);

  // Get dataset for period between startDate and endDate
  runsDatasetForPeriod = StatsCalculator.filterRowsByDate(analyzerApp.runsDataset, startDate, endDate);

  // Update log table with runs from period
  analyzerApp.logDatatable.clear();
  analyzerApp.logDatatable.rows.add(runsDatasetForPeriod);
  analyzerApp.logDatatable.draw();

  // Calculate stats
  stats = StatsCalculator.calculateStatsForPeriod(runsDatasetForPeriod, startDate, endDate);

  // Show stats on page
  $('#output').text(JSON.stringify(stats, null, 2));
}

function readRunningAheadTSV(tsvString) {
  return new CSV(tsvString, {
    header: true,
    cellDelimiter: '\t',
    cast: false
  }).parse();
}


$(document).ready(function () {
  // Init log table
  analyzerApp.logDatatable = $('#log-table').DataTable({
    data: [],
    columns: LogTableColumnDefs,
    deferRender: true,
    pageLength: 10,
    dom: 'tifp'
  });

  // Get data, then reload table and stats
  $.get('log.txt', function (logDataTSV) {
    analyzerApp.fullDataset = StatsCalculator.transformDataset(readRunningAheadTSV(logDataTSV));
    analyzerApp.runsDataset = analyzerApp.fullDataset.filter(function (row) {
      return row[OriginalHeaders.Type] === ActivityTypes.Run;
    });

    reloadTableAndStats();
  }, 'text');

  // Add event handler to date picker range
  $('#log-datepicker input').datepicker({})
    .on('changeDate', function (e) {
      reloadTableAndStats();
    });
});


