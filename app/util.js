function renderTwoDecimalPlaces(data, type, row) {
  if (data) {
    return parseFloat(data).toFixed(2);
  } else {
    return "";
  }
}

function renderMinutesDuration(minutes, type, row) {
  if (minutes) {
    var ms = minutes * 60 * 1000;
    return moment.utc(ms).format('HH:mm:ss');
  } else {
    return '';
  }
}

function roundFloat(val, decimalPlaces) {
  return parseFloat(val.toFixed(decimalPlaces));
}

function sumByKeyInObject(array, key) {
  return _.reduce(array,
    function(previous, obj) {
      var val = obj[key];
      if (val) {
        return previous + val;
      } else {
        return previous;
      };
    }, 0);
}