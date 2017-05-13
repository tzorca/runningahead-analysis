/*jslint browser: true, nomen: true*/
/*global $, moment, _, Qty, CSV*/
/*global OriginalHeaders, AddedHeaders, ActivityTypes, DistanceUnits*/
/*global renderTwoDecimalPlaces, sumByKeyInObject, StatsCalculator, ActivityLogTableManager*/

var analyzerApp = {
  fullDataset: [],
  runsDataset: [],
  runTableManager: {},
  raceTableManager: {},
};


function getFirstDateInDataset(dataset) {
  return _.min(dataset, function (row) { return row.Date; }).Date;
}


function getLastDateInDataset(dataset) {
  return _.max(dataset, function (row) { return row.Date; }).Date;
}

function getMonthStartDatesInPeriod(startDate, endDate) {
  startDate = moment(startDate);
  endDate = moment(endDate);

  var currentMonthStartDate = startDate.startOf('month');
  var monthStartDates = [];
  var maxIterations = 5000;
  var iteration = 0;
  while (currentMonthStartDate < endDate && iteration < maxIterations) {
    monthStartDates.push(moment(currentMonthStartDate));
    iteration++;
    currentMonthStartDate.add(1, 'months');
  }

  return monthStartDates;
}

function loadRaceListAndChart() {
  var raceDataset = analyzerApp.runsDataset.filter(function (row) {
    return row[OriginalHeaders.SubType] === SubTypes.Race;
  });

  // Set race list table data
  analyzerApp.raceTableManager.setData(raceDataset);

  // Calculate race chart data
  var raceChartData = raceDataset.map(function(row) {
    return {
      x: moment(row[OriginalHeaders.Date]).toDate(),
      y: row[AddedHeaders.EquivalentDurationFor5K]
    };
  });

  // Set up race performance chart
  new Chart($('#race-performance-chart'), {
      type: 'line',
      data: {
        datasets: [{
          label: '5k Equivalent',
          data: raceChartData
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          xAxes: [{
            type: 'time',
            position: 'bottom',
            scaleLabel: {
              display: true,
              labelString: 'Date'
            },
            time: {
              unit: 'year',
              displayFormats: {
                year: 'YYYY'
              }
            }
          }],
          yAxes: [{
            scaleLabel: {
              display: true,
              labelString: '5K Equivalent'
            }
          }]
        }
      }
    });
}

function reloadTableAndStats() {
  // Determine start and end date
  var startDate = $('#log-start-date').val() || getFirstDateInDataset(analyzerApp.runsDataset);
  var endDate = $('#log-end-date').val() || getLastDateInDataset(analyzerApp.runsDataset);

  // Get dataset for period between startDate and endDate
  var runDatasetForPeriod = StatsCalculator.filterRowsByDate(analyzerApp.runsDataset, startDate, endDate);

  // Update log table with runs from period
  analyzerApp.runTableManager.setData(runDatasetForPeriod);

  // Calculate overall stats
  var stats = {
    Overall: StatsCalculator.calculateStatsForPeriod(runDatasetForPeriod, startDate, endDate)
  };

  // Calculate stats for each subtype
  var subTypeList = StatsCalculator.getAllSubTypes(runDatasetForPeriod);
  for (var i = 0; i < subTypeList.length; i++) {
    var subType = subTypeList[i];
    var runDatasetForPeriodAndSubtype = StatsCalculator.filterRowsBySubType(runDatasetForPeriod, subType);
    stats["SubType " + subType] = StatsCalculator.calculateStatsForPeriod(runDatasetForPeriodAndSubtype, startDate, endDate);
  }

  // Calculate stats for each month
  var monthStartDates = getMonthStartDatesInPeriod(startDate, endDate);
  var monthStats = {};
  for (var i = 0; i < monthStartDates.length; i++) {
    var monthStartDate = monthStartDates[i];
    var monthEndDate = moment(monthStartDate).endOf('month');
    var runDatasetForMonth = StatsCalculator.filterRowsByDate(analyzerApp.runsDataset, monthStartDate, monthEndDate);
    monthStats[monthStartDate.format("MMMM YYYY")] = StatsCalculator.calculateStatsForPeriod(runDatasetForMonth, monthStartDate, monthEndDate);
  }


  // Show type stats and month stats
  $('#type-stats-output').jsonViewer(stats);
  $('#month-stats-output').jsonViewer(monthStats);
}

function readRunningAheadTSV(tsvString) {
  return new CSV(tsvString, {
    header: true,
    cellDelimiter: '\t',
    cast: false
  }).parse();
}

function readFileData(file, callback) {
  if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
    alert('The File APIs are not fully supported by your browser.');
    return;
  }
  
  if (!file) {
    alert("Failed to load file");
    return;
  }
  
  var reader = new FileReader();
  reader.onload = function (readerEvt) {
    var fileContents = readerEvt.target.result;
    callback(fileContents);
  }
  reader.readAsText(file);
}


$(document).ready(function () {
  // Init tables
  analyzerApp.runTableManager = new ActivityLogTableManager('#run-log-table');
  analyzerApp.raceTableManager = new ActivityLogTableManager('#race-list-table');
  
  // Add file submit handler event to get file from file input
  $('#ra-log-file-submit').click(function (evt) {
      var file = $('#ra-log-file')[0].files[0];
      
      readFileData(file, function (logDataTSV) {
        analyzerApp.fullDataset = StatsCalculator.transformDataset(readRunningAheadTSV(logDataTSV));
        analyzerApp.runsDataset = analyzerApp.fullDataset.filter(function (row) {
          return row[OriginalHeaders.Type] === ActivityTypes.Run;
        });

        reloadTableAndStats();

        loadRaceListAndChart();

        $('#app-view').removeClass('hidden');
      });
  });

  // Add event handler to date picker range
  $('#log-datepicker input').datepicker({})
    .on('changeDate', function (e) {
      reloadTableAndStats();
    });
});


