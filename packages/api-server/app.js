const createError = require('http-errors');
const express = require('express');
const logger = require('morgan');
const jaysonMiddleware = require('./middlewares/jayson');
const knex = require('knex');
var cors = require('cors');

const app = express();

const corsOptions = {
  origin: '*',
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  credentials: true
};

app.use(logger('dev'));
app.use(express.json());
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: false }));

app.use('/', jaysonMiddleware);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  console.error(err.stack);

  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  console.error("err.status:", err.status);
  if (res.headersSent) {
    return next(err)
  }
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
