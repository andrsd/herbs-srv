var express = require('express');
var router = express.Router();
var fs = require('fs');
var columns = [ 'sage', 'thyme', 'chives', 'parsley', 'rosemary', 'basil', 'temperature', 'humidity' ];
var n_herbs = 6;
// number of rows to keep in the DB
var n_db_rows = 12;

var db_file_name = "./data/db";

function twoDigits(number) {
  if (number >= 10)
    return number;
  else
    return "0" + number;
}

router.get('/', function(req, res, next) {
  var rows = fs.readFileSync(db_file_name).toString().split("\n");
  var hdr = rows[0].split("\t");

  var data = { }

  data['current_moisture'] = [ ];
  data['current_moisture'][0] = [ 'Label', 'Value' ];

  data['history'] = [ ];
  data['history'][0] = [ "time" ];
  for (j = 0; j < n_herbs; j++)
    data['history'][0].push(hdr[j + 1]);

  data['temp'] = [ ];

  for (i = 1; i < rows.length - 1; i++) {
    var value = rows[i].split("\t");

    var date = new Date(value[0]);
    value[0] = twoDigits(date.getHours()) + ":" + twoDigits(date.getMinutes());
    for (j = 1; j <= n_herbs; j++)
      value[j] = value[j] * 100;
    data['history'][i] = value.slice(0, n_herbs + 1);

    data['temp'][i - 1] = value.slice(n_herbs + 1, n_herbs + 3);
    data['temp'][i - 1][0] = value[0];
    data['temp'][i - 1][1] = parseFloat(value[n_herbs + 1]);
    data['temp'][i - 1][2] = parseFloat(value[n_herbs + 2]);

    if (i == rows.length - 2) {
      for (j = 1; j <= n_herbs; j++)
        data['current_moisture'][j] = [ hdr[j], value[j] ];
      data['current_temperature'] = value[n_herbs + 1];
      data['current_humidity'] = value[n_herbs + 2];
    }
  }

  res.render('herbs', data);
});

function db_maintenance(file_name, n_rows) {
  var content = fs.readFileSync(file_name).toString().split("\n");
  if (content.length > n_rows + 1) {
    // more data rows then we want to store
    var hdr = content[0];
    var data = content.slice(content.length - n_rows - 1, content.length - 1);

    var db = fs.openSync(file_name, "w");
    fs.appendFileSync(db, hdr + "\n");
    for (i = 0; i < data.length; i++) {
      fs.appendFileSync(db, data[i] + "\n");
    }
    fs.closeSync(db);
  }
}

// POST the data
router.post('/', function(req, res, next) {
  var time = new Date().toISOString();

  var row = time;
  for (i = 0; i < columns.length; i++) {
    if (columns[i] in req.body) {
      var digits;
      if (i >= 0 && i < n_herbs)
        digits = 2;
      else
        digits = 1;
      row = row + "\t" + req.body[columns[i]].toFixed(digits);
    }
    else
      row = row + "\t0.00";
  }
  row = row + "\n";
  fs.appendFileSync(db_file_name, row);

  res.status(200);
  res.end();

  db_maintenance(db_file_name, n_db_rows);
});

// GET the data from the table
router.get('/:name', function(req, res, next) {
  var name = req.params.name;
  var file_content = fs.readFileSync(db_file_name).toString();
  var rows = file_content.split("\n");

  var hdr = rows[0].split("\t");
  var line = rows[rows.length - 2].split("\t");
  for (i = 1; i < hdr.length; i++) {
    if (hdr[i] == name) {
      res.status(200);
      res.json({ "value" : parseFloat(line[i]) });
      return;
    }
  }

  res.status(406);
  res.end();
});

module.exports = router;
