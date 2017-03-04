/*jslint browser: true, nomen: true*/
/*global $, moment, _, Qty*/
/*global OriginalHeaders, AddedHeaders, ActivityTypes, DistanceUnits*/
/*global sumByKeyInObject*/

var StatsCalculator = {
  // Return filtered rows where Date is within [startDate, endDate]
  filterRowsByDate: function (rows, startDate, endDate) {
    return rows.filter(function (row) {
      var onOrAfterStart, onOrBeforeEnd;
      onOrAfterStart = row.Date.isSame(startDate, 'day') || row.Date.isAfter(startDate);
      onOrBeforeEnd = row.Date.isSame(endDate, 'day') || row.Date.isBefore(endDate);

      return onOrAfterStart && onOrBeforeEnd;
    });
  },

  calculateStatsForPeriod: function (rows, startDate, endDate) {
    var runsByDate, runsWithNotes, runsWithNotesByDate, pRows = StatsCalculator.filterRowsByDate(rows, startDate, endDate), stats = {};

    // Start and end date
    stats.startDate = startDate;
    stats.endDate = endDate;

    // Days in period
    stats.daysInPeriod = moment(endDate)
      .diff(moment(startDate), 'days');

    // Total runs
    stats.totalRuns = pRows.length;

    runsByDate = _.groupBy(pRows, function (row) {
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

    runsWithNotes = pRows.filter(function (row) {
      return row[OriginalHeaders.Notes] && row[OriginalHeaders.Notes].length > 0;
    });

    // Total runs with notes
    stats.totalRunsWithNotes = runsWithNotes.length;

    // Total note length
    stats.totalNoteLength = _.reduce(runsWithNotes, function (previous, row) {
      return previous + row[OriginalHeaders.Notes].length;
    }, 0);

    // Average note length
    stats.avgNoteLength = stats.totalNoteLength / stats.totalRunsWithNotes;

    runsWithNotesByDate = _.groupBy(runsWithNotes, function (row) {
      return row.Date;
    });

    // Total days with notes
    stats.totalDaysWithNotes = Object.keys(runsWithNotesByDate).length;

    // Percent of days with notes
    stats.percentOfDaysWithNotes = stats.totalDaysWithNotes / stats.daysInPeriod;

    return stats;
  },

  transformRow: function (originalRow) {
    var newRow, durationText, momentDuration, distText, distUnitText, origDist, distInMiles, dateText, timeText;

    // Shallow copy original row
    newRow = $.extend({}, originalRow);

    // Duration in minutes
    durationText = newRow[OriginalHeaders.Duration];
    if (durationText && durationText.length > 0) {
      momentDuration = moment.duration(durationText);
      newRow[AddedHeaders.DurationInMinutes] = momentDuration.asMinutes();
    }

    // Distance in miles
    distText = newRow[OriginalHeaders.Distance];
    distUnitText = newRow[OriginalHeaders.DistanceUnit];
    if (distText && distText.length > 0 && distUnitText && distUnitText.length) {
      origDist = parseFloat(distText);

      if (distUnitText === DistanceUnits.Mile) {
        newRow[AddedHeaders.DistanceInMiles] = origDist;
      } else if (distUnitText === DistanceUnits.Kilometer) {
        distInMiles = Qty(origDist + ' km').to('mi').scalar;
        newRow[AddedHeaders.DistanceInMiles] = distInMiles;
      }
    }

    // Date as JS moment (Replace Date column)
    dateText = newRow[OriginalHeaders.Date];
    if (dateText && dateText.length > 0) {
      newRow[OriginalHeaders.Date] = moment(dateText, 'YYYY-MM-DD');
    }

    // Time as JS moment (Replace Time column)
    timeText = newRow[OriginalHeaders.TimeOfDay];
    if (timeText && timeText.length > 0) {
      newRow[OriginalHeaders.TimeOfDay] = moment(timeText, 'hh:mm a');
    }

    return newRow;
  },

  transformDataset: function (dataset) {
    var newDataset = [], i;
    for (i = 0; i < dataset.length; i += 1) {
      newDataset.push(StatsCalculator.transformRow(dataset[i]));
    }

    return newDataset;
  }
};

