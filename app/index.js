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
  var startDate, endDate, runDatasetForPeriod, runDatasetForPeriodAndSubtype, stats, subType, subTypeList, i;
  // Determine start and end date
  startDate = $('#log-start-date').val() || getFirstDateInDataset(analyzerApp.runsDataset);
  endDate = $('#log-end-date').val() || getLastDateInDataset(analyzerApp.runsDataset);

  // Get dataset for period between startDate and endDate
  runDatasetForPeriod = StatsCalculator.filterRowsByDate(analyzerApp.runsDataset, startDate, endDate);

  // Update log table with runs from period
  analyzerApp.runTableManager.setData(runDatasetForPeriod);

  // Calculate overall stats
  stats = {
    Overall: StatsCalculator.calculateStatsForPeriod(runDatasetForPeriod, startDate, endDate)
  };

  // Calculate stats for each subtype
  subTypeList = StatsCalculator.getAllSubTypes(runDatasetForPeriod);
  for (var i = 0; i < subTypeList.length; i++) {
    subType = subTypeList[i];
    runDatasetForPeriodAndSubtype = StatsCalculator.filterRowsBySubType(runDatasetForPeriod, subType);
    stats["SubType " + subType] = StatsCalculator.calculateStatsForPeriod(runDatasetForPeriodAndSubtype, startDate, endDate);
  }

  // Show overall stats
  $('#output').jsonViewer(stats);
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


