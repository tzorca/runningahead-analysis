var analyzerApp = {
  fullDataset: [],
  runsDataset: [],
  logDatatable: {}
};


$(document).ready(function() {
  // Init log table
  analyzerApp.logDatatable = $('#log-table').DataTable({
    data: [],
    columns: LogTableColumnDefs,
    deferRender: true,
    pageLength: 10,
    dom: 'tifp'
  });

  // Get data, then reload table and stats
  $.get('log.txt', function(logDataTSV) {
    analyzerApp.fullDataset = transformDataset(readRunningAheadTSV(logDataTSV));
    analyzerApp.runsDataset = analyzerApp.fullDataset.filter(function(row) {
      return row[OriginalHeaders.Type] === ActivityTypes.Run;
    });

    reloadTableAndStats();
  }, dataType = 'text');

  // Add event handler to date picker range
  $('#log-datepicker input').datepicker({})
    .on('changeDate', function(e) {
      reloadTableAndStats();
    });
});


function reloadTableAndStats() {
  // Determine start and end date
  var startDate = $('#log-start-date').val() || getFirstDateInDataset(analyzerApp.runsDataset);
  var endDate = $('#log-end-date').val() || getLastDateInDataset(analyzerApp.runsDataset);

  // Get dataset for period between startDate and endDate
  var runsDatasetForPeriod = filterRowsByDate(analyzerApp.runsDataset, startDate, endDate);

  // Update log table with runs from period
  analyzerApp.logDatatable.clear();
  analyzerApp.logDatatable.rows.add(runsDatasetForPeriod);
  analyzerApp.logDatatable.draw();

  // Calculate stats
  var stats = calculateStatsForPeriod(runsDatasetForPeriod, startDate, endDate);

  // Show stats on page
  $('#output').text(JSON.stringify(stats, null, 2));
}

function getFirstDateInDataset(dataset) {
  return _.min(dataset, function(row) { return row.Date; }).Date;
}


function getLastDateInDataset(dataset) {
  return _.max(dataset, function(row) { return row.Date; }).Date;
}

function readRunningAheadTSV(tsvString) {
  return new CSV(tsvString, {
    header: true,
    cellDelimiter: '\t',
    cast: false
  }).parse();
}


function transformDataset(dataset) {
  var newDataset = [];
  for (var i = 0; i < dataset.length; i++) {
    newDataset.push(transformRow(dataset[i]));
  }

  return newDataset;
}


function calculateStatsForPeriod(rows, startDate, endDate) {
  var pRows = filterRowsByDate(rows, startDate, endDate);

  var stats = {};

  // Start and end date
  stats.startDate = startDate;
  stats.endDate = endDate;

  // Days in period
  stats.daysInPeriod = moment(endDate)
    .diff(moment(startDate), 'days');

  // Total runs
  stats.totalRuns = pRows.length;

  var runsByDate = _.groupBy(pRows, function(row) {
    return row.Date;
  });

  // Total days run
  stats.totalDaysRun = Object.keys(runsByDate).length;

  // Average days run per week
  stats.avgDaysRunPerWeek = (stats.totalDaysRun / stats.daysInPeriod) * 7;

  // Average runs per day run
  stats.avgsRunsPerDayRun = stats.totalRuns / stats.totalDaysRun;

  // Total miles
  stats.totalMiles = sumByKeyInObject(pRows, AddedHeaders.DistanceInMiles);

  // Average miles per week
  stats.avgMilesPerWeek = stats.totalMiles / stats.daysInPeriod * 7;

  // Average distance per day run
  stats.avgDistPerDayRun = stats.totalMiles / stats.totalDaysRun;

  // Total hours running
  stats.totalHours = sumByKeyInObject(pRows, AddedHeaders.DurationInMinutes) / 60;

  // Average hours per week
  stats.avgHoursPerWeek = stats.totalHours / stats.daysInPeriod * 7;

  // Average pace (minutes per mile)
  stats.avgPace = (stats.totalHours * 60) / stats.totalMiles;

  var runsWithNotes = pRows.filter(function(row) {
    return row[OriginalHeaders.Notes] && row[OriginalHeaders.Notes].length > 0;
  });

  // Total runs with notes
  stats.totalRunsWithNotes = runsWithNotes.length;

  // Total note length
  stats.totalNoteLength = _.reduce(runsWithNotes, function(previous, row) {
    return previous + row[OriginalHeaders.Notes].length;
  }, 0);

  // Average note length
  stats.avgNoteLength = stats.totalNoteLength / stats.totalRunsWithNotes;

  var runsWithNotesByDate = _.groupBy(runsWithNotes, function(row) {
    return row.Date;
  });

  // Total days with notes
  stats.totalDaysWithNotes = Object.keys(runsWithNotesByDate).length;

  // Percent of days with notes
  stats.percentOfDaysWithNotes = stats.totalDaysWithNotes / stats.daysInPeriod;

  return stats;
}



