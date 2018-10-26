const cron = require('node-cron');
const Binance = require('binance-api-node').default;
const ta_trend_macd = require('./lib/ta_trend_macd');

const VOLUME = 500;
const CHANGE = 5;

const OPTIONS = {
  'period': '3m',
  'min_periods': 150,

  'bollinger_size': 50,
  'bollinger_time': 2,
  'bollinger_upper_bound_pct': 0,
  'bollinger_lower_bound_pct': 0,
  'bollinger_width_threshold': 0.10,

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

function getUpperBound(s) {
  return s.bollinger.upper;
}

function isUpper(s, close) {
  const upperBound = getUpperBound(s);
  return close > (upperBound / 100) * (100 - OPTIONS.bollinger_upper_bound_pct)
}

function isRSIOverbought(s) {
  return s.rsi > OPTIONS.rsi_overbought
}

function isMACDPositive(s) {
  return s.macd_histogram > 0
}

function isCCIOverbought(s) {
  return s.cci > OPTIONS.cci_overbought
}

function isStochOverbought(s) {
  return s.stoch.D > OPTIONS.stoch_overbought
}

function isADXInTrend(s) {
  return s.adx > OPTIONS.adx_threshold
}

function isADOSCPositive(s) {
  return s.adosc > 0
}

function isUpperHit(s, close, upperBound) {
  return isUpper(s, close, upperBound) && isADOSCPositive(s) && isUpperTrend(s)
}

function isUpperTrend(s) {
  return isRSIOverbought(s) && isCCIOverbought(s) && isStochOverbought(s) &&
    isMACDPositive(s) && isBBWWide(s) && isADXInTrend(s)
}


function isBBWWide(s) {
  return s.bollinger.bbw > OPTIONS.bollinger_width_threshold
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

    const upperHit = isUpperHit(ta, close);
    console.log(s.symbol, close, '{ volume: ' + Number(stat.quoteVolume), ', change: ' + Number(stat.priceChangePercent) + ' }');
    console.log(ta);
    if (upperHit) {
      console.log(' FIRE ');
    }
    console.log();
  });
}

cron.schedule('* * * * *', async () => {
  await watch_loop();
});
