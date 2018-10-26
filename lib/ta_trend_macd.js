const talib = require('talib');

function bbands(marketData, bollinger_size, bollinger_time) {
  return new Promise(function(resolve, reject) {
    talib.execute({
      name: 'BBANDS',
      startIdx: marketData.close.length-bollinger_size,
      endIdx: marketData.close.length-1,
      inReal: marketData.close,
      optInTimePeriod: bollinger_size,
      optInNbDevUp: bollinger_time,
      optInNbDevDn: bollinger_time,
      optInMAType: 0,
    }, function (err, result) {
      if (err) {
        reject(err, result)
        return
      }
      resolve({
        'upper': result.result['outRealUpperBand'][(result.nbElement - 1)],
        'middle': result.result['outRealMiddleBand'][(result.nbElement - 1)],
        'lower': result.result['outRealLowerBand'][(result.nbElement - 1)]
      })
    })
  })
}

function rsi(marketData, rsi_periods) {
  return new Promise(function(resolve, reject) {
    talib.execute({
      name: 'RSI',
      startIdx: marketData.close.length-rsi_periods,
      endIdx: marketData.close.length-1,
      inReal: marketData.close,
      optInTimePeriod: rsi_periods
    }, function (err, result) {
      if (err) {
        reject(err, result)
        return
      }
      resolve(result.result['outReal'][(result.nbElement - 1)])
    })
  })
}

function adx(marketData, adx_periods) {
  return new Promise(function(resolve, reject) {
    talib.execute({
      name: 'ADX',
      startIdx: marketData.close.length-adx_periods,
      endIdx: marketData.close.length-1,
      high: marketData.high,
      low: marketData.low,
      close: marketData.close,
      optInTimePeriod: adx_periods
    }, function (err, result) {
      if (err) {
        reject(err, result)
        return
      }
      resolve(result.result['outReal'][(result.nbElement - 1)])
    })
  })
}

function cci(marketData, cci_periods) {
  return new Promise(function(resolve, reject) {
    talib.execute({
      name: 'CCI',
      startIdx: marketData.close.length-cci_periods,
      endIdx: marketData.close.length-1,
      high: marketData.high,
      low: marketData.low,
      close: marketData.close,
      optInTimePeriod: cci_periods
    }, function (err, result) {
      if (err) {
        reject(err, result)
        return
      }
      resolve(result.result['outReal'][(result.nbElement - 1)])
    })
  })
}

function stoch(marketData, stoch_k, stoch_d) {
  return new Promise(function(resolve, reject) {
    talib.execute({
      name: 'STOCHF',
      startIdx: marketData.close.length-(stoch_k+stoch_d),
      endIdx: marketData.close.length-1,
      high: marketData.high,
      low: marketData.low,
      close: marketData.close,
      optInFastK_Period: stoch_k,
      optInFastD_Period: stoch_d,
      optInFastD_MAType: 0
    }, function (err, result) {
      if (err) {
        reject(err, result)
        return
      }
      resolve({
        'K': result.result['outFastK'][(result.nbElement - 1)],
        'D': result.result['outFastD'][(result.nbElement - 1)]
      })
    })
  })
}

function macd(marketData, ema_short_period, ema_long_period, signal_period) {
  return new Promise(function(resolve, reject) {
    talib.execute({
      name: 'MACD',
      startIdx: marketData.close.length-(ema_long_period+signal_period),
      endIdx: marketData.close.length-1,
      inReal: marketData.close,
      optInFastPeriod: ema_short_period,
      optInSlowPeriod: ema_long_period,
      optInSignalPeriod: signal_period
    }, function (err, result) {
      if (err) {
        reject(err, result)
        return
      }

      resolve({
        'macd': result.result['outMACD'][(result.nbElement - 1)],
        'macd_signal': result.result['outMACDSignal'][(result.nbElement - 1)],
        'macd_histogram': result.result['outMACDHist'][(result.nbElement - 1)]
      })
    })
  })
}

function obv(marketData) {
  return new Promise(function(resolve, reject) {
    talib.execute({
      name: 'OBV',
      startIdx: 0,
      endIdx: marketData.close.length-1,
      inReal: marketData.close,
      volume: marketData.volume
    }, function (err, result) {
      if (err) {
        reject(err, result)
        return
      }

      resolve(result.result['outReal'][(result.nbElement - 1)])
    })
  })
}

function adosc(marketData, chaikin_fast, chaikin_slow) {
  return new Promise(function(resolve, reject) {
    talib.execute({
      name: 'ADOSC',
      startIdx: 0,
      endIdx: marketData.close.length-1,
      high: marketData.high,
      low: marketData.low,
      close: marketData.close,
      volume: marketData.volume,
      optInFastPeriod: chaikin_fast,
      optInSlowPeriod: chaikin_slow
    }, function (err, result) {
      if (err) {
        reject(err, result)
        return
      }

      resolve(result.result['outReal'][(result.nbElement - 1)])
    })
  })
}


module.exports = function ta_trend_macd(candles, min_periods,
                                        bollinger_size, bollinger_time,
                                        rsi_periods,
                                        ema_short_period, ema_long_period, signal_period,
                                        cci_periods, cci_constant,
                                        stoch_k, stoch_d,
                                        adx_periods,
                                        chaikin_fast, chaikin_slow) {
  if (candles.length < min_periods) {
    return Promise.resolve(false)
  }

  let marketData = {open: [], close: [], high: [], low: [], volume: []};
  for (let i = 0; i < candles.length; i++) {
    marketData.high.push(candles[i].high);
    marketData.low.push(candles[i].low);
    marketData.close.push(candles[i].close);
    marketData.volume.push(candles[i].volume);
  }

  let s = {};
  return Promise.all([
    bbands(marketData, bollinger_size, bollinger_time).then((bollinger) => s['bollinger'] = bollinger),
    rsi(marketData, rsi_periods).then((rsi) => s['rsi'] = rsi),
    cci(marketData, cci_periods).then((cci) => s['cci'] = cci),
    stoch(marketData, stoch_k, stoch_d).then((stoch) => s['stoch'] = stoch),
    macd(marketData, ema_short_period, ema_long_period, signal_period).then((macd) => Object.assign(s, macd)),
    adx(marketData, adx_periods).then((adx) => s['adx'] = adx),
    obv(marketData).then((obv) => s['obv'] = obv),
    adosc(marketData, chaikin_fast, chaikin_slow).then((adosc) => s['adosc'] = adosc)
  ])
    .then(() => s)
}
