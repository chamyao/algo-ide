import pandas
import pandas as pd

import backtester_package.backtester as backtester
from backtester_package import utilities

col_names = ['Date', 'Open', 'High', 'Low', 'Close', 'Adj Close', 'Volume']
data = pandas.read_csv('AAPL.csv', names=col_names)
dates = data.Date.tolist()[1:]
prices = data.Close.tolist()[1:]
price_history = pd.Series(prices, index=dates)
fast_average = price_history.rolling(window=5).mean()
slow_average = price_history.rolling(window=21).mean()
fast_above_prev = None


def moving_cross_strategy():
    output = ''
    date = backtester.datetime
    if date not in slow_average.index or slow_average[date] is None:
        print("not within valid window")
        return output
    if fast_average[date] > slow_average[date]:
        fast_above = True
    else:
        fast_above = False
    global fast_above_prev
    if fast_above_prev is None:
        fast_above_prev = fast_above
        return output
    global num_shares
    if fast_above and not fast_above_prev:
        output += "TP;{'AAPL': 1.0}!"
    elif fast_above_prev and not fast_above:
        output += "TP;{'AAPL': 0.0}!"
    fast_above_prev = fast_above
    return output
