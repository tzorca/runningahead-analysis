var AddedHeaders = {
  DurationInMinutes: 'DurationInMinutes',
  DistanceInMiles: 'DistanceInMiles'
};

var ColumnDefs = [{
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

$(document).ready(function() {
  $.get('log.txt', runProgram, dataType = 'text');

  $('#log-datepicker.input-daterange').datepicker({});
});

function runProgram(logData) {
  $('body').css('background-color', '#eaeaea');

  var dataset = readRunningAheadTSV(logData);
  var tDataset = transformDataset(dataset);

  // Just look at runs
  var tRunsDataset = tDataset.filter(function(row) {
    return row[OriginalHeaders.Type] === ActivityTypes.Run;
  });


  // Show log data in table
  $('#logTable').DataTable({
    data: tRunsDataset,
    columns: ColumnDefs,
    deferRender: true,
    pageLength: 10,
    dom: 'tifp'
  });


  // Calculate stats
  var mid2011Stats = calculateStatsForPeriod(tRunsDataset, '2011-03-15', '2011-09-15');

  // Show stats on page
  $('#output').text(JSON.stringify(mid2011Stats, null, 2));
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