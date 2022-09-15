import math
import os

import pandas

from backtester_package.portfolio import Portfolio
import backtester_package.utilities as utilities

import datetime as dt

price_history = {}
datetime = None
cwd = os.getcwd()
portfolio = None


def import_price_history(directory):
    for filename in os.listdir(directory):
        f = os.path.join(directory, filename)
        data = pandas.read_csv(f, delimiter=',')
        dates = data.Date.tolist()[1:]
        prices = data.Close.tolist()[1:]
        tail = os.path.split(filename)[1]
        symbol = tail.split(sep='.')[0]
        global price_history
        price_history[symbol] = dict(zip(dates, prices))


def get_dates(start, end):
    start, end = dt.datetime.strptime(start, '%Y-%m-%d'), dt.datetime.strptime(end, '%Y-%m-%d')

    def in_range(date_string):
        date = dt.datetime.strptime(date_string, '%Y-%m-%d')
        return start <= date <= end

    all_dates = price_history[list(price_history)[0]].keys()
    dates = [date for date in all_dates if in_range(date)]
    return dates


def test(strategy, name, start, end, risk_free_rate=0):
    assert price_history is not None, "import price history."
    global portfolio
    portfolio = Portfolio()
    initial = portfolio.value()
    prev = portfolio.value()
    logs = os.path.join(cwd, 'logs')
    if not os.path.exists(logs):
        os.mkdir(logs)
    path = os.path.join(logs, name)
    log = open(path, 'w')
    returns = []
    values = []
    for date in get_dates(start, end):
        global datetime
        datetime = date
        string = strategy()
        utilities.apply_string(string)
        daily_return = portfolio.value()/prev - 1
        prev = portfolio.value()
        values.append(prev)
        returns.append(daily_return)
        if len(string) > 0:
            log.write('Datetime: ' + datetime + ' Action: ' + string + '\n')
    total_return = portfolio.value() / initial - 1
    return total_return, math.sqrt(252) * utilities.sharpe(returns, risk_free_rate), returns, values
