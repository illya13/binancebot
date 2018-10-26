const cron = require('node-cron'),
  Binance = require('binance-api-node').default,
  ta_trend_macd = require('./lib/ta_trend_macd'),
  abbreviate = require('number-abbreviate');

const VOLUME = 500;
const CHANGE = 5;

const OPTIONS = {
  'period': '3m',
  'min_periods': 150,

  'bollinger_size': 50,
  'bollinger_time': 2,
  'bollinger_upper_bound_pct': 0,
  'bollinger_lower_bound_pct': 0,
  'bollinger_width_threshold': 0.015,

  'rsi_periods': 14,
  'rsi_overbought': 60,
  'rsi_oversold': 40,

  'ema_short_period': 12,
  'ema_long_period': 26,
  'signal_period': 9,

  'cci_periods': 20,
  'cci_constant': 0.015,
  'cci_overbought': 60,
  'cci_oversold': -60,

  'stoch_k': 14,
  'stoch_d': 3,
  'stoch_overbought': 60,
  'stoch_oversold': 40,

  'adx_periods': 14,
  'adx_threshold': 25,

  'chaikin_fast': 3,
  'chaikin_slow': 10,
  'adosc_threshold': 0.9
};

function getUpperBound(ta) {
  return ta.bollinger.upper;
}

function isUpper(ta, close) {
  const upperBound = getUpperBound(ta);
  return close > (upperBound / 100) * (100 - OPTIONS.bollinger_upper_bound_pct)
}

function isRSIOverbought(ta) {
  return ta.rsi > OPTIONS.rsi_overbought
}

function isMACDPositive(ta) {
  return ta.macd_histogram > 0
}

function isCCIOverbought(ta) {
  return ta.cci > OPTIONS.cci_overbought
}

function isStochOverbought(ta) {
  return ta.stoch.D > OPTIONS.stoch_overbought
}

function isADXInTrend(ta) {
  return ta.adx > OPTIONS.adx_threshold
}

function isADOSCPositive(ta) {
  return ta.adosc > 0
}

function isUpperTrend(ta) {
  return isRSIOverbought(ta) && isCCIOverbought(ta) && isStochOverbought(ta) && isBBWWide(ta) &&
    isMACDPositive(ta) && isADOSCPositive(ta) && isADXInTrend(ta)
}


function isBBWWide(ta) {
  const bbw = (ta.bollinger.upper - ta.bollinger.lower) / ta.bollinger.middle;
  return bbw > OPTIONS.bollinger_width_threshold
}

async function watch_loop() {
  const client = Binance();
  const info = await client.exchangeInfo();

  console.log(new Date(info.serverTime));
  console.log();

  const btcMarket = info.symbols.filter(s => s.quoteAsset === 'BTC');

  btcMarket.forEach(async s => {
    // console.log(JSON.stringify(s));
    const stat = await client.dailyStats({symbol: s.symbol});
    // console.log(stat);
    if ( (Number(stat.quoteVolume) < VOLUME) || (Number(stat.priceChangePercent) < CHANGE) ) {
      return;
    }

    const candles = await client.candles({ symbol: s.symbol, interval: OPTIONS.period, limit: OPTIONS.min_periods+1});
    // console.log(candles);

    const close = candles[candles.length-1].close;
    const ta = await ta_trend_macd(
      candles, OPTIONS.min_periods,
      OPTIONS.bollinger_size, OPTIONS.bollinger_time,
      OPTIONS.rsi_periods,
      OPTIONS.ema_short_period, OPTIONS.ema_long_period, OPTIONS.signal_period,
      OPTIONS.cci_periods, OPTIONS.cci_constant,
      OPTIONS.stoch_k, OPTIONS.stoch_d,
      OPTIONS.adx_periods,
      OPTIONS.chaikin_fast, OPTIONS.chaikin_slow
    );

    const upperTrend = isUpperTrend(ta);
    console.log(s.symbol, close, '{ volume: ' + Number(stat.quoteVolume), ', change: ' + Number(stat.priceChangePercent) + ' }');
    console.log(ta);
    console.log('rsi: ' + ta.rsi.toFixed(0), ', cci: ' + ta.cci.toFixed(0), ', stoch: ' + ta.stoch.D.toFixed(0),
      ', bbw: ' + (isBBWWide(ta) ? '+' : '-'), ', macd: ' + (isMACDPositive(ta) ? '+' : '-'),
      ', adosc: ' + (isADOSCPositive(ta) ? '+' : '-'), ', adx: ' + (isADXInTrend(ta) ? '+' : '-'),
      ', obv: ' + abbreviate(ta.obv, 2));

    if (upperTrend) {
      console.log('  FIRE  ');
    }

    console.log();
  });
}

cron.schedule('* * * * *', async () => {
  await watch_loop();
});
