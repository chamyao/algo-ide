from backtester_package import backtester
import pandas


# load price history into backtester
backtester.import_price_history('sp500_history')

# get relevant data
col_names = ['Date', 'Open', 'High', 'Low', 'Close', 'Adj Close', 'Volume']
data = pandas.read_csv('sp500_history/AAPL.csv', names=col_names)
dates = data.Date.tolist()[1:]
prices = data.Close.tolist()[1:]
price_history = pandas.Series(prices, index=dates)

# initialize variables
fast_average = price_history.rolling(window=5).mean()
slow_average = price_history.rolling(window=21).mean()
fast_above_prev = None

def run(info):
    def moving_cross_strategy():
        output = ''
        date = backtester.datetime

        # check date range
        if date not in slow_average.index or slow_average[date] is None:
            print("not within valid window")
            return output

        # compare fast and slow averages
        if fast_average[date] > slow_average[date]:
            fast_above = True
        else:
            fast_above = False

        # check for cross
        global fast_above_prev
        if fast_above_prev is None:
            fast_above_prev = fast_above
            return output
        if fast_above and not fast_above_prev:
            output += "TP;{'AAPL': 1.0}!"
        elif fast_above_prev and not fast_above:
            output += "TP;{'AAPL': 0.0}!"
        fast_above_prev = fast_above

        return output

    backtester.test(moving_cross_strategy, 'moving cross', '2016-01-01', '2021-01-01', info)