// Return filtered rows where Date is within [startDate, endDate]
function filterRowsByDate(rows, startDate, endDate) {
  return rows.filter(function(row) {
    var onOrAfterStart = row.Date.isSame(startDate, 'day') || row.Date.isAfter(startDate);
    var onOrBeforeEnd = row.Date.isSame(endDate, 'day') || row.Date.isBefore(endDate);

    return onOrAfterStart && onOrBeforeEnd;
  });
}


function transformRow(originalRow) {
  // Shallow copy original row
  var newRow = $.extend({}, originalRow);

  // Duration in minutes
  var durationText = newRow[OriginalHeaders.Duration];
  if (durationText && durationText.length > 0) {
    var momentDuration = moment.duration(durationText);
    newRow[AddedHeaders.DurationInMinutes] = momentDuration.asMinutes();
  }

  // Distance in miles
  var distText = newRow[OriginalHeaders.Distance];
  var distUnitText = newRow[OriginalHeaders.DistanceUnit];
  if (distText && distText.length > 0 && distUnitText && distUnitText.length) {
    var origDist = parseFloat(distText);

    if (distUnitText === DistanceUnits.Mile) {
      newRow[AddedHeaders.DistanceInMiles] = origDist;
    } else if (distUnitText === DistanceUnits.Kilometer) {
      var distInMiles = Qty(origDist + ' km').to('mi').scalar;
      newRow[AddedHeaders.DistanceInMiles] = distInMiles;
    }
  }

  // Date as JS moment (Replace Date column)
  var dateText = newRow[OriginalHeaders.Date];
  if (dateText && dateText.length > 0) {
    newRow[OriginalHeaders.Date] = moment(dateText, 'YYYY-MM-DD')
  }

  // Time as JS moment (Replace Time column)
  var timeText = newRow[OriginalHeaders.TimeOfDay];
  if (timeText && timeText.length > 0) {
    newRow[OriginalHeaders.TimeOfDay] = moment(timeText, 'hh:mm a')
  }

  return newRow;
}



var AddedHeaders = {
  DurationInMinutes: 'DurationInMinutes',
  DistanceInMiles: 'DistanceInMiles'
};


var LogTableColumnDefs = [{
    data: OriginalHeaders.Date,
    title: 'Date',
    render: function(data, type, row) {
      return data.format('YYYY-MM-DD');
    }
  }, {
    data: OriginalHeaders.TimeOfDay,
    title: 'Time',
    render: function(data, type, row) {
      if (data) {
        return data.format('h:mm a');
      } else {
        return '';
      }
    }
  },

  {
    data: OriginalHeaders.SubType,
    title: 'Sub Type'
  }, {
    data: AddedHeaders.DistanceInMiles,
    title: 'Distance (mi)',
    render: renderTwoDecimalPlaces
  }, {
    data: AddedHeaders.DurationInMinutes,
    title: 'Duration',
    render: function(minutes, type, row) {
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
  },
];

